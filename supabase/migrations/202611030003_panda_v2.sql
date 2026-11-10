-- V2 adds the supplied unadorned base while retaining all saved outfits/accessories.
-- Rollback: restore the previous defaults; keep the expanded check for existing rows.
begin;
alter table public.profiles drop constraint profiles_panda_outfit_check;
alter table public.profiles add constraint profiles_panda_outfit_check
  check (panda_outfit in ('purple','blue','pink','original'));
alter table public.profiles alter column panda_outfit set default 'original';
alter table public.profiles alter column panda_accessory set default 'none';

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,display_name,level,goal,panda_outfit,panda_accessory) values (
    new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'),60),''),'Learner'),
    case when new.raw_user_meta_data->>'level' in ('Beginner','Intermediate','Advanced') then new.raw_user_meta_data->>'level' else 'Beginner' end,
    case when new.raw_user_meta_data->>'goal' in ('Daily Conversation','Study in Korea','Work in Korea','TOPIK') then new.raw_user_meta_data->>'goal' else 'Daily Conversation' end,
    case when new.raw_user_meta_data->>'panda_outfit' in ('purple','blue','pink','original') then new.raw_user_meta_data->>'panda_outfit' else 'original' end,
    case when new.raw_user_meta_data->>'panda_accessory' in ('headphones','glasses','hat','none') then new.raw_user_meta_data->>'panda_accessory' else 'none' end
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
