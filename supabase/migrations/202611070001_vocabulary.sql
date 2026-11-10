begin;

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  source_entry_id text not null unique,
  word text not null,
  pronunciation text,
  part_of_speech text,
  dictionary_grade text,
  difficulty_level text not null default 'unclassified'
    check (difficulty_level in ('beginner','intermediate','advanced','unclassified')),
  origin text,
  source_url text,
  source text not null default 'krdict',
  source_categories jsonb not null default '[]'::jsonb,
  attribution text not null default 'Korean Basic Dictionary (한국어기초사전), National Institute of Korean Language, CC BY-SA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vocabulary_entries_word_trgm on public.vocabulary_entries using gin (word extensions.gin_trgm_ops);
create index vocabulary_entries_level_word on public.vocabulary_entries (difficulty_level, word);

create table public.vocabulary_meanings (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  language text not null default 'ko',
  definition text not null,
  translation text,
  translation_language text not null default 'en',
  sense_order integer not null,
  unique (vocabulary_id, sense_order)
);
create index vocabulary_meanings_vocabulary on public.vocabulary_meanings(vocabulary_id, sense_order);

create table public.vocabulary_examples (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  meaning_id uuid references public.vocabulary_meanings(id) on delete set null,
  korean_sentence text not null,
  english_translation text,
  source text not null default 'krdict',
  source_example_order integer not null default 1,
  unique(vocabulary_id, source_example_order)
);

create table public.vocabulary_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text
);
create table public.vocabulary_topic_entries (
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  topic_id uuid not null references public.vocabulary_topics(id) on delete cascade,
  primary key(vocabulary_id, topic_id)
);
create index vocabulary_topic_entries_topic on public.vocabulary_topic_entries(topic_id, vocabulary_id);

create table public.lesson_vocabulary (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  target_order integer not null default 1,
  source text not null default 'editorial',
  primary key(lesson_id, vocabulary_id)
);

create table public.user_vocabulary_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  familiarity smallint not null default 0 check(familiarity between 0 and 5),
  saved_at timestamptz,
  correct_count integer not null default 0 check(correct_count >= 0),
  incorrect_count integer not null default 0 check(incorrect_count >= 0),
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  mastered_at timestamptz,
  primary key(user_id, vocabulary_id)
);
create index user_vocabulary_due on public.user_vocabulary_progress(user_id, next_review_at) where next_review_at is not null;
create index user_vocabulary_familiarity on public.user_vocabulary_progress(user_id, familiarity);

create table public.vocabulary_review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  answer_count integer not null default 0 check(answer_count >= 0)
);
create table public.vocabulary_review_answers (
  id uuid primary key,
  session_id uuid not null references public.vocabulary_review_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_entries(id) on delete cascade,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index vocabulary_review_answers_session on public.vocabulary_review_answers(session_id, created_at);

create table public.vocabulary_import_runs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  dictionary_level text,
  next_start integer not null default 1,
  page_size integer not null default 100,
  status text not null default 'running' check(status in ('running','partial','complete','failed')),
  total_reported integer,
  entries_seen integer not null default 0,
  entries_upserted integer not null default 0,
  error_message text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index vocabulary_import_run_identity on public.vocabulary_import_runs(query, coalesce(dictionary_level,''));

insert into public.vocabulary_topics(name, slug, description) values
 ('Greetings','greetings','Words and expressions for greeting people.'),
 ('Family','family','Words about family and relationships.'),
 ('Food','food','Words for food, meals, and dining.'),
 ('Transportation','transportation','Words for getting around.'),
 ('Shopping','shopping','Words for shopping and payment.'),
 ('Work','work','Words for work and occupations.'),
 ('Education','education','Words for learning and school.'),
 ('Travel','travel','Words for travel and accommodation.'),
 ('Emotions','emotions','Words for feelings and reactions.'),
 ('Daily Life','daily-life','Words for everyday activities.')
on conflict(slug) do nothing;

alter table public.vocabulary_entries enable row level security;
alter table public.vocabulary_meanings enable row level security;
alter table public.vocabulary_examples enable row level security;
alter table public.vocabulary_topics enable row level security;
alter table public.vocabulary_topic_entries enable row level security;
alter table public.lesson_vocabulary enable row level security;
alter table public.user_vocabulary_progress enable row level security;
alter table public.vocabulary_review_sessions enable row level security;
alter table public.vocabulary_review_answers enable row level security;
alter table public.vocabulary_import_runs enable row level security;

create policy vocabulary_entries_public_read on public.vocabulary_entries for select using (true);
create policy vocabulary_meanings_public_read on public.vocabulary_meanings for select using (true);
create policy vocabulary_examples_public_read on public.vocabulary_examples for select using (true);
create policy vocabulary_topics_public_read on public.vocabulary_topics for select using (true);
create policy vocabulary_topic_entries_public_read on public.vocabulary_topic_entries for select using (true);
create policy lesson_vocabulary_public_read on public.lesson_vocabulary for select using (true);
create policy vocabulary_progress_own_read on public.user_vocabulary_progress for select using (auth.uid() = user_id);
create policy vocabulary_sessions_own_read on public.vocabulary_review_sessions for select using (auth.uid() = user_id);
create policy vocabulary_answers_own_read on public.vocabulary_review_answers for select using (auth.uid() = user_id);

revoke all on public.vocabulary_import_runs from anon, authenticated;
revoke insert, update, delete on public.vocabulary_entries, public.vocabulary_meanings,
 public.vocabulary_examples, public.vocabulary_topics, public.vocabulary_topic_entries,
 public.lesson_vocabulary from anon, authenticated;
revoke insert, update, delete on public.user_vocabulary_progress,
 public.vocabulary_review_sessions, public.vocabulary_review_answers from anon, authenticated;
grant select on public.vocabulary_entries, public.vocabulary_meanings, public.vocabulary_examples,
 public.vocabulary_topics, public.vocabulary_topic_entries, public.lesson_vocabulary to anon, authenticated;
grant select on public.user_vocabulary_progress, public.vocabulary_review_sessions,
 public.vocabulary_review_answers to authenticated;

create or replace function public.start_vocabulary_review_session()
returns uuid language plpgsql security definer set search_path = '' as $$
declare session_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into public.vocabulary_review_sessions(user_id) values(auth.uid()) returning id into session_id;
  return session_id;
end $$;

create or replace function public.save_vocabulary(p_vocabulary_id uuid, p_saved boolean)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); saved timestamptz;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_saved then
    insert into public.user_vocabulary_progress(user_id,vocabulary_id,saved_at)
    values(uid,p_vocabulary_id,now()) on conflict(user_id,vocabulary_id)
    do update set saved_at=coalesce(public.user_vocabulary_progress.saved_at,now())
    returning saved_at into saved;
  else
    update public.user_vocabulary_progress set saved_at=null where user_id=uid and vocabulary_id=p_vocabulary_id;
  end if;
  return saved;
end $$;

create or replace function public.record_vocabulary_review_answer(
  p_answer_id uuid, p_session_id uuid, p_vocabulary_id uuid, p_correct boolean
) returns public.user_vocabulary_progress language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); progress public.user_vocabulary_progress; inserted_count integer;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if not exists(select 1 from public.vocabulary_review_sessions where id=p_session_id and user_id=uid and completed_at is null) then
    raise exception 'review session unavailable';
  end if;
  insert into public.vocabulary_review_answers(id,session_id,user_id,vocabulary_id,correct)
  values(p_answer_id,p_session_id,uid,p_vocabulary_id,p_correct) on conflict(id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    insert into public.user_vocabulary_progress(user_id,vocabulary_id) values(uid,p_vocabulary_id)
    on conflict(user_id,vocabulary_id) do nothing;
    if p_correct then
      update public.user_vocabulary_progress set
        familiarity=least(5,familiarity+1), correct_count=correct_count+1,
        last_reviewed_at=now(),
        next_review_at=now() + case least(5,familiarity+1)
          when 1 then interval '1 day' when 2 then interval '3 days' when 3 then interval '7 days'
          when 4 then interval '14 days' else interval '30 days' end,
        mastered_at=case when least(5,familiarity+1)=5 then coalesce(mastered_at,now()) else null end
      where user_id=uid and vocabulary_id=p_vocabulary_id;
    else
      update public.user_vocabulary_progress set
        familiarity=greatest(0,familiarity-1), incorrect_count=incorrect_count+1,
        last_reviewed_at=now(), next_review_at=now()+interval '10 minutes', mastered_at=null
      where user_id=uid and vocabulary_id=p_vocabulary_id;
    end if;
    update public.vocabulary_review_sessions set answer_count=answer_count+1 where id=p_session_id;
  end if;
  select * into progress from public.user_vocabulary_progress where user_id=uid and vocabulary_id=p_vocabulary_id;
  return progress;
end $$;

create or replace function public.complete_vocabulary_review_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); session public.vocabulary_review_sessions;
begin
  select * into session from public.vocabulary_review_sessions where id=p_session_id and user_id=uid for update;
  if not found then raise exception 'review session unavailable'; end if;
  if session.completed_at is not null then return true; end if;
  if session.answer_count < 3 then return false; end if;
  update public.vocabulary_review_sessions set completed_at=now() where id=p_session_id;
  perform public.record_learning_activity(uid,'vocabulary_review',p_session_id,session.answer_count);
  return true;
end $$;

create or replace function public.get_vocabulary_context(
  p_user_id uuid, p_lesson_id uuid, p_level text, p_limit integer default 8
) returns jsonb language sql stable security definer set search_path = '' as $$
  with candidates as (
    select e.id,e.word,e.pronunciation,e.difficulty_level,m.definition,m.translation,
      coalesce(p.familiarity,0) familiarity, coalesce(p.next_review_at <= now(),false) due,
      case when lv.vocabulary_id is not null then 0 when p.next_review_at <= now() then 1 else 2 end priority
    from public.vocabulary_entries e
    left join public.vocabulary_meanings m on m.vocabulary_id=e.id and m.sense_order=1
    left join public.user_vocabulary_progress p on p.vocabulary_id=e.id and p.user_id=p_user_id
    left join public.lesson_vocabulary lv on lv.vocabulary_id=e.id and lv.lesson_id=p_lesson_id
    where e.difficulty_level = case lower(p_level)
      when 'beginner' then 'beginner' when 'intermediate' then 'intermediate' when 'advanced' then 'advanced' else 'unclassified' end
      and (lv.vocabulary_id is not null or p.vocabulary_id is not null)
    order by priority, p.next_review_at nulls last, e.word
    limit greatest(1,least(12,p_limit))
  ) select coalesce(jsonb_agg(jsonb_build_object('word',word,'pronunciation',pronunciation,
    'level',difficulty_level,'definition',definition,'translation',translation,'familiarity',familiarity,'due',due)), '[]'::jsonb) from candidates;
$$;

create or replace function public.get_vocabulary_progress_summary()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(level, jsonb_build_object('learned',learned,'mastered',mastered)), '{}'::jsonb)
  from (
    select e.difficulty_level level, count(*) filter(where p.familiarity > 0)::integer learned,
      count(*) filter(where p.familiarity >= 5)::integer mastered
    from public.user_vocabulary_progress p
    join public.vocabulary_entries e on e.id=p.vocabulary_id
    where p.user_id=auth.uid()
    group by e.difficulty_level
  ) stats;
$$;

create or replace function public.search_vocabulary(
  p_query text default null, p_level text default null, p_topic_id uuid default null,
  p_limit integer default 60, p_offset integer default 0
) returns table(id uuid, word text, pronunciation text, part_of_speech text,
  difficulty_level text, definition text, translation text)
language sql stable security invoker set search_path = '' as $$
  select e.id,e.word,e.pronunciation,e.part_of_speech,e.difficulty_level,m.definition,m.translation
  from public.vocabulary_entries e
  left join lateral (select meaning.definition,meaning.translation from public.vocabulary_meanings meaning
    where meaning.vocabulary_id=e.id order by meaning.sense_order limit 1) m on true
  where (nullif(trim(p_query),'') is null or e.word ilike '%' || trim(p_query) || '%')
    and (p_level is null or e.difficulty_level=p_level)
    and (p_topic_id is null or exists(select 1 from public.vocabulary_topic_entries te
      where te.vocabulary_id=e.id and te.topic_id=p_topic_id))
  order by e.word,e.id
  limit greatest(1,least(100,p_limit)) offset greatest(0,p_offset);
$$;

revoke all on function public.start_vocabulary_review_session() from public, anon;
revoke all on function public.save_vocabulary(uuid,boolean) from public, anon;
revoke all on function public.record_vocabulary_review_answer(uuid,uuid,uuid,boolean) from public, anon;
revoke all on function public.complete_vocabulary_review_session(uuid) from public, anon;
revoke all on function public.get_vocabulary_context(uuid,uuid,text,integer) from public, anon, authenticated;
revoke all on function public.get_vocabulary_progress_summary() from public, anon;
revoke all on function public.search_vocabulary(text,text,uuid,integer,integer) from public;
grant execute on function public.start_vocabulary_review_session() to authenticated;
grant execute on function public.save_vocabulary(uuid,boolean) to authenticated;
grant execute on function public.record_vocabulary_review_answer(uuid,uuid,uuid,boolean) to authenticated;
grant execute on function public.complete_vocabulary_review_session(uuid) to authenticated;
grant execute on function public.get_vocabulary_progress_summary() to authenticated;
grant execute on function public.search_vocabulary(text,text,uuid,integer,integer) to anon, authenticated;
grant execute on function public.get_vocabulary_context(uuid,uuid,text,integer) to service_role;

grant all on public.vocabulary_entries, public.vocabulary_meanings, public.vocabulary_examples,
 public.vocabulary_topics, public.vocabulary_topic_entries, public.lesson_vocabulary,
 public.user_vocabulary_progress, public.vocabulary_review_sessions,
 public.vocabulary_review_answers, public.vocabulary_import_runs to service_role;

commit;
