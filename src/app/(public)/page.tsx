import Link from "next/link";
import { ArrowRight, CircleGauge, FileSearch, MicVocal } from "lucide-react";

const pillars = [
  {
    icon: CircleGauge,
    title: "Structured scoring",
    description:
      "Separate content from delivery so a polished answer does not hide missing ownership, trade-offs, or metrics.",
  },
  {
    icon: MicVocal,
    title: "Voice-first rehearsal",
    description:
      "Record answers, score them, and retry with a single focused coaching nudge instead of a generic wall of text.",
  },
  {
    icon: FileSearch,
    title: "CV and JD leverage",
    description:
      "Pull stronger evidence from your own background and align the answer to the role without distorting the core rubric.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
      <section className="paper-panel overflow-hidden rounded-[32px] border p-6 md:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex rounded-full border border-coral/20 bg-coral/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-coral">
              Behavioural interview simulator
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-5xl font-medium leading-tight tracking-tight md:text-7xl">
              Practice answers that stand up to a real hiring rubric.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-grey-3">
              Rehearse turns behavioural prep into a measured rehearsal loop: answer aloud, see the structural gap, tighten the story, and move on with clearer evidence.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-6 py-3 text-sm text-white transition hover:bg-grey-2"
              >
                Start rehearsal
                <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-white/70 px-6 py-3 text-sm transition hover:border-coral/30 hover:text-coral"
              >
                Preview the desk
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-grey-5 bg-white/70 p-5">
            <div className="rounded-[24px] border border-grey-5 bg-body/50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Signature interaction
              </p>
              <div className="mt-5 rounded-xl border border-grey-5 bg-white p-4">
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
                <div className="mt-5 space-y-3">
                  <div className="rounded-full border border-coral/20 bg-coral/10 px-3 py-2 text-sm text-grey-3">
                    Missing metric
                  </div>
                  <div className="rounded-full border border-coral/20 bg-coral/10 px-3 py-2 text-sm text-grey-3">
                    Missing trade-off
                  </div>
                  <div className="rounded-full border border-green/30 bg-green/20 px-3 py-2 text-sm text-grey-3">
                    Retry 2 of 3 available
                  </div>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-grey-3">
                The STAR cue strip shows what is structurally missing before the user wastes another attempt.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div key={pillar.title} className="paper-panel rounded-xl p-6">
              <div className="inline-flex rounded-sm bg-coral/10 p-2 text-coral">
                <Icon size={18} strokeWidth={1.5} />
              </div>
              <h2 className="mt-5 font-serif text-3xl font-medium tracking-tight">
                {pillar.title}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-grey-3">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
