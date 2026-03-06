export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <div className="paper-panel rounded-xl p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Privacy</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          How we handle your data
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-grey-3">
          <p>Your transcripts, scores, and document summaries are stored so you can review past sessions.</p>
          <p>Your voice recordings are used only for transcription and are not saved.</p>
          <p>Your CV and job description files are stored privately and only accessible to you.</p>
        </div>
      </div>
    </div>
  );
}
