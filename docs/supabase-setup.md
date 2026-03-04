# Supabase Setup

## Required env vars

Use the current Supabase key names in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` stays server-only. Do not expose it in client code.

## Apply the schema

The hosted project must have the Rehearse schema installed before the app can use live persistence.

1. Open the Supabase SQL Editor for the project.
2. Apply every SQL file in [supabase/migrations/](/Users/sunil/projects/rehearse_ai/supabase/migrations) in timestamp order:
   - [20260303_init.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_init.sql)
   - [20260303_phase2_contracts.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_phase2_contracts.sql)
   - [20260303_live_interview_contracts.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_live_interview_contracts.sql)
3. Run each migration once, in order.

After that, the app will seed `question_bank` and the demo profile automatically on first use.

## Current behavior

- If Supabase server credentials are missing, the app falls back to the in-memory repository.
- If Supabase server credentials are present, the app intentionally does not fall back to memory mode.
- If the hosted schema is missing tables or columns, the app throws a migration-specific error instead of silently falling back.
