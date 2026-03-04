alter table if exists sessions
  add column if not exists target_role_title text,
  add column if not exists target_company_name text;

alter table if exists transcript_attempts
  add column if not exists conversation_turns_json jsonb not null default '[]'::jsonb;
