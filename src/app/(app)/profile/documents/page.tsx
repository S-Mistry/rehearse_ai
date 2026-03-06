import { listDocuments } from "@/lib/rehearse/repositories/memory-store";
import type { StoredDocumentProfile } from "@/types/rehearse";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <div className="paper-panel rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Documents</p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
        Your documents
      </h1>
      <div className="mt-6 space-y-4">
        {documents.length === 0 ? (
          <p className="text-sm text-grey-3">No documents yet. Upload a CV or job description when you start a new session.</p>
        ) : (
          documents.map((document: StoredDocumentProfile) => (
            <div key={document.id} className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-grey-1">
                    {document.fileName ?? document.kind.toUpperCase()} · {document.sourceType}
                  </p>
                  <p className="mt-1 text-sm text-grey-3">
                    {document.parseWarnings.length > 0
                      ? document.parseWarnings.join(" ")
                      : "Processed successfully."}
                  </p>
                  <p className="mt-2 text-xs text-grey-4">
                    Status: {document.parseStatus}
                  </p>
                </div>
                <p className="text-xs text-grey-4">{document.createdAt.slice(0, 10)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
