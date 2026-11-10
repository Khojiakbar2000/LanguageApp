begin;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default 'Learner' check (length(display_name) between 1 and 60),
  level text not null default 'Beginner' check (level in ('Beginner','Intermediate','Advanced')),
  goal text not null default 'Daily Conversation' check (goal in ('Daily Conversation','Study in Korea','Work in Korea','TOPIK')),
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key, title text not null, korean_title text not null, category text not null,
  level text not null check (level in ('Beginner','Intermediate','Advanced')),
  duration_minutes integer not null check (duration_minutes between 1 and 30),
  objectives jsonb not null check (jsonb_typeof(objectives)='array'),
  expressions jsonb not null check (jsonb_typeof(expressions)='array'), scenario text not null,
  sort_order integer not null unique
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  lesson_id uuid references public.lessons, title text not null check (length(title)<=160),
  level text not null check (level in ('Beginner','Intermediate','Advanced')),
  status text not null default 'active' check (status in ('active','completed')),
  created_at timestamptz not null default now(), completed_at timestamptz
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null check(length(content) between 1 and 1600),
  translation text, turn_request_id uuid not null, audio_path text,
  sequence bigint generated always as identity,
  created_at timestamptz not null default now(), unique(conversation_id,turn_request_id,role)
);
create table public.corrections (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
  message_id uuid not null references public.messages on delete cascade, user_id uuid not null references auth.users on delete cascade,
  original text not null, corrected text not null, explanation text not null,
  category text not null check(category in ('grammar','vocabulary','register')), created_at timestamptz not null default now()
);
create table public.lesson_progress (
  user_id uuid not null references auth.users on delete cascade, lesson_id uuid not null references public.lessons,
  status text not null default 'in_progress' check(status in ('in_progress','completed')),
  completed_count integer not null default 0, updated_at timestamptz not null default now(), primary key(user_id,lesson_id)
);
create table public.saved_expressions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  korean text not null check(length(korean) between 1 and 1200), english text not null default '' check(length(english)<=1600),
  note text not null default '' check(length(note)<=1000), learned boolean not null default false,
  created_at timestamptz not null default now(), unique(user_id,korean)
);
create table public.learning_stats (
  user_id uuid primary key references auth.users on delete cascade,
  current_streak integer not null default 0, longest_streak integer not null default 0,
  total_turns integer not null default 0, daily_turns integer not null default 0,
  completed_sessions integer not null default 0, practice_seconds integer not null default 0, last_practice_date date
);
create table public.daily_usage (
  user_id uuid not null references auth.users on delete cascade, day date not null default (now() at time zone 'UTC')::date,
  chat integer not null default 0, transcribe integer not null default 0, speech integer not null default 0, starts integer not null default 0,
  primary key(user_id,day)
);
create table public.turn_requests (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  conversation_id uuid not null references public.conversations on delete cascade,
  input_text text not null, status text not null default 'processing' check(status in ('processing','completed','failed')),
  result jsonb, updated_at timestamptz not null default now()
);
create unique index one_processing_turn on public.turn_requests(conversation_id) where status='processing';
create index conversation_owner on public.conversations(user_id,created_at desc);
create index message_history on public.messages(conversation_id,sequence);
create index correction_memory on public.corrections(user_id,created_at desc);
create index saved_review on public.saved_expressions(user_id,learned,created_at desc);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name,level,goal) values (
    new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),60),''),'Learner'),
    case when new.raw_user_meta_data->>'level' in ('Beginner','Intermediate','Advanced') then new.raw_user_meta_data->>'level' else 'Beginner' end,
    case when new.raw_user_meta_data->>'goal' in ('Daily Conversation','Study in Korea','Work in Korea','TOPIK') then new.raw_user_meta_data->>'goal' else 'Daily Conversation' end
  );
  insert into public.learning_stats(user_id) values(new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.corrections enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.saved_expressions enable row level security;
alter table public.learning_stats enable row level security;
alter table public.daily_usage enable row level security;
alter table public.turn_requests enable row level security;

create policy own_profile_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy public_lessons on public.lessons for select to anon,authenticated using(true);
create policy own_conversations on public.conversations for select to authenticated using(user_id=(select auth.uid()));
create policy own_messages on public.messages for select to authenticated using(user_id=(select auth.uid()));
create policy own_corrections on public.corrections for select to authenticated using(user_id=(select auth.uid()));
create policy own_progress on public.lesson_progress for select to authenticated using(user_id=(select auth.uid()));
create policy own_stats on public.learning_stats for select to authenticated using(user_id=(select auth.uid()));
create policy own_saved on public.saved_expressions for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

revoke all on public.profiles,public.lessons,public.conversations,public.messages,public.corrections,public.lesson_progress,public.saved_expressions,public.learning_stats,public.daily_usage,public.turn_requests from anon,authenticated;
grant select on public.lessons to anon,authenticated;
grant select on public.profiles,public.conversations,public.messages,public.corrections,public.lesson_progress,public.learning_stats to authenticated;
grant update(display_name,level,goal) on public.profiles to authenticated;
grant select,insert,update,delete on public.saved_expressions to authenticated;
grant all on public.profiles,public.lessons,public.conversations,public.messages,public.corrections,public.lesson_progress,public.saved_expressions,public.learning_stats,public.daily_usage,public.turn_requests to service_role;
grant usage,select on all sequences in schema public to service_role;

-- Calls reserve quota before invoking providers. Failed calls consume attempts, preventing unlimited costly retries.
create function public.reserve_usage(p_user_id uuid,p_kind text,p_amount integer default 1) returns boolean language plpgsql security definer set search_path='' as $$
declare u public.daily_usage; cap integer;
begin
  if p_amount<1 or p_amount>100 or p_kind not in ('chat','transcribe','speech','start') then raise exception 'Invalid usage request'; end if;
  insert into public.daily_usage(user_id) values(p_user_id) on conflict do nothing;
  select * into u from public.daily_usage where user_id=p_user_id and day=(now() at time zone 'UTC')::date for update;
  cap:=case p_kind when 'chat' then 60 when 'transcribe' then 50 when 'start' then 20 else 80 end;
  if (case p_kind when 'chat' then u.chat when 'transcribe' then u.transcribe when 'start' then u.starts else u.speech end)+p_amount>cap then return false; end if;
  update public.daily_usage set chat=chat+case when p_kind='chat' then p_amount else 0 end,
    transcribe=transcribe+case when p_kind='transcribe' then p_amount else 0 end,
    speech=speech+case when p_kind='speech' then p_amount else 0 end,
    starts=starts+case when p_kind='start' then p_amount else 0 end
    where user_id=p_user_id and day=(now() at time zone 'UTC')::date;
  return true;
end $$;

-- Serialize turns per conversation and preserve an idempotent result for retries.
create function public.claim_turn(p_request_id uuid,p_conversation_id uuid,p_user_id uuid,p_text text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.conversations; r public.turn_requests;
begin
  select * into c from public.conversations where id=p_conversation_id and user_id=p_user_id for update;
  if not found then raise exception 'Conversation unavailable'; end if;
  select * into r from public.turn_requests where id=p_request_id;
  if found then
    if r.user_id<>p_user_id or r.conversation_id<>p_conversation_id or r.input_text<>p_text then raise exception 'Request identity mismatch'; end if;
    if r.status='completed' then return jsonb_build_object('state','completed','result',r.result); end if;
    if r.status='processing' and r.updated_at>now()-interval '2 minutes' then return jsonb_build_object('state','busy'); end if;
  end if;
  if c.status<>'active' then raise exception 'Conversation already completed'; end if;
  update public.turn_requests set status='failed',updated_at=now() where conversation_id=c.id and status='processing' and updated_at<now()-interval '2 minutes';
  if exists(select 1 from public.turn_requests where conversation_id=c.id and status='processing') then return jsonb_build_object('state','busy'); end if;
  insert into public.turn_requests(id,user_id,conversation_id,input_text) values(p_request_id,p_user_id,c.id,p_text)
    on conflict(id) do update set status='processing',updated_at=now();
  return jsonb_build_object('state','claimed');
end $$;

create function public.commit_turn(p_request_id uuid,p_user_id uuid,p_reply jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
    insert into public.messages(conversation_id,user_id,role,content,turn_request_id) values(c.id,p_user_id,'user',r.input_text,r.id) returning * into learner;
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
      current_streak=case when last_practice_date=today then current_streak when last_practice_date=today-1 then current_streak+1 else 1 end,
      longest_streak=greatest(longest_streak,case when last_practice_date=today then current_streak when last_practice_date=today-1 then current_streak+1 else 1 end),
      last_practice_date=today where user_id=p_user_id;
  end if;
  if c.lesson_id is not null then
    insert into public.lesson_progress(user_id,lesson_id) values(p_user_id,c.lesson_id) on conflict do nothing;
  end if;
  v_result:=jsonb_build_object('message',to_jsonb(tutor),'learnerMessage',case when learner.id is null then null else to_jsonb(learner) end,
    'corrections',coalesce((select jsonb_agg(to_jsonb(x)) from public.corrections x where x.message_id=learner.id),'[]'::jsonb),
    'encouragement',coalesce(p_reply->>'encouragement',''));
  update public.turn_requests set status='completed',result=v_result,updated_at=now() where id=r.id;
  return v_result;
end $$;

create function public.complete_conversation(p_conversation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.conversations;
begin
  select * into c from public.conversations where id=p_conversation_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Conversation unavailable'; end if;
  if c.status='completed' then return; end if;
  if exists(select 1 from public.turn_requests where conversation_id=c.id and status='processing' and updated_at>now()-interval '2 minutes') then raise exception 'A response is still being prepared'; end if;
  if not exists(select 1 from public.messages where conversation_id=c.id and role='user') then raise exception 'Practice at least one reply before finishing'; end if;
  update public.conversations set status='completed',completed_at=now() where id=c.id;
  update public.learning_stats set completed_sessions=completed_sessions+1,
    practice_seconds=practice_seconds+least(900,greatest(0,extract(epoch from now()-c.created_at)::integer)) where user_id=c.user_id;
  if c.lesson_id is not null then
    insert into public.lesson_progress(user_id,lesson_id,status,completed_count) values(c.user_id,c.lesson_id,'completed',1)
      on conflict(user_id,lesson_id) do update set status='completed',completed_count=public.lesson_progress.completed_count+1,updated_at=now();
  end if;
end $$;

revoke all on function public.handle_new_user() from public,anon,authenticated;
revoke all on function public.reserve_usage(uuid,text,integer),public.claim_turn(uuid,uuid,uuid,text),public.commit_turn(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_usage(uuid,text,integer),public.claim_turn(uuid,uuid,uuid,text),public.commit_turn(uuid,uuid,jsonb) to service_role;
revoke all on function public.complete_conversation(uuid) from public,anon;
grant execute on function public.complete_conversation(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tutor-audio','tutor-audio',false,5242880,array['audio/mpeg']) on conflict(id) do nothing;
create policy own_tutor_audio on storage.objects for select to authenticated using(bucket_id='tutor-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);

commit;
