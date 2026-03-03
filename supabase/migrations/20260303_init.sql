create extension if not exists "pgcrypto";

create type seniority_level as enum (
  'early_career',
  'mid_ic',
  'senior',
  'lead_principal',
  'manager_director'
);

create type session_status as enum (
  'draft',
  'ready',
  'active',
  'completed',
  'abandoned'
);

create type session_question_status as enum (
  'pending',
  'active',
  'awaiting_retry',
  'scored',
  'ended_early'
);

create type source_type as enum ('upload', 'paste');

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  display_name text,
  default_seniority seniority_level default 'mid_ic',
  created_at timestamptz not null default now()
);

create table if not exists cv_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text,
  source_type source_type not null,
  raw_text text not null,
  structured_json jsonb not null,
  parse_status text not null default 'parsed',
  created_at timestamptz not null default now()
);

create table if not exists jd_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  storage_path text,
  source_type source_type not null,
  raw_text text not null,
  structured_json jsonb not null,
  parse_status text not null default 'parsed',
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status session_status not null default 'draft',
  seniority_level seniority_level not null,
  seniority_multiplier numeric(4,2) not null,
  cv_profile_id uuid references cv_profiles(id) on delete set null,
  jd_profile_id uuid references jd_profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists question_bank (
  id uuid primary key default gen_random_uuid(),
  question_code text not null unique,
  prompt_text text not null,
  display_order int not null,
  rubric_version text not null,
  rubric_json jsonb not null,
  active boolean not null default true
);

create table if not exists session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  question_bank_id uuid not null references question_bank(id),
  status session_question_status not null default 'pending',
  attempt_count int not null default 0,
  final_content_raw numeric(4,1),
  final_content_capped numeric(4,1),
  final_content_weighted numeric(5,1),
  delivery_score numeric(4,1),
  final_feedback_json jsonb,
  forced_scoring_reason text
);

create table if not exists transcript_attempts (
  id uuid primary key default gen_random_uuid(),
  session_question_id uuid not null references session_questions(id) on delete cascade,
  attempt_index int not null,
  transcript_text text not null,
  word_count int not null,
  duration_seconds numeric(6,1) not null,
  filler_count int not null,
  filler_rate numeric(6,2) not null,
  words_per_minute numeric(6,2) not null,
  long_pause_count int not null,
  fragmentation_score numeric(6,2) not null,
  metrics_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  transcript_attempt_id uuid not null references transcript_attempts(id) on delete cascade,
  model_name text not null,
  prompt_version text not null,
  rubric_version text not null,
  content_score_raw int not null,
  delivery_score int not null,
  missing_components jsonb not null,
  strengths jsonb not null,
  nudges jsonb not null,
  caps_applied jsonb not null,
  reasoning_json jsonb not null,
  final_content_score_after_caps int not null,
  created_at timestamptz not null default now()
);

create table if not exists moderation_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  target_type text not null,
  target_id uuid,
  flagged boolean not null default false,
  categories_json jsonb not null,
  action_taken text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid references sessions(id) on delete cascade,
  event_name text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table cv_profiles enable row level security;
alter table jd_profiles enable row level security;
alter table sessions enable row level security;
alter table session_questions enable row level security;
alter table transcript_attempts enable row level security;
alter table evaluations enable row level security;
alter table moderation_events enable row level security;
alter table app_events enable row level security;

create policy "profiles_owner" on profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cv_profiles_owner" on cv_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "jd_profiles_owner" on jd_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_owner" on sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "session_questions_owner" on session_questions
for all using (
  exists (
    select 1 from sessions
    where sessions.id = session_questions.session_id
      and sessions.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from sessions
    where sessions.id = session_questions.session_id
      and sessions.user_id = auth.uid()
  )
);

create policy "transcript_attempts_owner" on transcript_attempts
for all using (
  exists (
    select 1
    from session_questions
    join sessions on sessions.id = session_questions.session_id
    where session_questions.id = transcript_attempts.session_question_id
      and sessions.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from session_questions
    join sessions on sessions.id = session_questions.session_id
    where session_questions.id = transcript_attempts.session_question_id
      and sessions.user_id = auth.uid()
  )
);

create policy "evaluations_owner" on evaluations
for all using (
  exists (
    select 1
    from transcript_attempts
    join session_questions on session_questions.id = transcript_attempts.session_question_id
    join sessions on sessions.id = session_questions.session_id
    where transcript_attempts.id = evaluations.transcript_attempt_id
      and sessions.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from transcript_attempts
    join session_questions on session_questions.id = transcript_attempts.session_question_id
    join sessions on sessions.id = session_questions.session_id
    where transcript_attempts.id = evaluations.transcript_attempt_id
      and sessions.user_id = auth.uid()
  )
);
