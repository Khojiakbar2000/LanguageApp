begin;

-- Preserve the existing 6 pm reminder behavior for profiles already in the system.
alter table public.profiles
  add column if not exists daily_reminder_hour integer not null default 18
  check (daily_reminder_hour between 0 and 23);

grant update(daily_reminder_hour) on public.profiles to authenticated;

commit;
