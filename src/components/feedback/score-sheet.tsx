import type { AttemptFeedback, EvaluationResult } from "@/types/rehearse";
import { formatScore, titleCase } from "@/lib/utils";

export function ScoreSheet({
  evaluation,
  feedback,
}: {
  evaluation?: EvaluationResult | null;
  feedback?: AttemptFeedback | null;
}) {
  return (
    <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Score sheet</p>
      {evaluation ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-grey-5 bg-body/60 p-3">
              <p className="text-xs text-grey-4">Raw content</p>
              <p className="mt-2 font-serif text-3xl font-medium tracking-tight">
                {evaluation.finalContentScoreAfterCaps}
              </p>
            </div>
            <div className="rounded-md border border-grey-5 bg-body/60 p-3">
              <p className="text-xs text-grey-4">Weighted</p>
              <p className="mt-2 font-serif text-3xl font-medium tracking-tight">
                {formatScore(evaluation.weightedContentScore)}
              </p>
            </div>
            <div className="rounded-md border border-grey-5 bg-body/60 p-3">
              <p className="text-xs text-grey-4">Delivery</p>
              <p className="mt-2 text-2xl font-semibold">{evaluation.deliveryScore}</p>
            </div>
            <div className="rounded-md border border-grey-5 bg-body/60 p-3">
              <p className="text-xs text-grey-4">Caps</p>
              <p className="mt-2 text-sm text-grey-3">
                {evaluation.capsApplied.length > 0
                  ? evaluation.capsApplied.map((item) => titleCase(item)).join(", ")
                  : "None"}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-grey-3">
            <p>
              <span className="font-medium text-grey-1">Strengths:</span>{" "}
              {feedback?.strengths.join(", ") || evaluation.strengths.join(", ")}
            </p>
            <p>
              <span className="font-medium text-grey-1">What raises it:</span>{" "}
              {feedback?.whatWouldElevateToFive}
            </p>
            <p>
              <span className="font-medium text-grey-1">Structure note:</span>{" "}
              {feedback?.structuralImprovement}
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Submit an answer to populate raw content, weighted content, delivery, and cap status here.
        </p>
      )}
    </div>
  );
}
