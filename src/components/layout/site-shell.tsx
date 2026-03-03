import Link from "next/link";
import { FileText, LayoutDashboard } from "lucide-react";
import { appMode } from "@/lib/env";
import { cn } from "@/lib/utils";
import { DevRuntimeBadge } from "@/components/layout/dev-runtime-badge";

export function SiteShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen", className)}>
      <header className="sticky top-0 z-20 border-b border-grey-5/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-sm border border-coral/20 bg-coral/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-coral">
              RH
            </div>
            <div>
              <p className="font-serif text-xl font-medium tracking-tight text-grey-1">
                Rehearse
              </p>
              <p className="text-xs text-grey-3">Behavioural interview desk</p>
            </div>
          </Link>
          <nav className="flex items-center gap-3 text-sm text-grey-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-grey-5/80 px-4 py-2 transition hover:border-coral/40 hover:text-coral"
            >
              Dashboard
            </Link>
            <Link
              href="/setup"
              className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-4 py-2 text-white transition hover:bg-grey-2"
            >
              <LayoutDashboard size={16} strokeWidth={1.5} />
              Start rehearsal
            </Link>
          </nav>
        </div>
      </header>
      {!appMode.hasOpenAI || !appMode.hasSupabaseClient ? (
        <div className="border-b border-coral/20 bg-coral/10">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-grey-3 md:px-8">
            <FileText size={14} strokeWidth={1.5} className="text-coral" />
            Running in review mode. Voice transcription, TTS, and auth use graceful fallbacks until OpenAI and Supabase env vars are configured.
          </div>
        </div>
      ) : null}
      {process.env.NODE_ENV === "development" ? (
        <div className="mx-auto flex max-w-7xl justify-end px-4 pt-4 md:px-8">
          <DevRuntimeBadge />
        </div>
      ) : null}
      <main>{children}</main>
    </div>
  );
}
