# CLAUDE.md

## Mission

Build Rehearse AI as a production-grade behavioural interview rehearsal app.
The product is a structured rehearsal tool, not a generic chatbot.

## Primary Product Rules

1. Behavioural interviews only in v1.
2. Score content and delivery separately.
3. Apply the seniority multiplier to content only.
4. Keep every question context isolated.
5. Only pass structured CV/JD summaries across questions.
6. Use rubric-driven nudges; never invent "helpful" advice outside the rubric.
7. Never hide the raw content score behind the weighted score.
8. Do not persist raw answer audio by default.

## UX/UI Rules

1. Follow `.claude/rules/ui-design.md` and `.claude/rules/STYLE_GUIDE.md`.
2. Preserve the repo's warm, light, professional visual language.
3. Use the STAR cue strip and score-sheet patterns instead of generic dashboards.
4. Keep spoken system responses mirrored in text.
5. Design mobile and desktop intentionally; do not collapse into generic stacked cards.

## Technical Rules

1. Use Next.js App Router, TypeScript, Supabase, and OpenAI-first service wrappers.
2. Keep all OpenAI calls behind local service modules.
3. Version prompt templates, rubrics, and schemas.
4. Re-apply all score caps in application code even if the model already did.
5. Use strict structured outputs for evaluator and parser responses.
6. Do not trust cross-question conversational memory.

## Data And Safety Rules

1. Moderate unsafe transcript content before evaluation.
2. Do not provide discriminatory, deceptive, or guarantee-like coaching.
3. Minimize PII in logs.
4. Treat CV/JD uploads as private user data.
5. Every user-owned table and storage path must be protected by RLS.

## Scoring Rules

1. `no result` -> max 2
2. `no ownership` -> max 3
3. `no metric` -> max 3
4. `no reflection` for a 5-quality answer -> max 4
5. `no tradeoff` for Senior+ -> max 3
6. under 30 seconds -> max 2
7. authenticity flag -> max 4

## Build Priorities

1. Setup flow
2. One-question vertical slice
3. Full 10-question session
4. Summary/history
5. Hardening and launch

## Change Management

If you change any of these, update the relevant versioned artifact and note it in the PR:
- rubric structure
- prompt template
- scoring schema
- delivery metric thresholds
- seniority expectations
- route structure
