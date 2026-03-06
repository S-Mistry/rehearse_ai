import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listSessionBundles } from "@/lib/rehearse/repositories/memory-store";
import { formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const sessions = await listSessionBundles();

  return (
    <div className="paper-panel rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">History</p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
        Your practice sessions
      </h1>
      <div className="mt-6 space-y-4">
        {sessions.map((bundle) => (
          <Link
            key={bundle.session.id}
            href={`/history/${bundle.session.id}`}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-grey-5 bg-white/75 p-4 transition hover:border-coral/30"
          >
            <div>
              <p className="text-sm font-medium text-grey-1">
                {bundle.session.status === "completed" ? "Completed" : "In progress"} session
              </p>
              <p className="mt-1 text-sm text-grey-3">
                {bundle.session.seniorityLevel.replaceAll("_", " ")} · {bundle.aggregate.completedQuestions}/{bundle.aggregate.totalQuestions} complete
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-grey-3">
              <span>Delivery {formatScore(bundle.aggregate.averageDelivery)}/5</span>
              <span>{bundle.aggregate.completedQuestions} questions scored</span>
              <ArrowRight size={14} strokeWidth={1.5} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
