import type { MissingComponent, SessionQuestionRecord } from "@/types/rehearse";
import { cn, titleCase } from "@/lib/utils";

const starOrder: Array<{ key: MissingComponent; label: string }> = [
  { key: "situation", label: "S" },
  { key: "task", label: "T" },
  { key: "action", label: "A" },
  { key: "result", label: "R" },
];

export function StarCueStrip({
  question,
  compact = false,
}: {
  question: SessionQuestionRecord;
  compact?: boolean;
}) {
  const evaluation = question.evaluations.at(-1)?.reasoningJson;
  const missing = new Set(evaluation?.missingComponents ?? []);

  return (
    <div className={cn("rounded-lg border border-grey-5 bg-white/70", compact ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">STAR cue strip</p>
        <p className="text-xs text-grey-3">Attempt {question.attemptCount}/3</p>
      </div>
      <div className="mt-4 flex gap-2">
        {starOrder.map((item) => {
          const complete = !missing.has(item.key);
          return (
            <div
              key={item.key}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium",
                complete
                  ? "border-green/60 bg-green/20 text-grey-1"
                  : "border-coral/30 bg-coral/10 text-coral",
              )}
            >
              {item.label}
            </div>
          );
        })}
      </div>
      {evaluation ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {evaluation.missingComponents.length > 0 ? (
            evaluation.missingComponents.map((item) => (
              <span
                key={item}
                className="rounded-full border border-coral/20 bg-coral/10 px-3 py-1 text-xs text-grey-3"
              >
                Missing {titleCase(item)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-green/40 bg-green/20 px-3 py-1 text-xs text-grey-3">
              Full STAR structure captured
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          The cue strip updates after each answer so the user can see which structural pieces are still missing.
        </p>
      )}
    </div>
  );
}
