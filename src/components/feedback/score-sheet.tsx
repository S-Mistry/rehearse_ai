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
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">How this answer landed</p>
      {feedback ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-grey-5 bg-body/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-grey-4">{feedback.verdict}</p>
            <p className="mt-2 text-base font-medium text-grey-1">{feedback.headline}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-grey-1">What worked</p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-grey-3">
              {feedback.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-grey-1">Improve Next</p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-grey-3">
              {feedback.improveNext.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-grey-5 bg-white p-4">
            <p className="text-sm font-medium text-grey-1">Delivery note</p>
            <p className="mt-2 text-sm leading-relaxed text-grey-3">
              {feedback.deliverySummary}
            </p>
          </div>

          {feedback.roleRelevance ? (
            <div className="rounded-xl border border-grey-5 bg-white p-4">
              <p className="text-sm font-medium text-grey-1">Role Relevance</p>
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
              <p className="text-sm font-medium text-grey-1">Evidence you could pull in</p>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-grey-3">
                {feedback.cvLeverage.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Finish the interview round to see a plain-English read on what worked, what is still missing, and how to improve the next attempt.
        </p>
      )}

      {evaluation && !feedback ? (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Evaluation recorded.
        </p>
      ) : null}
    </div>
  );
}
