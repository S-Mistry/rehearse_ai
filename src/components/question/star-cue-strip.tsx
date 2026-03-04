import type { AttemptFeedback } from "@/types/rehearse";
import { cn } from "@/lib/utils";

const starOrder: Array<keyof AttemptFeedback["starCoverage"]> = [
  "situation",
  "task",
  "action",
  "result",
];

export function StarCueStrip({
  feedback,
  attemptCount,
}: {
  feedback?: AttemptFeedback | null;
  attemptCount: number;
}) {
  return (
    <div className="rounded-xl border border-grey-5 bg-white/75 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-grey-4">STAR coverage</p>
          <p className="mt-2 text-sm text-grey-3">
            {feedback
              ? "Covered sections are highlighted. Missing sections are what to fix next."
              : "Once the round is scored, this shows which parts of your story were actually present."}
          </p>
        </div>
        <p className="shrink-0 pt-1 text-right text-xs text-grey-3">Attempt {attemptCount}/3</p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3 items-stretch">
        {starOrder.map((item) => {
          const covered = feedback?.starCoverage[item] ?? false;
          return (
            <div
              key={item}
              className={cn(
                "flex min-h-[112px] flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center",
                covered
                  ? "border-green/40 bg-green/20 text-grey-1"
                  : "border-grey-5 bg-body/50 text-grey-3",
              )}
            >
              <p className="text-lg font-semibold uppercase">{item[0]}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em]">
                {covered ? "Covered" : "Missing"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
