\set ON_ERROR_STOP on
set role service_role;
do $$
declare
  u uuid:='b1000000-0000-4000-8000-000000000002';
  today date:=(now() at time zone 'UTC')::date;
  result jsonb;
begin
  if public.learning_date('2026-03-08 09:59:00+00','America/Los_Angeles')<>'2026-03-08'::date
    or public.learning_date('2026-03-08 10:00:00+00','America/Los_Angeles')<>'2026-03-08'::date then raise exception 'DST spring transition changed learning date'; end if;
  if public.learning_date('2026-11-01 08:30:00+00','America/Los_Angeles')<>'2026-11-01'::date
    or public.learning_date('2026-11-01 09:30:00+00','America/Los_Angeles')<>'2026-11-01'::date then raise exception 'DST fall transition changed learning date'; end if;
  if public.learning_date('2026-11-06 11:00:00+00','Pacific/Kiritimati')='2026-11-06'::date
    or public.learning_date('2026-11-06 11:00:00+00','America/Los_Angeles')<>'2026-11-06'::date then raise exception 'Timezone change is not applied consistently'; end if;
  if public.learning_date('2025-01-01 00:30:00+00','America/Los_Angeles')<>'2024-12-31'::date
    or public.learning_date('2026-01-01 00:00:00+00','UTC')<>'2026-01-01'::date then raise exception 'Month/year boundary calculation failed'; end if;
  delete from public.learning_events where user_id=u;
  delete from public.daily_learning_activity where user_id=u;
  delete from public.streak_milestones where user_id=u;
  delete from public.streak_freeze_transactions where user_id=u and transaction_type='consume';
  update public.learning_stats set current_streak=0,longest_streak=0,last_qualifying_date=null,
    streak_freezes_available=1,total_xp=0,timezone='UTC' where user_id=u;

  result:=public.record_learning_activity(u,'conversation','e2000000-0000-4000-8000-000000000001');
  if result->>'current_streak'<>'1' or result->>'first_activity_today'<>'true' then raise exception 'First qualifying day failed'; end if;
  result:=public.record_learning_activity(u,'conversation','e2000000-0000-4000-8000-000000000001');
  if result->>'recorded'<>'false' then raise exception 'Duplicate event was rewarded'; end if;
  result:=public.record_learning_activity(u,'guided_mission','e2000000-0000-4000-8000-000000000002');
  if result->>'current_streak'<>'1' or result->>'first_activity_today'<>'false' then raise exception 'Same-day activity changed streak'; end if;

  update public.learning_stats set current_streak=1,longest_streak=1,last_qualifying_date=today-1,
    streak_freezes_available=1 where user_id=u;
  result:=public.record_learning_activity(u,'lesson','e2000000-0000-4000-8000-000000000003');
  if result->>'current_streak'<>'2' or result->>'streak_freezes_available'<>'1' then raise exception 'Consecutive day failed'; end if;

  update public.learning_stats set current_streak=2,longest_streak=2,last_qualifying_date=today-2,
    streak_freezes_available=1 where user_id=u;
  result:=public.record_learning_activity(u,'vocabulary_review','e2000000-0000-4000-8000-000000000004');
  if result->>'current_streak'<>'3' or result->>'streak_freezes_available'<>'0' then raise exception 'Freeze did not protect one missed day'; end if;
  if not exists(select 1 from public.streak_freeze_transactions where user_id=u and transaction_type='consume' and learning_date=today-1) then raise exception 'Freeze consumption was not recorded'; end if;
  if not exists(select 1 from public.streak_milestones where user_id=u and milestone_days=3 and reward_xp=30) then raise exception 'Milestone was not awarded'; end if;

  update public.learning_stats set current_streak=6,longest_streak=6,last_qualifying_date=today-1,
    streak_freezes_available=1 where user_id=u;
  result:=public.record_learning_activity(u,'lesson','e2000000-0000-4000-8000-000000000006');
  if result->>'current_streak'<>'7' or result->>'streak_freezes_available'<>'2' then raise exception 'Free milestone freeze grant failed'; end if;
  if not exists(select 1 from public.streak_freeze_transactions where user_id=u and reason='milestone_7' and amount=1) then raise exception 'Milestone freeze grant was not recorded'; end if;

  update public.learning_stats set current_streak=8,longest_streak=8,last_qualifying_date=today-4,
    streak_freezes_available=1 where user_id=u;
  result:=public.record_learning_activity(u,'conversation','e2000000-0000-4000-8000-000000000005');
  if result->>'current_streak'<>'1' or result->>'longest_streak'<>'8' or result->>'streak_freezes_available'<>'0' then raise exception 'Multiple missed days or longest streak failed'; end if;
  if (select day_status from public.daily_learning_activity where user_id=u and learning_date=today-3)<>'protected' then raise exception 'Protected day status missing'; end if;
  if (select day_status from public.daily_learning_activity where user_id=u and learning_date=today-2)<>'missed' then raise exception 'Unprotected missed day status missing'; end if;

  if (select total_xp from public.learning_stats where user_id=u)<105 then raise exception 'XP totals did not include activity and milestone rewards'; end if;
end $$;
update public.learning_stats set current_streak=5,last_qualifying_date=(now() at time zone 'UTC')::date-3,
  streak_freezes_available=1 where user_id='b1000000-0000-4000-8000-000000000002';
reset role;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',false);
set role authenticated;
do $$ declare result jsonb; begin
  result:=public.get_streak_summary();
  if result->>'current_streak'<>'0' or result->>'streak_freezes_available'<>'0' or result->>'longest_streak'<>'8' then raise exception 'Inactivity catch-up failed'; end if;
end $$;
reset role;
select 'Daily streak transaction tests passed' as result;
