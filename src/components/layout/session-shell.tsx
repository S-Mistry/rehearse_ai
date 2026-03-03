import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SessionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-grey-5 bg-white/80 px-6 py-3 backdrop-blur-md">
        <p className="font-serif text-xl font-semibold tracking-tight">
          Rehearse
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-grey-1"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          Exit session
        </Link>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
