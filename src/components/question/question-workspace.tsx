"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CircleStop,
  LoaderCircle,
  Mic,
  Sparkles,
} from "lucide-react";
import { readApiError } from "@/lib/http/api-response";
import {
  buildInterviewerFeedback,
  buildInterviewerIntro,
  interviewerName,
} from "@/lib/rehearse/interview/interviewer-persona";
import type {
  AttemptFeedback,
  ApiErrorResponse,
  ConversationTurn,
  EvaluationResult,
  SessionBundle,
} from "@/types/rehearse";
import { StarCueStrip } from "@/components/question/star-cue-strip";
import { ScoreSheet } from "@/components/feedback/score-sheet";
import { cn } from "@/lib/utils";

type SpeechResponse =
  | { available: false }
  | { available: true; mimeType: string; audioBase64: string };

type ScoreRoundResponse = {
  flagged?: boolean;
  error?: ApiErrorResponse["error"];
  phase: "follow_up" | "final";
  transcript: string;
  evaluation: EvaluationResult;
  followUpPrompt?: string | null;
  feedback?: AttemptFeedback;
  questionStatus?: "awaiting_retry" | "scored" | "ended_early";
  remainingAttempts?: number;
  nextRoute?: string | null;
  conversationTurns?: ConversationTurn[];
  speech?: SpeechResponse;
};

type IntroSpeechResponse = {
  text: string;
  speech: SpeechResponse;
};

type InterviewState =
  | "idle"
  | "interviewer_speaking"
  | "arming_mic"
  | "recording"
  | "recording_degraded"
  | "scoring"
  | "feedback";

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [capabilitiesReady, setCapabilitiesReady] = useState(false);
  const [recognitionAvailable, setRecognitionAvailable] = useState(false);
  const [captureAvailable, setCaptureAvailable] = useState(false);
  const [interviewState, setInterviewState] = useState<InterviewState>("idle");
  const [questionStatus, setQuestionStatus] = useState(currentQuestion.status);
  const [attemptCount, setAttemptCount] = useState(currentQuestion.attemptCount);
  const [remainingAttempts, setRemainingAttempts] = useState(
    Math.max(0, 3 - currentQuestion.attemptCount),
  );
  const [followUpCount, setFollowUpCount] = useState(0);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>(
    currentQuestion.attempts.at(-1)?.conversationTurns ?? [],
  );
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationResult | null>(
    currentQuestion.evaluations.at(-1)?.reasoningJson ?? null,
  );
  const [latestFeedback, setLatestFeedback] = useState<AttemptFeedback | null>(
    currentQuestion.finalFeedback ?? null,
  );
  const [latestNextRoute, setLatestNextRoute] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderMimeTypeRef = useRef("audio/webm");
  const stopRecorderResolverRef = useRef<((blob: Blob | null) => void) | null>(null);
  const activeSpeechAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasActiveRoundRef = useRef(false);
  const activeAnswerTurnIdRef = useRef<string | null>(null);

  const questionIndex = bundle.questions.findIndex(
    (item) => item.questionCode === questionCode,
  );
  const canRetry = remainingAttempts > 0 && questionStatus === "awaiting_retry";
  const isFinalized = questionStatus === "scored" || questionStatus === "ended_early";
  const isCaptureActive =
    interviewState === "recording" || interviewState === "recording_degraded";

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
    setRecognitionAvailable(Boolean(Recognition));
    setCaptureAvailable(
      typeof window.MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
    setCapabilitiesReady(true);
  }, []);

  useEffect(() => {
    if (!isCaptureActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isCaptureActive]);

  useEffect(
    () => () => {
      stopSpeechPlayback();
      stopBrowserRecognition();
      cleanupRecorder(true);
    },
    [],
  );

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

  function createTurn(
    speaker: ConversationTurn["speaker"],
    text: string,
    status: "partial" | "final" = "final",
  ): ConversationTurn {
    return {
      id: `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      speaker,
      text,
      status,
      createdAt: new Date().toISOString(),
    };
  }

  function beginCandidateTurn() {
    const turn = createTurn("candidate", "", "partial");
    activeAnswerTurnIdRef.current = turn.id;
    setConversationTurns((current) => [...current, turn]);
    return turn.id;
  }

  function updateCandidateTurn(
    turnId: string | null,
    text: string,
    status: "partial" | "final",
  ) {
    if (!turnId) {
      return;
    }

    setConversationTurns((current) =>
      current.map((turn) =>
        turn.id === turnId && turn.speaker === "candidate"
          ? {
              ...turn,
              text,
              status,
            }
          : turn,
      ),
    );
  }

  function resolveCandidateTurnText(turns: ConversationTurn[], turnId: string | null) {
    if (!turnId) {
      return "";
    }

    return (
      turns.find((turn) => turn.id === turnId && turn.speaker === "candidate")?.text.trim() ?? ""
    );
  }

  function finalizeLocalTurns(turns: ConversationTurn[], turnId: string | null) {
    return turns.map((turn) => {
      if (turn.id === turnId && turn.speaker === "candidate") {
        return {
          ...turn,
          text: turn.text.trim(),
          status: "final" as const,
        };
      }

      if (turn.status === "partial") {
        return {
          ...turn,
          text: turn.text.trim(),
          status: "final" as const,
        };
      }

      return turn;
    });
  }

  function stopSpeechPlayback() {
    activeSpeechAudioRef.current?.pause();
    activeSpeechAudioRef.current = null;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function playSpeech(
    speech: SpeechResponse | undefined,
    fallbackText: string,
    onEnd?: () => void,
  ) {
    stopSpeechPlayback();

    if (speech?.available) {
      const audio = new Audio(`data:${speech.mimeType};base64,${speech.audioBase64}`);
      activeSpeechAudioRef.current = audio;
      audio.onended = () => {
        activeSpeechAudioRef.current = null;
        onEnd?.();
      };
      audio.onerror = () => {
        activeSpeechAudioRef.current = null;
        speakText(fallbackText, onEnd);
      };
      void audio.play().catch(() => {
        activeSpeechAudioRef.current = null;
        speakText(fallbackText, onEnd);
      });
      return;
    }

    speakText(fallbackText, onEnd);
  }

  function speakText(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utterance);
  }

  function stopBrowserRecognition() {
    hasActiveRoundRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  function handleLiveTranscriptDrop() {
    setInterviewState((current) =>
      current === "recording" ? "recording_degraded" : current,
    );
    setNotice(
      "Live captions paused, but recording continues. Keep speaking — your answer will be transcribed when you stop.",
    );
  }

  function startBrowserRecognition(answerTurnId: string) {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
    if (!Recognition) {
      return false;
    }

    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (!transcript) {
        return;
      }

      updateCandidateTurn(answerTurnId, transcript, "partial");
    };
    recognition.onerror = () => {
      if (hasActiveRoundRef.current) {
        handleLiveTranscriptDrop();
      }
    };
    recognition.onend = () => {
      if (hasActiveRoundRef.current) {
        handleLiveTranscriptDrop();
      }
    };

    recognitionRef.current = recognition;
    hasActiveRoundRef.current = true;
    recognition.start();
    return true;
  }

  function cleanupRecorder(forceStop = false) {
    const recorder = mediaRecorderRef.current;
    if (forceStop && recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    stopRecorderResolverRef.current = null;
  }

  async function startCapture() {
    setError(null);
    setElapsed(0);
    setInterviewState("arming_mic");
    audioChunksRef.current = [];

    if (!supportsVoiceTranscription) {
      setInterviewState("idle");
      setError("Voice practice is not available right now.");
      return;
    }

    if (!captureAvailable) {
      setInterviewState("idle");
      setError(
        "Microphone is not available. Please use a browser that supports microphone access.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorderMimeTypeRef.current = recorder.mimeType || "audio/webm";
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob =
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, {
                type: recorderMimeTypeRef.current,
              })
            : null;
        const resolver = stopRecorderResolverRef.current;
        stopRecorderResolverRef.current = null;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        resolver?.(blob);
      };
      recorder.start();

      const answerTurnId = beginCandidateTurn();
      const hasLiveTranscript = recognitionAvailable && startBrowserRecognition(answerTurnId);
      if (hasLiveTranscript) {
        setInterviewState("recording");
        setNotice("Recording. Speak naturally — you'll see a live transcript.");
      } else {
        setInterviewState("recording_degraded");
        setNotice(
          "Recording. If captions don't appear, keep speaking. Your answer will be transcribed when you stop.",
        );
      }
    } catch {
      activeAnswerTurnIdRef.current = null;
      setInterviewState("idle");
      setError(
        "Microphone access was blocked. Please allow microphone access in your browser settings and try again.",
      );
    }
  }

  async function stopCapture() {
    stopBrowserRecognition();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupRecorder();
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      stopRecorderResolverRef.current = resolve;
      recorder.stop();
    });

    if (!blob || blob.size === 0) {
      return null;
    }

    return new File([blob], `answer.${inferAudioExtension(blob.type)}`, {
      type: blob.type || recorderMimeTypeRef.current,
    });
  }

  async function requestIntroSpeech() {
    const fallbackText = buildInterviewerIntro(currentQuestion.bank);

    try {
      const response = await fetch(`/api/questions/${currentQuestion.id}/intro`, {
        method: "POST",
      });
      if (!response.ok) {
        return {
          text: fallbackText,
          speech: { available: false } as SpeechResponse,
        };
      }

      const payload = (await response.json()) as IntroSpeechResponse;
      return {
        text: payload.text || fallbackText,
        speech: payload.speech,
      };
    } catch {
      return {
        text: fallbackText,
        speech: { available: false } as SpeechResponse,
      };
    }
  }

  function startInterview() {
    if (!supportsVoiceTranscription) {
      setError("Voice practice is not available right now.");
      return;
    }

    stopSpeechPlayback();
    stopBrowserRecognition();
    cleanupRecorder(true);

    setError(null);
    setNotice(null);
    setLatestEvaluation(null);
    setLatestFeedback(null);
    setLatestNextRoute(null);
    setFollowUpCount(0);
    setElapsed(0);
    activeAnswerTurnIdRef.current = null;

    const introText = buildInterviewerIntro(currentQuestion.bank);
    setConversationTurns([createTurn("interviewer", introText)]);
    setInterviewState("interviewer_speaking");

    void requestIntroSpeech().then((payload) => {
      playSpeech(payload.speech, payload.text, () => {
        void startCapture();
      });
    });
  }

  function submitRound(phase: "probe" | "final") {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const activeAnswerTurnId = activeAnswerTurnIdRef.current;
        const finalTurns = finalizeLocalTurns(conversationTurns, activeAnswerTurnId);
        const localDraft = resolveCandidateTurnText(finalTurns, activeAnswerTurnId);
        setConversationTurns(finalTurns);
        setInterviewState("scoring");
        const audioFile = await stopCapture();
        activeAnswerTurnIdRef.current = null;
        const durationSeconds =
          elapsed > 0
            ? elapsed
            : Math.max(20, Math.round((localDraft.split(/\s+/).length || 0) / 2));

        const response = audioFile
          ? await submitAudioRound({
              sessionQuestionId: currentQuestion.id,
              audioFile,
              conversationTurns: finalTurns,
              durationSeconds,
              phase,
              followUpCount,
              activeAnswerTurnId,
              transcript: localDraft || undefined,
            })
          : await submitTranscriptRound({
              sessionQuestionId: currentQuestion.id,
              conversationTurns: finalTurns,
              durationSeconds,
              phase,
              followUpCount,
              activeAnswerTurnId,
              transcript: localDraft || undefined,
            });

        const payload = (await response.json()) as ScoreRoundResponse;
        if (!response.ok || payload.flagged) {
          setError(payload.error?.message ?? "Something went wrong scoring your answer. Please try again.");
          setInterviewState("idle");
          return;
        }

        if (payload.phase === "follow_up" && payload.followUpPrompt) {
          setLatestEvaluation(payload.evaluation);
          setConversationTurns(payload.conversationTurns ?? finalTurns);
          setFollowUpCount(1);
          setNotice(`${interviewerName} has a follow-up question before scoring.`);
          setInterviewState("interviewer_speaking");
          playSpeech(payload.speech, payload.followUpPrompt, () => {
            void startCapture();
          });
          return;
        }

        setLatestEvaluation(payload.evaluation);
        setLatestFeedback(payload.feedback ?? null);
        setConversationTurns(payload.conversationTurns ?? finalTurns);
        setQuestionStatus(payload.questionStatus ?? "awaiting_retry");
        setAttemptCount((current) => current + 1);
        setRemainingAttempts(payload.remainingAttempts ?? remainingAttempts);
        setLatestNextRoute(payload.nextRoute ?? null);
        setNotice(
          payload.questionStatus === "awaiting_retry"
            ? payload.feedback?.retryPrompt ??
                "Try the question again with the missing detail filled in."
            : "Answer scored. Move to the next question when you're ready.",
        );
        setInterviewState("feedback");
        playSpeech(
          payload.speech,
          payload.feedback ? buildInterviewerFeedback(payload.feedback.spokenRecap) : "",
        );
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
        activeAnswerTurnIdRef.current = null;
        setInterviewState("idle");
      }
    });
  }

  function continueFromRound() {
    startTransition(async () => {
      if (!canRetry || isFinalized) {
        router.push(latestNextRoute ?? `/session/${bundle.session.id}/summary`);
        return;
      }

      const response = await fetch(`/api/questions/${currentQuestion.id}/finalize`, {
        method: "POST",
      });
      if (!response.ok) {
        setError((await readApiError(response)) || "Unable to continue to the next question.");
        return;
      }

      const payload = await response.json();
      setQuestionStatus("ended_early");
      setRemainingAttempts(0);
      router.push(payload.nextRoute);
    });
  }

  const statusLabel = (() => {
    switch (interviewState) {
      case "interviewer_speaking":
        return `${interviewerName} speaking`;
      case "arming_mic":
        return "Preparing microphone";
      case "recording":
        return "Recording";
      case "recording_degraded":
        return "Recording (captions paused)";
      case "scoring":
        return "Scoring";
      case "feedback":
        return "Feedback ready";
      default:
        return "Ready";
    }
  })();

  const transcriptHelperText = (() => {
    if (!supportsVoiceTranscription) {
      return "Voice practice needs server transcription enabled before this round can start.";
    }

    if (isCaptureActive && interviewState === "recording") {
      return `Live captions are active while ${interviewerName} records your answer.`;
    }

    if (isCaptureActive && interviewState === "recording_degraded") {
      return `${interviewerName} is still recording. Captions may be delayed until the answer is transcribed after stop.`;
    }

    if (captureAvailable && recognitionAvailable) {
      return "Live captions are a browser enhancement. If they drop, recording still continues and the answer is transcribed after you stop.";
    }

    if (captureAvailable) {
      return `${interviewerName} can still record your answer even if live browser captions are unavailable here.`;
    }

    if (capabilitiesReady) {
      return "Voice practice requires microphone capture in a supported browser.";
    }

    return "Checking microphone and caption support for this round.";
  })();

  const endAnswerDisabled =
    isPending ||
    interviewState === "idle" ||
    interviewState === "interviewer_speaking" ||
    interviewState === "arming_mic" ||
    interviewState === "scoring" ||
    !isCaptureActive;

  const startInterviewDisabled =
    !supportsVoiceTranscription ||
    (capabilitiesReady && !captureAvailable) ||
    isPending ||
    interviewState === "interviewer_speaking" ||
    interviewState === "arming_mic" ||
    interviewState === "recording" ||
    interviewState === "recording_degraded" ||
    interviewState === "scoring";

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-6 py-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
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
      </aside>

      <section className="paper-panel rounded-xl p-6 md:p-8">
        <div className="rounded-xl border border-grey-5 bg-white/70 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                {currentQuestion.bank.category}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight md:text-4xl">
                {currentQuestion.bank.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-grey-3">
                {interviewerName} will ask the question, may follow up once, then score your answer.
              </p>
            </div>
            <div className="space-y-3">
              <div className="rounded-full border border-grey-5 bg-body/70 px-4 py-2 text-sm text-grey-3">
                {questionIndex + 1} / {bundle.questions.length}
              </div>
              <div className="rounded-full border border-grey-5 bg-body/70 px-4 py-2 text-sm text-grey-3">
                {statusLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-grey-5 bg-white/65 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-grey-4">
                Conversation transcript
              </p>
              <p className="mt-2 text-sm leading-relaxed text-grey-3">
                {transcriptHelperText}
              </p>
            </div>
            <div className="rounded-full border border-grey-5 bg-body/70 px-4 py-2 text-sm text-grey-3">
              Timer {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>

          <div className="mt-5 h-[420px] overflow-y-auto rounded-xl border border-grey-5 bg-body/40 p-4">
            {conversationTurns.length > 0 ? (
              <div className="space-y-3">
                {conversationTurns.map((turn) => (
                  <div
                    key={turn.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      turn.speaker === "interviewer"
                        ? "border border-grey-5 bg-white text-grey-1"
                        : turn.speaker === "candidate"
                          ? "ml-auto bg-grey-1 text-white"
                          : "border border-coral/20 bg-coral/10 text-grey-1",
                    )}
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] opacity-75">
                      {turn.speaker === "interviewer"
                        ? interviewerName
                        : turn.speaker === "candidate"
                          ? "You"
                          : "System"}
                      {turn.status === "partial" ? " · live" : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap">
                      {turn.text || "Listening..."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-grey-3">
                Press &ldquo;Start interview&rdquo; below. {interviewerName} will ask the question, then it&rsquo;s your turn to answer.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startInterview}
              disabled={startInterviewDisabled}
              className="inline-flex items-center gap-2 rounded-full bg-grey-1 px-5 py-3 text-sm text-white transition hover:bg-grey-2 disabled:opacity-50"
            >
              <Mic size={16} strokeWidth={1.5} />
              {conversationTurns.length > 0 && latestFeedback ? "Try again" : "Start interview"}
            </button>
            <button
              type="button"
              onClick={() => submitRound(followUpCount === 0 ? "probe" : "final")}
              disabled={endAnswerDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-white/85 px-5 py-3 text-sm transition hover:border-coral/30 hover:text-coral disabled:opacity-50"
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" size={16} strokeWidth={1.5} />
              ) : (
                <CircleStop size={16} strokeWidth={1.5} />
              )}
              End answer
            </button>
            {latestFeedback ? (
              <>
                <button
                  type="button"
                  onClick={continueFromRound}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-grey-5 bg-body/70 px-5 py-3 text-sm transition hover:border-coral/30 hover:text-coral disabled:opacity-50"
                >
                  <ArrowRight size={16} strokeWidth={1.5} />
                  Continue
                </button>
              </>
            ) : null}
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
        </div>
      </section>

      <aside className="space-y-6">
        <StarCueStrip feedback={latestFeedback} attemptCount={attemptCount} />
        <ScoreSheet evaluation={latestEvaluation} feedback={latestFeedback} />
        {latestFeedback ? (
          <div className="paper-panel rounded-xl p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-grey-4">What to improve</p>
            <p className="mt-4 text-sm leading-relaxed text-grey-3">
              {latestFeedback.retryPrompt}
            </p>
            {latestFeedback.missingElements.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {latestFeedback.missingElements.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-coral/20 bg-coral/10 px-3 py-1 text-xs text-grey-3"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
            {canRetry ? (
              <button
                type="button"
                onClick={startInterview}
                className="mt-5 inline-flex items-center gap-2 text-sm text-grey-3 transition hover:text-coral"
              >
                Try again
                <Sparkles size={14} strokeWidth={1.5} />
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

async function submitAudioRound(input: {
  sessionQuestionId: string;
  audioFile: File;
  conversationTurns: ConversationTurn[];
  durationSeconds: number;
  phase: "probe" | "final";
  followUpCount: number;
  activeAnswerTurnId?: string | null;
  transcript?: string;
}) {
  const formData = new FormData();
  formData.set("audio", input.audioFile);
  formData.set("conversationTurns", JSON.stringify(input.conversationTurns));
  formData.set("durationSeconds", String(input.durationSeconds));
  formData.set("phase", input.phase);
  formData.set("followUpCount", String(input.followUpCount));
  if (input.activeAnswerTurnId) {
    formData.set("activeAnswerTurnId", input.activeAnswerTurnId);
  }
  if (input.transcript?.trim()) {
    formData.set("transcript", input.transcript.trim());
  }

  return fetch(`/api/questions/${input.sessionQuestionId}/score-round`, {
    method: "POST",
    body: formData,
  });
}

async function submitTranscriptRound(input: {
  sessionQuestionId: string;
  conversationTurns: ConversationTurn[];
  durationSeconds: number;
  phase: "probe" | "final";
  followUpCount: number;
  activeAnswerTurnId?: string | null;
  transcript?: string;
}) {
  return fetch(`/api/questions/${input.sessionQuestionId}/score-round`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationTurns: input.conversationTurns,
      durationSeconds: input.durationSeconds,
      phase: input.phase,
      followUpCount: input.followUpCount,
      activeAnswerTurnId: input.activeAnswerTurnId,
      transcript: input.transcript,
    }),
  });
}

function inferAudioExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }
  if (mimeType.includes("mpeg")) {
    return "mp3";
  }
  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}
