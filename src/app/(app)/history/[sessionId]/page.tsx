import { notFound } from "next/navigation";
import { getHistorySession } from "@/lib/rehearse/repositories/memory-store";
import { interviewerName } from "@/lib/rehearse/interview/interviewer-persona";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const bundle = await getHistorySession(params.sessionId);
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
                {attempt.conversationTurns.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {attempt.conversationTurns.map((turn) => (
                      <div key={turn.id}>
                        <p className="text-xs uppercase tracking-[0.18em] text-grey-4">
                          {turn.speaker === "interviewer"
                            ? interviewerName
                            : turn.speaker === "candidate"
                              ? "You"
                              : "System"}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-grey-3">
                          {turn.text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-grey-3">
                    {attempt.transcriptText}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
