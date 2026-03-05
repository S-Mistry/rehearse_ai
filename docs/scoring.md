# Rehearse AI Scoring

## Scoring Philosophy

The scoring system is intentionally fair but strict.

- Broader real-world wording is allowed.
- High scores still require interview-strong evidence.
- `covered` is the only status that releases a score cap.
- `weak` means present but not yet strong enough.
- STAR coverage is a structure view, not the whole quality judgment.

## Criterion Assessment

Every answer is assessed across the shared rubric criteria:

- `situation`
- `task`
- `action`
- `result`
- `metric`
- `ownership`
- `reflection`
- `tradeoff`
- `resistance`
- `strategic_layer`

Each criterion gets:

- `status`: `missing`, `weak`, or `covered`
- `reason`
- `evidence`
- optional `strictnessNote`

`starAssessment` is derived from the criterion assessment for:

- `situation`
- `task`
- `action`
- `result`

## Status Meanings

- `missing`: the answer does not provide credible evidence for the criterion.
- `weak`: the answer mentions the criterion, but not clearly or concretely enough to count in a real interview.
- `covered`: the answer is specific and credible enough to satisfy the criterion.

## Cap Rules

Caps remain deterministic and strict.

- `no_result` applies when `result` is not `covered`
- `no_ownership` applies when `ownership` is not `covered`
- `no_metric` applies when `metric` is not `covered`
- `no_reflection` applies when `reflection` is not `covered`
- `no_tradeoff_senior_plus` applies when senior-plus answers do not have `tradeoff` covered
- `short_answer_cap` applies to very short answers
- `authenticity_flag` applies when reuse or implausible metrics look suspicious

Important:

- `weak` does not release a cap
- `covered` releases the cap

## Score Semantics

The visible answer score is the capped content score:

- `finalContentScoreAfterCaps / 5`

This is the number shown to the user on:

- the question feedback card
- the session summary page

Delivery remains separate.

Verdict bands:

- `1/5`: `Needs work`
- `2/5`: `Partial answer`
- `3/5`: `Good answer`
- `4/5`: `Strong answer`
- `5/5`: `Excellent answer`

## Question-Specific Policies

The scorer uses question-specific criterion policies to broaden valid evidence without lowering thresholds.

Examples:

- Q1 founder-style remit language can satisfy `task` when it clearly establishes scope.
- Q2 stakeholder strain, workload increase, and downstream operational pain can satisfy `resistance` even if the answer never says `pushback`.
- Q2 collaborative phrasing like `we discussed` can still count for `action` when the speaker clearly anchored ownership with `I met`, `I managed`, or similar.
- Q10 trade-offs only count when they show strategic decision logic, not just a list of actions.

These policies live in [criterion-policies.ts](/Users/sunil/projects/rehearse_ai/src/lib/rehearse/scoring/criterion-policies.ts).

## Follow-Up Selection

One follow-up is chosen by likely score lift, not by STAR completeness alone.

Priority is driven by unresolved criteria, especially when they are cap-releasing:

- result
- tradeoff
- metric
- ownership
- action
- reflection
- resistance
- task
- situation
- strategic_layer

Question-specific weighting is layered on top of this.

## Calibration Audit

Calibration should not rely on the primary scorer alone.

The audit workflow uses:

- app scorer output from the local scoring path
- a separate strict auditor prompt
- curated benchmark fixtures with expected ceilings and criterion statuses

Files:

- [score-model-spike.ts](/Users/sunil/projects/rehearse_ai/scripts/score-model-spike.ts)
- [score-calibration-audit.ts](/Users/sunil/projects/rehearse_ai/scripts/score-calibration-audit.ts)
- [score-model-spike.ts](/Users/sunil/projects/rehearse_ai/scripts/fixtures/score-model-spike.ts)
- [evaluator-audit.ts](/Users/sunil/projects/rehearse_ai/src/lib/rehearse/prompts/evaluator-audit.ts)

Run:

```bash
npm run spike:score-audit
```

The audit report is written to:

- `tmp/score-calibration-audit-report.json`

## Anti-Inflation Thresholds

The scorer should only be accepted when it remains within these guardrails:

- no curated `ceiling_3` answer should score `4` or `5`
- no curated `ceiling_4` answer should score `5`
- hard-fail fixtures should not produce false-positive `covered` statuses on required criteria
- any score increase above a fixture ceiling must be investigated before shipping

## Current Benchmark Scope

The calibration fixture set currently seeds every question code with benchmark cases and explicit ceilings.

It is designed to grow over time. The audit pipeline is the mechanism that keeps threshold changes honest as the scorer broadens to more realistic answer styles.
