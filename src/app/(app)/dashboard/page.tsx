import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { listDocuments, listSessionBundles } from "@/lib/rehearse/repositories/memory-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [sessions, documents] = await Promise.all([
    listSessionBundles(),
    listDocuments(),
  ]);

  return <DashboardOverview sessions={sessions} documents={documents} />;
}
