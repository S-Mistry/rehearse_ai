"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Mic2 } from "lucide-react";
import { readApiError } from "@/lib/http/api-response";
import { seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import type { SeniorityLevel, StoredDocumentProfile } from "@/types/rehearse";
import { inferSeniorityFromJdDocument } from "@/lib/rehearse/seniority";
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
  const [targetRoleTitle, setTargetRoleTitle] = useState("");
  const [targetCompanyName, setTargetCompanyName] = useState("");
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
  const selectedJdDocument =
    jdDocuments.find((document) => document.id === selectedJdId) ?? null;
  const isUsingJdContext =
    Boolean(selectedJdId) || Boolean(jdText.trim()) || Boolean(jdFile);
  const inferredJdSeniority = inferSeniorityFromJdDocument(selectedJdDocument);
  const requiresManualSeniority = !isUsingJdContext && Boolean(targetRoleTitle.trim());

  async function onSubmit() {
    setError(null);

    startTransition(async () => {
      try {
        if (!isUsingJdContext && !targetRoleTitle.trim()) {
          throw new Error("Please add a job description or enter the target role to continue.");
        }

        const cvDocument =
          (selectedCvId
            ? cvDocuments.find((document) => document.id === selectedCvId) ?? null
            : await maybeCreateDocument("cv", cvText, cvFile)) ?? null;
        const jdDocument =
          (selectedJdId
            ? jdDocuments.find((document) => document.id === selectedJdId) ?? null
            : await maybeCreateDocument("jd", jdText, jdFile)) ?? null;

        const resolvedSeniority =
          inferSeniorityFromJdDocument(jdDocument) ??
          (requiresManualSeniority ? seniorityLevel : null);

        if (!resolvedSeniority) {
          throw new Error(
            "We couldn't detect the seniority from your job description. Please enter the role manually and choose a seniority level.",
          );
        }

        const sessionResponse = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seniorityLevel: resolvedSeniority,
            targetRoleTitle: isUsingJdContext ? null : targetRoleTitle.trim() || null,
            targetCompanyName: targetCompanyName.trim() || null,
            cvProfileId: cvDocument?.id ?? null,
            jdProfileId: jdDocument?.id ?? null,
          }),
        });

        if (!sessionResponse.ok) {
          throw new Error(
            (await readApiError(sessionResponse)) || "Something went wrong creating your session. Please try again.",
          );
        }

        const session = await sessionResponse.json();
        const startResponse = await fetch(`/api/sessions/${session.sessionId}/start`, {
          method: "POST",
        });

        if (!startResponse.ok) {
          throw new Error(
            (await readApiError(startResponse)) || "Something went wrong starting your session. Please try again.",
          );
        }

        const started = await startResponse.json();
        router.push(started.nextRoute);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Something went wrong. Please try again.",
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
            Set up your practice session.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-grey-3">
            Add a job description and we&apos;ll detect the role and seniority for you. If you don&apos;t have one, enter the role manually below.
          </p>

          <div className="mt-8 grid gap-4">
            <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
              <p className="text-sm font-medium text-grey-1">1. Interview context</p>
              <p className="mt-2 text-sm leading-relaxed text-grey-3">
                Enter the role you&apos;re interviewing for. If you add a job description below, this is filled in automatically. Company is optional.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-grey-1">Target role</span>
                  <input
                    value={targetRoleTitle}
                    onChange={(event) => setTargetRoleTitle(event.target.value)}
                    disabled={isUsingJdContext}
                    className="mt-3 w-full rounded-lg border border-grey-5 bg-white px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
                    placeholder={
                      isUsingJdContext
                        ? "Detected from your job description"
                        : "e.g. Senior Product Manager"
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-grey-1">Company</span>
                  <input
                    value={targetCompanyName}
                    onChange={(event) => setTargetCompanyName(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-grey-5 bg-white px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
                    placeholder="Optional"
                  />
                </label>
              </div>
              {isUsingJdContext ? (
                <p className="mt-4 rounded-md border border-green/30 bg-green/20 px-4 py-3 text-sm text-grey-3">
                  Job description found. The role and seniority will be set automatically.
                  {inferredJdSeniority
                    ? ` Detected seniority: ${seniorityConfig[inferredJdSeniority].label}.`
                    : ""}
                </p>
              ) : null}
            </div>

            {requiresManualSeniority ? (
              <div>
                <p className="text-sm font-medium text-grey-1">2. Seniority</p>
                <p className="mt-2 text-sm leading-relaxed text-grey-3">
                  Choose the seniority level for your target role. Your answers will be scored against expectations for this level.
                </p>
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
                        Scoring: x{config.multiplier}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-grey-3">
                        {config.scopeHint}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <DocumentPanel
              title="3. Your CV (optional)"
              helper="Upload or paste your CV. Your achievements will be suggested as evidence during practice."
              text={cvText}
              onTextChange={setCvText}
              onFileChange={setCvFile}
              documents={cvDocuments}
              selectedDocumentId={selectedCvId}
              onSelectDocument={setSelectedCvId}
            />

            <DocumentPanel
              title="4. Job description (optional)"
              helper="Upload or paste the job description. This sets your role, seniority, and tailors the questions to the position."
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
              Lucy (your interviewer) asks one question at a time and may ask a follow-up before scoring your answer.
            </p>
            <p>
              If you added a job description, the role and seniority are set automatically.
            </p>
            <p>
              You&apos;ll see a live transcript of your answer as you speak. Make sure to allow microphone access when prompted.
            </p>
            <p>
              After each answer, you get plain-English feedback on what worked and what to improve.
            </p>
            <p>
              Your audio is used only to transcribe your answer and is not saved.
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
            Start practicing
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
            Use a saved document
          </label>
          <select
            value={selectedDocumentId}
            onChange={(event) => onSelectDocument(event.target.value)}
            className="mt-3 w-full rounded-lg border border-grey-5 bg-white px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
          >
            <option value="">Upload or paste new text instead</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.fileName ?? `${document.kind.toUpperCase()} ${document.createdAt.slice(0, 10)}`} · {document.parseStatus}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-grey-4">
            Choosing a saved document will skip the upload below.
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
          placeholder="Or paste the text here instead of uploading a file."
        />
        <label className="flex cursor-pointer flex-col justify-between rounded-lg border border-dashed border-grey-5 bg-body/40 p-4">
          <div>
            <p className="text-sm font-medium text-grey-1">Upload file</p>
            <p className="mt-2 text-sm leading-relaxed text-grey-3">
              PDF, DOCX, or TXT. If you upload a file, it takes priority over pasted text.
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
  return payload.document as StoredDocumentProfile;
}
