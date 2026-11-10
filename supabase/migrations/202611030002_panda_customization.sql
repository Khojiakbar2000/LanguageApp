-- Additive profile preferences; preserve the existing profile and ownership RLS.
begin;
alter table public.profiles
  add column panda_outfit text not null default 'blue' check (panda_outfit in ('purple','blue','pink')),
  add column panda_accessory text not null default 'headphones' check (panda_accessory in ('headphones','glasses','hat','none'));
grant update(panda_outfit,panda_accessory) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name,level,goal,panda_outfit,panda_accessory) values (
    new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),60),''),'Learner'),
    case when new.raw_user_meta_data->>'level' in ('Beginner','Intermediate','Advanced') then new.raw_user_meta_data->>'level' else 'Beginner' end,
    case when new.raw_user_meta_data->>'goal' in ('Daily Conversation','Study in Korea','Work in Korea','TOPIK') then new.raw_user_meta_data->>'goal' else 'Daily Conversation' end,
    case when new.raw_user_meta_data->>'panda_outfit' in ('purple','blue','pink') then new.raw_user_meta_data->>'panda_outfit' else 'blue' end,
    case when new.raw_user_meta_data->>'panda_accessory' in ('headphones','glasses','hat','none') then new.raw_user_meta_data->>'panda_accessory' else 'headphones' end
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

commit;
