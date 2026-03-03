import Link from "next/link";
import { ArrowRight, BookMarked, FolderOpen, Sparkles } from "lucide-react";
import type { SessionBundle, StoredDocumentProfile } from "@/types/rehearse";
import { formatScore } from "@/lib/utils";

export function DashboardOverview({
  sessions,
  documents,
}: {
  sessions: SessionBundle[];
  documents: StoredDocumentProfile[];
}) {
  const latest = sessions[0];

  return (
    <div className="space-y-6">
      <section className="paper-panel grid gap-6 rounded-xl p-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-coral">
            Rehearsal Desk
          </div>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl font-medium leading-tight tracking-tight md:text-5xl">
            Practice answers that sound structured, senior, and credible.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-grey-3">
            Move question by question, close rubric gaps with guided retries, and keep content and delivery scores separate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-6 py-3 text-sm text-white transition hover:bg-grey-2"
            >
              <Sparkles size={16} strokeWidth={1.5} />
              Start new rehearsal
            </Link>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-white/70 px-6 py-3 text-sm transition hover:border-coral/30 hover:text-coral"
            >
              Review prior sessions
            </Link>
          </div>
        </div>
        <div className="grid gap-4 rounded-lg border border-grey-5 bg-body/50 p-4">
          <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
              Latest weighted content
            </p>
            <p className="mt-3 font-serif text-4xl font-medium tracking-tight">
              {latest ? formatScore(latest.aggregate.averageWeightedContent) : "—"}
            </p>
            <p className="mt-2 text-sm text-grey-3">
              out of {latest ? formatScore(latest.aggregate.averageWeightedMax) : "—"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Delivery
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {latest ? formatScore(latest.aggregate.averageDelivery) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Stored docs
              </p>
              <p className="mt-2 text-2xl font-semibold">{documents.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="paper-panel rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Recent sessions
              </p>
              <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">
                Rehearsal ledger
              </h2>
            </div>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
            >
              Full history
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.session.id}
                href={
                  session.session.status === "completed"
                    ? `/session/${session.session.id}/summary`
                    : `/session/${session.session.id}`
                }
                className="block rounded-lg border border-grey-5 bg-white/75 p-4 transition hover:border-coral/30 hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-grey-1">
                      {session.session.status === "completed" ? "Completed" : "In progress"} rehearsal
                    </p>
                    <p className="mt-1 text-sm text-grey-3">
                      {session.session.seniorityLevel.replaceAll("_", " ")} · {session.aggregate.completedQuestions}/{session.aggregate.totalQuestions} questions
                    </p>
                  </div>
                  <div className="text-right text-sm text-grey-3">
                    <p>Weighted {formatScore(session.aggregate.averageWeightedContent)}</p>
                    <p>Delivery {formatScore(session.aggregate.averageDelivery)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="paper-panel rounded-xl p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
              Strong answers include
            </p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-grey-3">
              <p>Clear situation and task framing in the opening sentence.</p>
              <p>Ownership described with an “I decided” or “I led” statement.</p>
              <p>One concrete metric, one trade-off, and one reflection close.</p>
            </div>
          </div>
          <div className="paper-panel rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-sm bg-green/20 p-2 text-grey-1">
                <FolderOpen size={18} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-grey-1">Document status</p>
                <p className="text-sm text-grey-3">
                  {documents.filter((doc) => doc.kind === "cv").length} CV · {documents.filter((doc) => doc.kind === "jd").length} JD
                </p>
              </div>
            </div>
            <Link
              href="/profile/documents"
              className="mt-5 inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
            >
              Review structured document profiles
              <BookMarked size={14} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
