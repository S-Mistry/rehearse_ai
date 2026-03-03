import { SessionShell } from "@/components/layout/session-shell";

export default function SessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionShell>{children}</SessionShell>;
}
