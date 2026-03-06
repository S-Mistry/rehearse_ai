import type { AttemptFeedback, EvaluationResult } from "@/types/rehearse";

export function ScoreSheet({
  evaluation,
  feedback,
}: {
  evaluation?: EvaluationResult | null;
  feedback?: AttemptFeedback | null;
}) {
  return (
    <div className="rounded-xl border border-grey-5 bg-white/75 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Your score and feedback</p>
      {feedback ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-grey-5 bg-body/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-grey-4">{feedback.verdict}</p>
                <p className="mt-2 text-base font-medium text-grey-1">{feedback.headline}</p>
              </div>
              <div className="shrink-0 rounded-full border border-grey-5 bg-white px-4 py-2 text-right">
                <p className="text-lg font-semibold text-grey-1">
                  {evaluation ? `${evaluation.finalContentScoreAfterCaps}/5` : "—"}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-grey-4">Content score</p>
              </div>
            </div>
            {feedback.scoreExplanation ? (
              <p className="mt-3 text-sm leading-relaxed text-grey-3">{feedback.scoreExplanation}</p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-medium text-grey-1">What worked</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-grey-3">
              {feedback.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-grey-1">What to improve</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-grey-3">
              {feedback.improveNext.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-grey-5 bg-white p-4">
            <p className="text-sm font-medium text-grey-1">Delivery feedback</p>
            <p className="mt-2 text-sm leading-relaxed text-grey-3">
              {feedback.deliverySummary}
            </p>
          </div>

          {feedback.roleRelevance ? (
            <div className="rounded-xl border border-grey-5 bg-white p-4">
              <p className="text-sm font-medium text-grey-1">Role relevance</p>
              <p className="mt-2 text-sm font-medium text-grey-1">
                {feedback.roleRelevance.headline}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-grey-3">
                {feedback.roleRelevance.detail}
              </p>
              {feedback.roleRelevance.bridge ? (
                <p className="mt-2 text-sm leading-relaxed text-grey-3">
                  {feedback.roleRelevance.bridge}
                </p>
              ) : null}
            </div>
          ) : null}

          {feedback.answerStarter ? (
            <div className="rounded-xl border border-coral/20 bg-coral/10 p-4">
              <p className="text-sm font-medium text-grey-1">Try saying it more like this</p>
              <p className="mt-2 text-sm leading-relaxed text-grey-3">
                {feedback.answerStarter}
              </p>
            </div>
          ) : null}

          {feedback.cvLeverage?.length ? (
            <div>
              <p className="text-sm font-medium text-grey-1">Evidence from your background</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-grey-3">
                {feedback.cvLeverage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Your feedback will appear here after you answer the question.
        </p>
      )}

      {evaluation && !feedback ? (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Scoring complete.
        </p>
      ) : null}
    </div>
  );
}
