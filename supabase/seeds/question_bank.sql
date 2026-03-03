insert into question_bank (question_code, prompt_text, display_order, rubric_version, rubric_json)
values
  ('Q1', 'Tell me about a time you led a challenging project.', 1, '2026-03-03-v1', '{"score5Signals":["clear scope","measurable success metric","cross-functional alignment","resource constraint navigation","explicit trade-offs","post-project learning"]}'),
  ('Q2', 'Describe a time you dealt with conflict.', 2, '2026-03-03-v1', '{"score5Signals":["clear conflict type","active listening","structured resolution","measurable or relational outcome","relationship preserved","reflection on emotional intelligence"]}'),
  ('Q3', 'Tell me about a failure.', 3, '2026-03-03-v1', '{"score5Signals":["full ownership","clear decision error","root cause analysis","corrective action","preventative system change","quantifiable recovery impact"]}'),
  ('Q4', 'Tell me about a time you influenced without authority.', 4, '2026-03-03-v1', '{"score5Signals":["stakeholder mapping","objection handling","framing strategy","political awareness","outcome metric"]}'),
  ('Q5', 'Tell me about a time you made a data-driven decision.', 5, '2026-03-03-v1', '{"score5Signals":["baseline state","hypothesis","data sources","decision criteria","outcome vs counterfactual"]}'),
  ('Q6', 'Tell me about a time you worked under ambiguity.', 6, '2026-03-03-v1', '{"score5Signals":["problem framing","assumption identification","iteration","risk mitigation","clear outcome"]}'),
  ('Q7', 'Tell me about a time you improved a process.', 7, '2026-03-03-v1', '{"score5Signals":["bottleneck diagnosis","quantified inefficiency","implemented change","before-and-after metrics","scalability impact"]}'),
  ('Q8', 'Tell me about a time you handled multiple priorities.', 8, '2026-03-03-v1', '{"score5Signals":["prioritization framework","trade-offs","delegation clarity","outcome integrity"]}'),
  ('Q9', 'Tell me about a time you gave difficult feedback.', 9, '2026-03-03-v1', '{"score5Signals":["framing strategy","empathy markers","behavioral specificity","outcome change","relationship maintained"]}'),
  ('Q10', 'Why should we hire you?', 10, '2026-03-03-v1', '{"score5Signals":["value proposition","direct JD alignment","quantified strengths","competitive differentiation","future contribution framing"]}')
on conflict (question_code) do nothing;
