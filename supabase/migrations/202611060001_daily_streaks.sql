begin;

alter table public.profiles add column daily_reminders_enabled boolean not null default false;
grant update(daily_reminders_enabled) on public.profiles to authenticated;

-- Streaks are derived only from trusted completion RPCs. Existing UTC counters remain
-- available for the home practice meter, but are no longer used as streak authority.
alter table public.learning_stats
  add column last_qualifying_date date,
  add column streak_freezes_available integer not null default 1 check (streak_freezes_available between 0 and 2),
  add column timezone text not null default 'UTC',
  add column total_xp integer not null default 0 check (total_xp >= 0),
  add column streak_updated_at timestamptz not null default now(),
  add column legacy_current_streak integer check (legacy_current_streak is null or legacy_current_streak >= 0);

create table public.daily_learning_activity (
  user_id uuid not null references auth.users on delete cascade,
  learning_date date not null,
  qualifying_activity_count integer not null default 0 check (qualifying_activity_count >= 0),
  total_xp integer not null default 0 check (total_xp >= 0),
  total_practice_seconds integer not null default 0 check (total_practice_seconds >= 0),
  day_status text not null default 'practice' check (day_status in ('practice','protected','missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, learning_date)
);

create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  activity_type text not null check (activity_type in ('lesson','guided_mission','conversation','vocabulary_review')),
  source_activity_id uuid not null,
  learning_date date not null,
  occurred_at timestamptz not null default now(),
  xp_awarded integer not null default 15 check (xp_awarded >= 0),
  qualifies_for_streak boolean not null default true,
  unique(user_id, activity_type, source_activity_id)
);
create index learning_events_owner_date on public.learning_events(user_id, learning_date desc);

create table public.streak_freeze_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  transaction_type text not null check (transaction_type in ('grant','consume')),
  learning_date date not null,
  amount integer not null check (amount in (-1,1)),
  reason text not null,
  created_at timestamptz not null default now(),
  unique(user_id, transaction_type, reason, learning_date),
  check ((transaction_type='grant' and amount=1) or (transaction_type='consume' and amount=-1))
);

create table public.streak_milestones (
  user_id uuid not null references auth.users on delete cascade,
  milestone_days integer not null check (milestone_days in (3,7,14,30,100,365)),
  achieved_at timestamptz not null default now(),
  reward_xp integer not null check (reward_xp > 0),
  primary key(user_id, milestone_days)
);

alter table public.daily_learning_activity enable row level security;
alter table public.learning_events enable row level security;
alter table public.streak_freeze_transactions enable row level security;
alter table public.streak_milestones enable row level security;
create policy own_daily_read on public.daily_learning_activity for select to authenticated using (user_id=(select auth.uid()));
create policy own_events_read on public.learning_events for select to authenticated using (user_id=(select auth.uid()));
create policy own_freeze_read on public.streak_freeze_transactions for select to authenticated using (user_id=(select auth.uid()));
create policy own_milestones_read on public.streak_milestones for select to authenticated using (user_id=(select auth.uid()));
revoke all on public.daily_learning_activity, public.learning_events,
  public.streak_freeze_transactions, public.streak_milestones from anon, authenticated;
grant select on public.daily_learning_activity, public.learning_events,
  public.streak_freeze_transactions, public.streak_milestones to authenticated;
grant all on public.daily_learning_activity, public.learning_events,
  public.streak_freeze_transactions, public.streak_milestones to service_role;

-- Preserve lifetime bests and the old counter for rollback, but clear the active per-reply
-- UTC streak because it cannot be safely converted into verified learning days.
update public.learning_stats set legacy_current_streak=current_streak,current_streak=0,
  last_qualifying_date=null,timezone='UTC',streak_freezes_available=1;
insert into public.streak_freeze_transactions(user_id,transaction_type,learning_date,amount,reason)
select user_id,'grant',current_date,1,'launch_grant' from public.learning_stats
on conflict (user_id,transaction_type,reason,learning_date) do nothing;

create function public.initialize_user_streak() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.learning_stats(user_id,streak_freezes_available) values(new.id,1) on conflict(user_id) do update set streak_freezes_available=1;
  insert into public.streak_freeze_transactions(user_id,transaction_type,learning_date,amount,reason)
    values(new.id,'grant',(now() at time zone 'UTC')::date,1,'welcome_grant') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_streak_created after insert on auth.users
for each row execute function public.initialize_user_streak();
revoke all on function public.initialize_user_streak() from public,anon,authenticated;

create function public.learning_date(p_at timestamptz,p_timezone text) returns date
language plpgsql stable security invoker set search_path='' as $$
begin
  if p_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'Invalid timezone';
  end if;
  return (p_at at time zone p_timezone)::date;
end $$;
revoke all on function public.learning_date(timestamptz,text) from public,anon,authenticated;
grant execute on function public.learning_date(timestamptz,text) to service_role;

create function public.set_streak_timezone(p_timezone text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_timezone is null or length(p_timezone)>64
     or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
    raise exception 'Invalid timezone';
  end if;
  update public.learning_stats set timezone=p_timezone,streak_updated_at=now() where user_id=auth.uid();
end $$;

-- Caller is restricted to trusted server code. The row lock serializes concurrent completions.
create function public.record_learning_activity(
  p_user_id uuid, p_activity_type text, p_source_activity_id uuid,
  p_practice_seconds integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.learning_stats; v_date date; v_gap integer; v_day date; v_xp integer:=15;
  v_inserted integer; v_milestones integer[]:='{}'; v_reward integer:=0; v_first_today boolean;
  v_i integer:=0; v_available integer; v_freeze_id uuid;
begin
  if p_activity_type not in ('lesson','guided_mission','conversation','vocabulary_review')
     or p_source_activity_id is null or p_practice_seconds<0 or p_practice_seconds>3600 then
    raise exception 'Invalid learning event';
  end if;
  select * into s from public.learning_stats where user_id=p_user_id for update;
  if not found then raise exception 'Streak record unavailable'; end if;
  v_date:=public.learning_date(now(),s.timezone);
  insert into public.learning_events(user_id,activity_type,source_activity_id,learning_date,occurred_at,xp_awarded)
    values(p_user_id,p_activity_type,p_source_activity_id,v_date,now(),v_xp)
    on conflict(user_id,activity_type,source_activity_id) do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    return jsonb_build_object('recorded',false,'learning_date',v_date,'current_streak',s.current_streak,'longest_streak',s.longest_streak,'xp_awarded',0,'milestones','[]'::jsonb);
  end if;
  v_first_today:=not exists(select 1 from public.daily_learning_activity where user_id=p_user_id
    and learning_date=v_date and qualifying_activity_count>0);

  if s.last_qualifying_date is null then
    s.current_streak:=1;
  elsif v_date>s.last_qualifying_date then
    v_gap:=v_date-s.last_qualifying_date-1;
    v_available:=s.streak_freezes_available;
    for v_day in select generate_series(s.last_qualifying_date+1,v_date-1,interval '1 day')::date loop
      if v_i<v_available then
        insert into public.streak_freeze_transactions(user_id,transaction_type,learning_date,amount,reason)
          values(p_user_id,'consume',v_day,-1,'automatic_missed_day') on conflict do nothing;
        insert into public.daily_learning_activity(user_id,learning_date,day_status)
          values(p_user_id,v_day,'protected') on conflict(user_id,learning_date) do update set day_status='protected',updated_at=now()
          where public.daily_learning_activity.qualifying_activity_count=0;
      else
        insert into public.daily_learning_activity(user_id,learning_date,day_status)
          values(p_user_id,v_day,'missed') on conflict do nothing;
      end if;
      v_i:=v_i+1;
    end loop;
    s.streak_freezes_available:=s.streak_freezes_available-least(v_gap,v_available);
    if v_gap>v_available then s.current_streak:=1;
    else s.current_streak:=s.current_streak+1; end if;
  elsif v_date<s.last_qualifying_date then
    -- A timezone change can make today's local date earlier than a previously stored date.
    -- Preserve history and accept the event without rewinding the streak anchor.
    s.current_streak:=greatest(s.current_streak,1);
  end if;
  s.last_qualifying_date:=greatest(coalesce(s.last_qualifying_date,v_date),v_date);
  s.longest_streak:=greatest(s.longest_streak,s.current_streak);
  update public.learning_stats set current_streak=s.current_streak,longest_streak=s.longest_streak,
    last_qualifying_date=s.last_qualifying_date,streak_freezes_available=s.streak_freezes_available,
    total_xp=total_xp+v_xp,streak_updated_at=now() where user_id=p_user_id;
  insert into public.daily_learning_activity(user_id,learning_date,qualifying_activity_count,total_xp,total_practice_seconds,day_status)
    values(p_user_id,v_date,1,v_xp,p_practice_seconds,'practice')
    on conflict(user_id,learning_date) do update set qualifying_activity_count=public.daily_learning_activity.qualifying_activity_count+1,
      total_xp=public.daily_learning_activity.total_xp+v_xp,
      total_practice_seconds=public.daily_learning_activity.total_practice_seconds+p_practice_seconds,
      day_status='practice',updated_at=now();
  with new_milestones as (
    insert into public.streak_milestones(user_id,milestone_days,reward_xp)
      select p_user_id,m,m*10 from unnest(array[3,7,14,30,100,365]) m
      where m<=s.current_streak on conflict do nothing
      returning milestone_days,reward_xp
  ) select coalesce(array_agg(milestone_days), '{}'),coalesce(sum(reward_xp),0)
      into v_milestones,v_reward from new_milestones;
  if (7=any(v_milestones) or 30=any(v_milestones)) and s.streak_freezes_available<2 then
    insert into public.streak_freeze_transactions(user_id,transaction_type,learning_date,amount,reason)
      values(p_user_id,'grant',v_date,1,'milestone_'||s.current_streak)
      on conflict(user_id,transaction_type,reason,learning_date) do nothing returning id into v_freeze_id;
    if v_freeze_id is not null then
      s.streak_freezes_available:=s.streak_freezes_available+1;
      update public.learning_stats set streak_freezes_available=s.streak_freezes_available where user_id=p_user_id;
    end if;
  end if;
  if v_reward>0 then
    update public.learning_stats set total_xp=total_xp+v_reward where user_id=p_user_id;
    update public.daily_learning_activity set total_xp=total_xp+v_reward,updated_at=now()
      where user_id=p_user_id and learning_date=v_date;
  end if;
  return jsonb_build_object('recorded',true,'learning_date',v_date,'current_streak',s.current_streak,
    'longest_streak',s.longest_streak,'streak_freezes_available',s.streak_freezes_available,
    'xp_awarded',v_xp+v_reward,'first_activity_today',v_first_today,'milestones',to_jsonb(v_milestones));
end $$;

-- Catch up freeze use when a returning user opens the app. The current local day stays open.
create function public.get_streak_summary() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.learning_stats; v_today date; v_missed integer; v_day date; v_i integer:=0; v_available integer;
begin
  select * into s from public.learning_stats where user_id=auth.uid() for update;
  if not found then raise exception 'Streak record unavailable'; end if;
  v_today:=public.learning_date(now(),s.timezone);
  if s.last_qualifying_date is not null and s.last_qualifying_date<v_today-1 then
    v_missed:=v_today-s.last_qualifying_date-1;
    v_available:=s.streak_freezes_available;
    for v_day in select generate_series(s.last_qualifying_date+1,v_today-1,interval '1 day')::date loop
      if v_i<v_available then
        insert into public.streak_freeze_transactions(user_id,transaction_type,learning_date,amount,reason)
          values(s.user_id,'consume',v_day,-1,'automatic_missed_day') on conflict do nothing;
        insert into public.daily_learning_activity(user_id,learning_date,day_status) values(s.user_id,v_day,'protected')
          on conflict(user_id,learning_date) do update set day_status='protected',updated_at=now()
          where public.daily_learning_activity.qualifying_activity_count=0;
      else
        insert into public.daily_learning_activity(user_id,learning_date,day_status) values(s.user_id,v_day,'missed') on conflict do nothing;
      end if;
      v_i:=v_i+1;
    end loop;
    if v_missed>v_available then s.current_streak:=0; end if;
    s.streak_freezes_available:=s.streak_freezes_available-least(v_missed,v_available);
    update public.learning_stats set current_streak=s.current_streak,streak_freezes_available=s.streak_freezes_available,streak_updated_at=now()
      where user_id=s.user_id;
  end if;
  return jsonb_build_object('user_id',s.user_id,'current_streak',s.current_streak,'longest_streak',s.longest_streak,
    'last_qualifying_date',s.last_qualifying_date,'streak_freezes_available',s.streak_freezes_available,
    'timezone',s.timezone,'total_xp',s.total_xp,'today',v_today,
    'week',coalesce((select jsonb_agg(jsonb_build_object('date',d.learning_date,'status',d.day_status,
      'activity_count',d.qualifying_activity_count,'xp',d.total_xp) order by d.learning_date)
      from public.daily_learning_activity d where d.user_id=s.user_id and d.learning_date between v_today-6 and v_today),'[]'::jsonb),
    'total_practice_days',(select count(*) from public.daily_learning_activity d where d.user_id=s.user_id and d.qualifying_activity_count>0),
    'next_milestone',(select min(m) from unnest(array[3,7,14,30,100,365]) m where not exists(
      select 1 from public.streak_milestones sm where sm.user_id=s.user_id and sm.milestone_days=m)));
end $$;

-- Keep the existing reply counters, but stop treating each reply as a streak day.
create or replace function public.commit_turn(p_request_id uuid,p_user_id uuid,p_reply jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.turn_requests; c public.conversations; learner public.messages; tutor public.messages;
  item jsonb; v_result jsonb; today date:=(now() at time zone 'UTC')::date;
begin
  select * into r from public.turn_requests where id=p_request_id and user_id=p_user_id for update;
  if not found then raise exception 'Turn unavailable'; end if;
  if r.status='completed' then return r.result; end if;
  if r.status<>'processing' then raise exception 'Turn not processing'; end if;
  select * into c from public.conversations where id=r.conversation_id and user_id=p_user_id and status='active' for update;
  if not found then raise exception 'Conversation unavailable'; end if;
  if r.input_text<>'' then
    insert into public.messages(conversation_id,user_id,role,content,turn_request_id)
      values(c.id,p_user_id,'user',r.input_text,r.id) returning * into learner;
  end if;
  insert into public.messages(conversation_id,user_id,role,content,translation,turn_request_id)
    values(c.id,p_user_id,'assistant',p_reply->>'korean',p_reply->>'english',r.id) returning * into tutor;
  if learner.id is not null then
    for item in select * from jsonb_array_elements(coalesce(p_reply->'corrections','[]'::jsonb)) loop
      if position(item->>'original' in r.input_text)>0 then
        insert into public.corrections(conversation_id,message_id,user_id,original,corrected,explanation,category)
          values(c.id,learner.id,p_user_id,item->>'original',item->>'corrected',item->>'explanation',item->>'category');
      end if;
    end loop;
    update public.learning_stats set total_turns=total_turns+1,
      daily_turns=case when last_practice_date=today then daily_turns+1 else 1 end,
      last_practice_date=today where user_id=p_user_id;
  end if;
  if c.lesson_id is not null then
    insert into public.lesson_progress(user_id,lesson_id) values(p_user_id,c.lesson_id) on conflict do nothing;
  end if;
  v_result:=jsonb_build_object('message',to_jsonb(tutor),
    'learnerMessage',case when learner.id is null then null else to_jsonb(learner) end,
    'corrections',coalesce((select jsonb_agg(to_jsonb(x)) from public.corrections x where x.message_id=learner.id),'[]'::jsonb),
    'encouragement',coalesce(p_reply->>'encouragement',''));
  update public.turn_requests set status='completed',result=v_result,updated_at=now() where id=r.id;
  return v_result;
end $$;

revoke all on function public.set_streak_timezone(text),public.get_streak_summary() from public,anon;
grant execute on function public.set_streak_timezone(text),public.get_streak_summary() to authenticated;
revoke all on function public.record_learning_activity(uuid,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.record_learning_activity(uuid,text,uuid,integer) to service_role;

-- Replace the legacy completion gate: only completed conversations with three meaningful
-- stored learner replies can generate the idempotent qualifying event.
drop function public.complete_conversation(uuid);
create function public.complete_conversation(p_conversation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.conversations; v_count integer; v_result jsonb;
begin
  select * into c from public.conversations where id=p_conversation_id and user_id=auth.uid() for update;
  if not found then raise exception 'Conversation unavailable'; end if;
  if c.status='completed' then return jsonb_build_object('recorded',false); end if;
  if exists(select 1 from public.turn_requests where conversation_id=c.id and status='processing' and updated_at>now()-interval '2 minutes') then raise exception 'A response is still being prepared'; end if;
  select count(*) into v_count from public.messages where conversation_id=c.id and user_id=c.user_id and role='user'
    and length(regexp_replace(trim(content),'[[:space:][:punct:]]','','g'))>=2;
  if v_count<3 then raise exception 'Practice at least three meaningful replies before finishing'; end if;
  update public.conversations set status='completed',completed_at=now() where id=c.id;
  update public.learning_stats set completed_sessions=completed_sessions+1,
    practice_seconds=practice_seconds+least(900,greatest(0,extract(epoch from now()-c.created_at)::integer)) where user_id=c.user_id;
  if c.lesson_id is not null then
    insert into public.lesson_progress(user_id,lesson_id,status,completed_count) values(c.user_id,c.lesson_id,'completed',1)
      on conflict(user_id,lesson_id) do update set status='completed',completed_count=public.lesson_progress.completed_count+1,updated_at=now();
  end if;
  v_result:=public.record_learning_activity(c.user_id,case when c.lesson_id is null then 'conversation' else 'guided_mission' end,
    c.id,least(900,greatest(0,extract(epoch from now()-c.created_at)::integer)));
  return v_result;
end $$;
revoke all on function public.complete_conversation(uuid) from public,anon;
grant execute on function public.complete_conversation(uuid) to authenticated;

commit;
