-- Additive: existing level/goal readers and profile RLS remain compatible.
alter table public.profiles
  add column learning_goal text check (learning_goal in ('everyday','confident','advanced')),
  add column starting_level text check (starting_level in ('complete_beginner','some_expressions','basic_conversations','intermediate')),
  add column daily_goal_minutes integer check (daily_goal_minutes in (10,15,30,45,60,90,120)),
  add column onboarding_completed_at timestamptz,
  add constraint complete_korean_future check (onboarding_completed_at is null or
    (learning_goal is not null and starting_level is not null and daily_goal_minutes is not null));

grant update(learning_goal,starting_level,daily_goal_minutes,onboarding_completed_at) on public.profiles to authenticated;

-- Preserve existing signup behavior and seed future preferences from validated metadata.
-- Email confirmation may happen on another device, before any local draft can sync.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name,level,goal) values (
    new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),60),''),'Learner'),
    case when new.raw_user_meta_data->>'level' in ('Beginner','Intermediate','Advanced') then new.raw_user_meta_data->>'level' else 'Beginner' end,
    case when new.raw_user_meta_data->>'goal' in ('Daily Conversation','Study in Korea','Work in Korea','TOPIK') then new.raw_user_meta_data->>'goal' else 'Daily Conversation' end
  );
  if new.raw_user_meta_data->>'learning_goal' in ('everyday','confident','advanced')
    and new.raw_user_meta_data->>'starting_level' in ('complete_beginner','some_expressions','basic_conversations','intermediate')
    and new.raw_user_meta_data->>'daily_goal_minutes' in ('10','15','30','45','60','90','120') then
    update public.profiles set learning_goal=new.raw_user_meta_data->>'learning_goal',
      starting_level=new.raw_user_meta_data->>'starting_level',
      daily_goal_minutes=(new.raw_user_meta_data->>'daily_goal_minutes')::integer,
      onboarding_completed_at=now() where id=new.id;
  end if;
  insert into public.learning_stats(user_id) values(new.id);
  return new;
end $$;
