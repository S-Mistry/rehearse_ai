import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  CircleGauge,
  FileSearch,
  FolderOpen,
  MicVocal,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-14 md:px-8 md:py-20">
      <section className="paper-panel grid gap-6 rounded-xl p-6 md:p-8 lg:grid-cols-[1.4fr_0.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-coral/20 bg-coral/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-coral">
            Behavioural interview simulator
          </div>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">
            Practice answers that stand up to a real hiring rubric.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-grey-3">
            Rehearse turns behavioural prep into a measured rehearsal loop: answer aloud, see the structural gap, tighten the story, and move on with clearer evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-6 py-3 text-sm text-white transition hover:bg-grey-2"
            >
              <Sparkles size={16} strokeWidth={1.5} />
              Start rehearsal
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-white/70 px-6 py-3 text-sm transition hover:border-coral/30 hover:text-coral"
            >
              Preview the desk
              <ArrowRight size={16} strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-grey-5 bg-body/50 p-4">
          <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
              Signature interaction
            </p>
            <div className="mt-4 rounded-lg border border-grey-5 bg-white p-4">
              <div className="flex gap-2">
                {["S", "T", "A", "R"].map((label, index) => (
                  <div
                    key={label}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium ${
                      index < 2
                        ? "border-green/50 bg-green/20"
                        : "border-coral/30 bg-coral/10 text-coral"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3 text-sm text-grey-3">
                <div className="rounded-full border border-coral/20 bg-coral/10 px-3 py-2">
                  Missing metric
                </div>
                <div className="rounded-full border border-coral/20 bg-coral/10 px-3 py-2">
                  Missing trade-off
                </div>
                <div className="rounded-full border border-green/30 bg-green/20 px-3 py-2">
                  Retry 2 of 3 available
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-grey-3">
              The STAR cue strip shows what is structurally missing before the next attempt, instead of hiding behind a generic score.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Content
              </p>
              <p className="mt-2 font-serif text-4xl font-medium tracking-tight">4.2</p>
              <p className="mt-2 text-sm text-grey-3">weighted against senior expectations</p>
            </div>
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Delivery
              </p>
              <p className="mt-2 text-2xl font-semibold">3.9</p>
              <p className="mt-2 text-sm text-grey-3">kept separate from content quality</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="paper-panel rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                What rehearsal looks like
              </p>
              <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">
                A measured practice ledger
              </h2>
            </div>
            <Link
              href="/history"
              className="inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
            >
              See the desk flow
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-grey-1">Question 04 · Influence without authority</p>
                  <p className="mt-1 text-sm text-grey-3">
                    First pass exposed missing ownership and no quantified result.
                  </p>
                </div>
                <div className="text-right text-sm text-grey-3">
                  <p>Weighted 3.0</p>
                  <p>Delivery 4.0</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-grey-1">Retry coach</p>
                  <p className="mt-1 text-sm text-grey-3">
                    You explained the stakeholder tension clearly. Clarify the result and the trade-off you chose.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-grey-1">
                  Retry available
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-grey-1">Final pass</p>
                  <p className="mt-1 text-sm text-grey-3">
                    The answer now lands with ownership, metrics, and a clean reflection close.
                  </p>
                </div>
                <div className="text-right text-sm text-grey-3">
                  <p>Weighted 4.8</p>
                  <p>Delivery 4.1</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="paper-panel rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-sm bg-coral/10 p-2 text-coral">
                <CircleGauge size={18} strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-medium text-grey-1">Strong answers include</p>
                <p className="text-sm text-grey-3">The scoring sheet stays separate by design.</p>
              </div>
            </div>
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
                <p className="font-medium text-grey-1">CV and JD leverage</p>
                <p className="text-sm text-grey-3">
                  Pull stronger evidence from your own background without bending the rubric.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-grey-3">
              <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-sm bg-coral/10 p-2 text-coral">
                    <FileSearch size={16} strokeWidth={1.5} />
                  </div>
                  <p>Surface the metric-bearing project from your CV instead of your weaker default example.</p>
                </div>
              </div>
              <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-sm bg-coral/10 p-2 text-coral">
                    <MicVocal size={16} strokeWidth={1.5} />
                  </div>
                  <p>Keep the spoken coaching narrow: one missing piece per retry, no generic advice wall.</p>
                </div>
              </div>
            </div>
            <Link
              href="/setup"
              className="mt-5 inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
            >
              Start with your own role context
              <BookMarked size={14} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>

      <section className="paper-panel rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Start the desk</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">
              Rehearse the real answer, not the abstract idea of it.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-grey-3">
              Begin with your seniority, optional CV and JD context, and move into the first behavioural question with the same layout and scoring language used throughout the product.
            </p>
          </div>
          <Link
            href="/setup"
            className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-6 py-3 text-sm text-white transition hover:bg-grey-2"
          >
            Begin setup
            <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
