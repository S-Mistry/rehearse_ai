import Link from "next/link";
import { BookCheck, CircleUserRound, FileStack, House, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DevRuntimeBadge } from "@/components/layout/dev-runtime-badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/setup", label: "New Rehearsal", icon: Sparkles },
  { href: "/history", label: "History", icon: BookCheck },
  { href: "/profile/documents", label: "Documents", icon: FileStack },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

export function AppShell({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  currentPath?: string;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[250px_1fr] lg:px-8">
      <aside className="space-y-4">
        {process.env.NODE_ENV === "development" ? <DevRuntimeBadge /> : null}
        <div className="paper-panel h-fit rounded-xl p-4">
          <div className="border-b border-grey-5/80 pb-4">
            <p className="font-serif text-2xl font-medium tracking-tight">Rehearse</p>
            <p className="mt-1 text-sm leading-relaxed text-grey-3">
              A rehearsal desk for quantified, strategic behavioural answers.
            </p>
          </div>
          <nav className="mt-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPath?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-3 text-sm transition",
                    active
                      ? "border-coral/30 bg-coral/10 text-grey-1"
                      : "border-transparent text-grey-3 hover:border-grey-5 hover:bg-white/70 hover:text-grey-1",
                  )}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="pb-12">{children}</div>
    </div>
  );
}
