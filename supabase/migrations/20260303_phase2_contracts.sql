alter table if exists cv_profiles
  add column if not exists file_name text,
  add column if not exists provider text not null default 'fallback:local-parser';

alter table if exists jd_profiles
  add column if not exists file_name text,
  add column if not exists provider text not null default 'fallback:local-parser';

alter table if exists transcript_attempts
  add column if not exists transcript_provider text not null default 'manual-transcript';

alter table if exists evaluations
  add column if not exists provider text not null default 'fallback:heuristic';
