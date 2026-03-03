# Rehearse AI Scoring Notes

## Content

- Raw content score is generated on a 1-5 scale.
- Deterministic caps are re-applied after evaluation.
- Weighted content score is `finalContentScoreAfterCaps * seniorityMultiplier`.

## Delivery

- Delivery is scored separately from content.
- The current implementation uses transcript-derived heuristics for filler rate, pacing, pause count, and fragmentation.
- If OpenAI audio timestamps are available, pause events are recalculated from word timing.

## Retry Logic

- Maximum of three total attempts per question.
- One nudge is surfaced at a time.
- Nudge priority is: result, ownership, metric, structure, reflection, strategic layer.

## Safety

- Unsafe content pauses evaluation and prevents coaching on that answer.
- Authenticity flags cap the answer at 4.
