export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <div className="paper-panel rounded-xl p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Privacy</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          Data handling for rehearsal sessions
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-grey-3">
          <p>Transcripts, scores, and structured document summaries are stored to support session replay and review.</p>
          <p>Raw answer audio is processed in-request and not persisted by default.</p>
          <p>CV and JD files are intended for private storage with user-scoped access controls when Supabase is configured.</p>
        </div>
      </div>
    </div>
  );
}
