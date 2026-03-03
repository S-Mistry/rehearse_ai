import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { listDocuments, listSessionBundles } from "@/lib/rehearse/repositories/memory-store";

export default function DashboardPage() {
  const sessions = listSessionBundles();
  const documents = listDocuments();

  return <DashboardOverview sessions={sessions} documents={documents} />;
}
