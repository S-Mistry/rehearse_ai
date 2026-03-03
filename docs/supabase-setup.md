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
2. Paste the contents of [20260303_init.sql](/Users/sunil/projects/rehearse_ai/supabase/migrations/20260303_init.sql).
3. Run the migration.

After that, the app will seed `question_bank` and the demo profile automatically on first use.

## Current behavior

- If Supabase server credentials are missing, the app falls back to the in-memory repository.
- If Supabase server credentials are present but the schema is missing, the app throws a clear error instead of silently falling back.
