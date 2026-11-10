\set ON_ERROR_STOP on
insert into auth.users(id,raw_user_meta_data) values ('b1000000-0000-4000-8000-000000000003','{"learning_goal":"advanced","starting_level":"complete_beginner","daily_goal_minutes":60}');
do $$ begin
 if not exists(select 1 from public.profiles where id='b1000000-0000-4000-8000-000000000003' and learning_goal='advanced' and starting_level='complete_beginner' and daily_goal_minutes=60 and onboarding_completed_at is not null and level='Beginner') then raise exception 'Signup preferences not seeded independently'; end if;
end $$;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',false);
set role authenticated;
do $$ declare n integer; begin
 update public.profiles set learning_goal='confident',starting_level='some_expressions',daily_goal_minutes=30,onboarding_completed_at=now() where id=auth.uid();
 if not exists(select 1 from public.profiles where daily_goal_minutes=30 and onboarding_completed_at is not null) then raise exception 'Owned future update failed'; end if;
 begin update public.profiles set daily_goal_minutes=0 where id=auth.uid(); raise exception 'Invalid daily goal allowed'; exception when check_violation then null; end;
 update public.profiles set daily_goal_minutes=120 where id='b1000000-0000-4000-8000-000000000003';
 get diagnostics n = row_count;
 if n<>0 then raise exception 'Foreign future update allowed'; end if;
end $$;
reset role;
select 'Korean future schema, signup and RLS tests passed' as result;
