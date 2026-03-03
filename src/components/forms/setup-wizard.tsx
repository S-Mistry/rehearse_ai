"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Mic2 } from "lucide-react";
import { readApiError } from "@/lib/http/api-response";
import { seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import type { SeniorityLevel, StoredDocumentProfile } from "@/types/rehearse";
import { cn } from "@/lib/utils";

const seniorityLevels = Object.entries(seniorityConfig) as Array<
  [SeniorityLevel, (typeof seniorityConfig)[SeniorityLevel]]
>;

export function SetupWizard({
  documents,
}: {
  documents: StoredDocumentProfile[];
}) {
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>("senior");
  const [cvText, setCvText] = useState("");
  const [jdText, setJdText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<string>("");
  const [selectedJdId, setSelectedJdId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const cvDocuments = documents.filter((document) => document.kind === "cv");
  const jdDocuments = documents.filter((document) => document.kind === "jd");

  async function onSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        const cvProfileId =
          selectedCvId || (await maybeCreateDocument("cv", cvText, cvFile));
        const jdProfileId =
          selectedJdId || (await maybeCreateDocument("jd", jdText, jdFile));

        const sessionResponse = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seniorityLevel,
            cvProfileId,
            jdProfileId,
          }),
        });

        if (!sessionResponse.ok) {
          throw new Error(
            (await readApiError(sessionResponse)) || "Unable to create the rehearsal session.",
          );
        }

        const session = await sessionResponse.json();
        const startResponse = await fetch(`/api/sessions/${session.sessionId}/start`, {
          method: "POST",
        });

        if (!startResponse.ok) {
          throw new Error(
            (await readApiError(startResponse)) || "Unable to start the rehearsal session.",
          );
        }

        const started = await startResponse.json();
        router.push(started.nextRoute);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to start the rehearsal.",
        );
      }
    });
  }

  return (
    <div className="paper-panel rounded-xl p-6 md:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
            Setup
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
            Build the rehearsal context before the first question.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-grey-3">
            Seniority changes the content weighting and the expected scope. CV and JD are optional but help the feedback point to better evidence you already have.
          </p>

          <div className="mt-8 grid gap-4">
            <div>
              <p className="text-sm font-medium text-grey-1">1. Seniority</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {seniorityLevels.map(([value, config]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSeniorityLevel(value)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      seniorityLevel === value
                        ? "border-coral/30 bg-coral/10"
                        : "border-grey-5 bg-white/70 hover:border-coral/20",
                    )}
                  >
                    <p className="text-sm font-medium text-grey-1">{config.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-grey-4">
                      Content x{config.multiplier}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-grey-3">
                      {config.scopeHint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <DocumentPanel
              title="2. Optional CV"
              helper="Upload PDF or DOCX, or paste the text. Structured achievements will be used for leverage suggestions."
              text={cvText}
              onTextChange={setCvText}
              onFileChange={setCvFile}
              documents={cvDocuments}
              selectedDocumentId={selectedCvId}
              onSelectDocument={setSelectedCvId}
            />

            <DocumentPanel
              title="3. Optional JD"
              helper="Upload the role description if you want the coaching margin to call out alignment gaps."
              text={jdText}
              onTextChange={setJdText}
              onFileChange={setJdFile}
              documents={jdDocuments}
              selectedDocumentId={selectedJdId}
              onSelectDocument={setSelectedJdId}
            />
          </div>
        </div>

        <div className="rounded-xl border border-grey-5 bg-body/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
            Before you begin
          </p>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-grey-3">
            <p>
              This MVP uses a controlled voice flow: question audio, your answer, evaluation, then a single nudge if needed.
            </p>
            <p>
              Content and delivery are scored separately. The multiplier only affects content.
            </p>
            <p>
              AI voice guidance can be spoken aloud. All spoken prompts also appear in text.
            </p>
            <p>
              Raw answer audio is processed in-request and not stored by default.
            </p>
          </div>
          {error ? (
            <p className="mt-5 rounded-md border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-grey-3">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-grey-1 px-5 py-3 text-sm text-white transition hover:bg-grey-2 disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle className="animate-spin" size={16} strokeWidth={1.5} />
            ) : (
              <Mic2 size={16} strokeWidth={1.5} />
            )}
            Start the rehearsal
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentPanel({
  title,
  helper,
  text,
  onTextChange,
  onFileChange,
  documents,
  selectedDocumentId,
  onSelectDocument,
}: {
  title: string;
  helper: string;
  text: string;
  onTextChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  documents: StoredDocumentProfile[];
  selectedDocumentId: string;
  onSelectDocument: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
      <p className="text-sm font-medium text-grey-1">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-grey-3">{helper}</p>
      {documents.length > 0 ? (
        <div className="mt-4 rounded-lg border border-grey-5 bg-body/50 p-4">
          <label className="block text-sm font-medium text-grey-1">
            Reuse an existing parsed document
          </label>
          <select
            value={selectedDocumentId}
            onChange={(event) => onSelectDocument(event.target.value)}
            className="mt-3 w-full rounded-lg border border-grey-5 bg-white px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
          >
            <option value="">Use a new upload or pasted text</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.fileName ?? `${document.kind.toUpperCase()} ${document.createdAt.slice(0, 10)}`} · {document.parseStatus}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-grey-4">
            Selecting an existing document skips new upload and text parsing for this step.
          </p>
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_220px]">
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          rows={8}
          disabled={Boolean(selectedDocumentId)}
          className="rounded-lg border border-grey-5 bg-body/50 px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
          placeholder="Paste the document text here if you want a no-upload path."
        />
        <label className="flex cursor-pointer flex-col justify-between rounded-lg border border-dashed border-grey-5 bg-body/40 p-4">
          <div>
            <p className="text-sm font-medium text-grey-1">Upload file</p>
            <p className="mt-2 text-sm leading-relaxed text-grey-3">
              PDF, DOCX, or TXT. Upload overrides the textarea if both are present.
            </p>
          </div>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="mt-4 text-sm text-grey-3"
            disabled={Boolean(selectedDocumentId)}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </div>
  );
}

async function maybeCreateDocument(
  kind: "cv" | "jd",
  text: string,
  file: File | null,
) {
  if (!text.trim() && !file) {
    return null;
  }

  const formData = new FormData();
  if (text.trim()) {
    formData.set("text", text.trim());
  }
  if (file) {
    formData.set("file", file);
  }

  const response = await fetch(`/api/setup/${kind}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await readApiError(response);
    throw new Error(message || `Unable to parse the ${kind.toUpperCase()}.`);
  }

  const payload = await response.json();
  return payload.documentId as string;
}
