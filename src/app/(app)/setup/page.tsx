import { listDocuments } from "@/lib/rehearse/repositories/memory-store";
import { SetupWizard } from "@/components/forms/setup-wizard";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const documents = await listDocuments();

  return <SetupWizard documents={documents} />;
}
