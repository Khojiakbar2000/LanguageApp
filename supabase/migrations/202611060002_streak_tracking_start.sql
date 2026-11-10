begin;

-- Records when verified streak history begins. Older learning rows are intentionally not
-- displayed as missed or completed because the prior system did not retain verified days.
alter table public.learning_stats
  add column streak_started_at timestamptz not null default now();

comment on column public.learning_stats.streak_started_at is
  'Start of verified streak tracking; used to distinguish untracked history from missed days.';

commit;
