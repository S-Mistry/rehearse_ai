"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CircleStop,
  LoaderCircle,
  Mic,
  PauseCircle,
  Sparkles,
} from "lucide-react";
import { readApiError } from "@/lib/http/api-response";
import type {
  AttemptFeedback,
  ApiErrorResponse,
  EvaluationResult,
  SessionBundle,
  TranscriptProvider,
  EvaluationProvider,
} from "@/types/rehearse";
import { StarCueStrip } from "@/components/question/star-cue-strip";
import { ScoreSheet } from "@/components/feedback/score-sheet";
import { cn, formatScore } from "@/lib/utils";

type SubmissionResponse = {
  flagged?: boolean;
  error?: ApiErrorResponse["error"];
  transcript: string;
  transcriptProvider: TranscriptProvider;
  deliveryMetrics: Record<string, unknown>;
  evaluation: EvaluationResult;
  evaluationProvider: EvaluationProvider;
  feedback: AttemptFeedback;
  questionStatus: "awaiting_retry" | "scored" | "ended_early";
  remainingAttempts: number;
  nextRoute: string | null;
  speech:
    | { available: false }
    | { available: true; mimeType: string; audioBase64: string };
};

export function QuestionWorkspace({
  bundle,
  questionCode,
  supportsVoiceTranscription,
}: {
  bundle: SessionBundle;
  questionCode: string;
  supportsVoiceTranscription: boolean;
}) {
  const currentQuestion = bundle.questions.find(
    (item) => item.questionCode === questionCode,
  )!;
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationResult | null>(
    currentQuestion.evaluations.at(-1)?.reasoningJson ?? null,
  );
  const [latestFeedback, setLatestFeedback] = useState<AttemptFeedback | null>(
    currentQuestion.finalFeedback ?? null,
  );
  const [questionStatus, setQuestionStatus] = useState(currentQuestion.status);
  const [attemptCount, setAttemptCount] = useState(currentQuestion.attemptCount);
  const [remainingAttempts, setRemainingAttempts] = useState(
    Math.max(0, 3 - currentQuestion.attemptCount),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed((current) => {
        if (current >= 210) {
          stopRecording();
          return current;
        }
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  const questionIndex = bundle.questions.findIndex(
    (item) => item.questionCode === questionCode,
  );

  const canRetry = remainingAttempts > 0 && questionStatus === "awaiting_retry";
  const isFinalized =
    questionStatus === "scored" || questionStatus === "ended_early";

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setIsRecording(true);
      setError(null);
    } catch {
      setError("Microphone access was blocked. You can still paste the transcript and submit manually.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function submitAnswer() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        const estimatedDuration =
          elapsed > 0
            ? elapsed
            : Math.max(20, Math.round((transcript.trim().split(/\s+/).length || 0) / 2));
        formData.set("durationSeconds", String(estimatedDuration));
        if (transcript.trim()) {
          formData.set("transcript", transcript.trim());
        }
        if (audioBlob) {
          formData.set("audio", audioBlob, "answer.webm");
        }

        const response = await fetch(
          `/api/questions/${currentQuestion.id}/submit-audio`,
          {
            method: "POST",
            body: formData,
          },
        );

        const payload = (await response.json()) as SubmissionResponse;

        if (!response.ok || payload.flagged) {
          setError(payload.error?.message ?? "Unable to evaluate that answer.");
          return;
        }

        setLatestEvaluation(payload.evaluation);
        setLatestFeedback(payload.feedback);
        setTranscript(payload.transcript);
        setQuestionStatus(payload.questionStatus);
        setAttemptCount((current) => current + 1);
        setRemainingAttempts(payload.remainingAttempts);
        setNotice(
          payload.questionStatus === "awaiting_retry"
            ? "Retry available. Tighten the missing component and resubmit."
            : "Score saved. You can move on or review the summary.",
        );

        if (payload.speech.available) {
          const audio = new Audio(
            `data:${payload.speech.mimeType};base64,${payload.speech.audioBase64}`,
          );
          void audio.play().catch(() => null);
        } else if ("speechSynthesis" in window && payload.feedback?.spokenText) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.feedback.spokenText));
        }

        router.refresh();
      } catch {
        setError("Unable to evaluate that answer right now.");
      }
    });
  }

  function finalizeCurrentQuestion() {
    startTransition(async () => {
      const response = await fetch(`/api/questions/${currentQuestion.id}/finalize`, {
        method: "POST",
      });
      if (!response.ok) {
        setError((await readApiError(response)) || "Unable to finalize this question.");
        return;
      }
      const payload = await response.json();
      setQuestionStatus("ended_early");
      setRemainingAttempts(0);
      router.push(payload.nextRoute);
    });
  }

  const questionRail = useMemo(
    () =>
      bundle.questions.map((question) => ({
        code: question.questionCode,
        title: question.bank.title,
        href: `/session/${bundle.session.id}/question/${question.questionCode}`,
        active: question.questionCode === questionCode,
        done: question.status === "scored" || question.status === "ended_early",
      })),
    [bundle.questions, bundle.session.id, questionCode],
  );

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-6 py-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="paper-panel rounded-xl p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Question set</p>
        <div className="mt-4 space-y-2">
          {questionRail.map((item, index) => (
            <Link
              key={item.code}
              href={item.href}
              className={cn(
                "block rounded-lg border px-3 py-3 transition",
                item.active
                  ? "border-coral/30 bg-coral/10"
                  : item.done
                    ? "border-green/30 bg-green/10"
                    : "border-grey-5 bg-white/70 hover:border-coral/20",
              )}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-grey-4">
                Q{index + 1}
              </p>
              <p className="mt-1 text-sm font-medium text-grey-1">{item.title}</p>
            </Link>
          ))}
        </div>
        <div className="mt-5">
          <StarCueStrip
            question={{ ...currentQuestion, status: questionStatus, attemptCount }}
            compact
          />
        </div>
      </aside>

      <section className="paper-panel rounded-xl p-6 md:p-8">
        <div className="grid-paper rounded-xl border border-grey-5/80 bg-white/55 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                {currentQuestion.bank.category}
              </p>
              <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">
                {currentQuestion.bank.prompt}
              </h1>
            </div>
            <div className="rounded-full border border-grey-5 bg-white/75 px-4 py-2 text-sm text-grey-3">
              {questionIndex + 1} / {bundle.questions.length}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-grey-5 bg-white/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Answer capture
              </p>
              <p className="mt-2 text-sm leading-relaxed text-grey-3">
                Record with the mic, then keep or edit the transcript before evaluation.
              </p>
            </div>
            <div className="rounded-full border border-grey-5 bg-body/70 px-4 py-2 text-sm text-grey-3">
              Timer {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm transition",
                isRecording
                  ? "bg-coral text-white hover:bg-coral-600"
                  : "bg-grey-1 text-white hover:bg-grey-2",
              )}
            >
              {isRecording ? (
                <CircleStop size={16} strokeWidth={1.5} />
              ) : (
                <Mic size={16} strokeWidth={1.5} />
              )}
              {isRecording ? "Stop recording" : "Start recording"}
            </button>
            <button
              type="button"
              onClick={submitAnswer}
              disabled={isPending || (!transcript.trim() && !audioBlob)}
              className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-white/85 px-5 py-3 text-sm transition hover:border-coral/30 hover:text-coral disabled:opacity-50"
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" size={16} strokeWidth={1.5} />
              ) : (
                <Sparkles size={16} strokeWidth={1.5} />
              )}
              Evaluate this answer
            </button>
            {latestEvaluation ? (
              <button
                type="button"
                onClick={finalizeCurrentQuestion}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-body/70 px-5 py-3 text-sm transition hover:border-coral/30 hover:text-coral disabled:opacity-50"
              >
                <PauseCircle size={16} strokeWidth={1.5} />
                Accept score
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-lg border border-grey-5 bg-body/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-grey-1">Transcript</p>
              <p className="text-xs text-grey-4">
                {supportsVoiceTranscription
                  ? "OpenAI voice path available."
                  : "Paste transcript for demo mode or when transcription is unavailable."}
              </p>
            </div>
            <textarea
              rows={11}
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              className="mt-4 w-full rounded-lg border border-grey-5 bg-white px-4 py-3 text-sm text-grey-1 outline-none transition focus:border-coral/40"
              placeholder="Your transcript appears here after recording. You can also paste an answer directly and score it without audio."
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-coral/20 bg-coral/10 px-4 py-3 text-sm text-grey-3">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-4 rounded-md border border-green/30 bg-green/20 px-4 py-3 text-sm text-grey-3">
              {notice}
            </p>
          ) : null}
          {latestFeedback?.cvLeverage?.length ? (
            <div className="mt-4 rounded-md border border-grey-5 bg-white/75 px-4 py-3 text-sm text-grey-3">
              <p className="font-medium text-grey-1">CV leverage</p>
              <ul className="mt-2 space-y-2">
                {latestFeedback.cvLeverage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-6">
        <StarCueStrip
          question={{ ...currentQuestion, status: questionStatus, attemptCount }}
        />
        <ScoreSheet evaluation={latestEvaluation} feedback={latestFeedback} />
        <div className="paper-panel rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
            Coaching margin
          </p>
          {latestEvaluation ? (
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-grey-3">
              <p>
                <span className="font-medium text-grey-1">Latest nudge:</span>{" "}
                {latestEvaluation.nudges[0] ?? "No nudge needed."}
              </p>
              <p>
                <span className="font-medium text-grey-1">Weighted:</span>{" "}
                {formatScore(latestEvaluation.weightedContentScore)} / {formatScore(latestEvaluation.weightedContentMax)}
              </p>
              <p>
                <span className="font-medium text-grey-1">Can retry:</span>{" "}
                {canRetry && !isFinalized ? "Yes" : "No"}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-grey-3">
              After each answer, this margin shows the single highest-priority nudge so the next attempt stays focused.
            </p>
          )}
          {latestEvaluation && remainingAttempts > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (isFinalized) {
                  router.push(latestEvaluation ? `/session/${bundle.session.id}/summary` : `/session/${bundle.session.id}`);
                  return;
                }
                setNotice("Focus the next answer on the missing component called out in the nudge.");
              }}
              className="mt-5 inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
            >
              Prepare next attempt
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
