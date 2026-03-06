import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getSessionBundle } from "@/lib/rehearse/repositories/memory-store";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SessionSummaryPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const bundle = await getSessionBundle(params.sessionId);
  if (!bundle) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
      <section className="paper-panel rounded-xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Session summary</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
              You completed {bundle.aggregate.completedQuestions} of{" "}
              {bundle.aggregate.totalQuestions} questions
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-grey-3">
              Average delivery score: {formatScore(bundle.aggregate.averageDelivery)} / 5. Best question:{" "}
              {bundle.aggregate.strongestQuestionCode ?? "—"}. Most room to improve:{" "}
              {bundle.aggregate.weakestQuestionCode ?? "—"}.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs text-grey-4">Completed questions</p>
              <p className="mt-2 text-3xl font-semibold">
                {bundle.aggregate.completedQuestions}/{bundle.aggregate.totalQuestions}
              </p>
            </div>
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs text-grey-4">Seniority</p>
              <p className="mt-2 text-lg font-medium text-grey-1">
                {bundle.session.seniorityLevel.replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {bundle.questions.map((question) => (
          <div key={question.id} className="paper-panel rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-grey-4">
                  {question.questionCode}
                </p>
                <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight">
                  {question.bank.title}
                </h2>
              </div>
              <Link
                href={`/session/${bundle.session.id}/question/${question.questionCode}`}
                className="inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
              >
                Revisit question
                <ArrowRight size={14} strokeWidth={1.5} />
              </Link>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-grey-5 bg-white/70 p-4">
                <p className="text-xs text-grey-4">Content score</p>
                <p className="mt-2 text-xl font-semibold text-grey-1">
                  {question.finalContentCapped != null ? `${question.finalContentCapped}/5` : "Not scored"}
                </p>
                {question.finalFeedback ? (
                  <p className="mt-1 text-sm text-grey-3">{question.finalFeedback.verdict}</p>
                ) : null}
              </div>
              <div className="rounded-lg border border-grey-5 bg-white/70 p-4">
                <p className="text-xs text-grey-4">Attempts</p>
                <p className="mt-2 text-2xl font-semibold">{question.attemptCount}</p>
              </div>
              <div className="rounded-lg border border-grey-5 bg-white/70 p-4">
                <p className="text-xs text-grey-4">Delivery</p>
                <p className="mt-2 text-2xl font-semibold">
                  {question.deliveryScore != null ? `${question.deliveryScore}/5` : "—"}
                </p>
              </div>
            </div>
            {question.finalFeedback ? (
              <div className="mt-4 space-y-2 text-sm leading-relaxed text-grey-3">
                <p>
                  <span className="font-medium text-grey-1">What worked:</span>{" "}
                  {question.finalFeedback.strengths.join(", ") || "—"}
                </p>
                <p>
                  <span className="font-medium text-grey-1">What to improve:</span>{" "}
                  {question.finalFeedback.improveNext.join(", ") || "None"}
                </p>
                {question.finalFeedback.roleRelevance ? (
                  <p>
                    <span className="font-medium text-grey-1">Role relevance:</span>{" "}
                    {question.finalFeedback.roleRelevance.headline}{" "}
                    {question.finalFeedback.roleRelevance.bridge ??
                      question.finalFeedback.roleRelevance.detail}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
