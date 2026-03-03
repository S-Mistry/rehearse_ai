import { listDocuments } from "@/lib/rehearse/repositories/memory-store";

export default function DocumentsPage() {
  const documents = listDocuments();

  return (
    <div className="paper-panel rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Documents</p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
        Structured CV and JD profiles
      </h1>
      <div className="mt-6 space-y-4">
        {documents.length === 0 ? (
          <p className="text-sm text-grey-3">No documents have been added yet.</p>
        ) : (
          documents.map((document) => (
            <div key={document.id} className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-grey-1">
                    {document.kind.toUpperCase()} · {document.sourceType}
                  </p>
                  <p className="mt-1 text-sm text-grey-3">
                    {document.parseWarnings.length > 0
                      ? document.parseWarnings.join(" ")
                      : "Parsed without warnings."}
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
