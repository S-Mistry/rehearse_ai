import { notFound } from "next/navigation";
import { getHistorySession } from "@/lib/rehearse/repositories/memory-store";

export default function HistoryDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const bundle = getHistorySession(params.sessionId);
  if (!bundle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="paper-panel rounded-xl p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Replay</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          Question-by-question ledger
        </h1>
      </div>
      {bundle.questions.map((question) => (
        <div key={question.id} className="paper-panel rounded-xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-grey-4">
            {question.questionCode}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">
            {question.bank.prompt}
          </h2>
          <div className="mt-4 space-y-4">
            {question.attempts.map((attempt) => (
              <div key={attempt.id} className="rounded-lg border border-grey-5 bg-white/70 p-4">
                <p className="text-sm font-medium text-grey-1">Attempt {attempt.attemptIndex}</p>
                <p className="mt-2 text-sm leading-relaxed text-grey-3">
                  {attempt.transcriptText}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
