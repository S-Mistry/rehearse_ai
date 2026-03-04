# Rehearse AI Architecture

## Runtime Shape

- Next.js App Router provides public marketing pages plus authenticated-style application routes.
- A local memory repository keeps the product runnable when Supabase server credentials are not configured.
- Service boundaries mirror production responsibilities: document intake, moderation, transcription, evaluation, and speech.
- Supabase helpers and SQL migrations are included so the repo can move from demo persistence to production persistence without changing the app shape.

## Core Request Flow

1. User starts a session from `/setup`.
2. The server creates a session with 10 question instances.
3. The question workspace records audio or accepts a typed transcript fallback.
4. `/api/questions/[sessionQuestionId]/submit-audio` moderates the transcript, computes delivery metrics, evaluates content, applies score caps, and returns a retry nudge or final feedback.
5. Session state is read directly from the repository layer for dashboard, history, and summary pages.

## Mock Mode

When `OPENAI_API_KEY` or Supabase server credentials are missing:

- transcription falls back to the manual transcript field
- evaluation uses the local heuristic engine
- speech falls back to browser synthesis
- persistence uses an in-memory global store

This keeps the product reviewable while preserving the production contracts.

When Supabase credentials are present, the app uses the hosted database path and intentionally does not fall back to memory mode. Apply every SQL file in [supabase/migrations/](/Users/sunil/projects/rehearse_ai/supabase/migrations) in timestamp order before using the live project:

1. [20260303_init.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_init.sql)
2. [20260303_phase2_contracts.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_phase2_contracts.sql)
3. [20260303_live_interview_contracts.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_live_interview_contracts.sql)

If the hosted schema is stale, the app fails fast with a migration-specific error.

## Current Supabase env names

The current Supabase docs prefer:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` only when privileged server-side access is actually needed
