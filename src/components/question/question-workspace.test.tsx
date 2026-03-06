// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuestionWorkspace } from "@/components/question/question-workspace";
import type { SessionBundle } from "@/types/rehearse";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>>) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/components/question/star-cue-strip", () => ({
  StarCueStrip: () => React.createElement("div", null, "star-cue-strip"),
}));

vi.mock("@/components/feedback/score-sheet", () => ({
  ScoreSheet: () => React.createElement("div", null, "score-sheet"),
}));

type FakeRecognitionEvent = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

class FakeAudio {
  static lastSource: string | null = null;
  static playCount = 0;

  src: string;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src: string) {
    this.src = src;
    FakeAudio.lastSource = src;
  }

  pause() {}

  play() {
    FakeAudio.playCount += 1;
    window.setTimeout(() => {
      this.onended?.();
    }, 0);
    return Promise.resolve();
  }
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];

  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream) {
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["fake audio"], { type: this.mimeType }),
    } as BlobEvent);
    this.onstop?.();
  }
}

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  static lastInstance: FakeSpeechRecognition | null = null;

  continuous = false;
  interimResults = false;
  lang = "en-GB";
  onresult: ((event: FakeRecognitionEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeSpeechRecognition.instances.push(this);
    FakeSpeechRecognition.lastInstance = this;
  }

  start() {}

  stop() {
    this.onend?.();
  }
}

function installBrowserMocks({
  speechRecognition = false,
  getUserMediaError = false,
}: {
  speechRecognition?: boolean;
  getUserMediaError?: boolean;
} = {}) {
  FakeAudio.lastSource = null;
  FakeAudio.playCount = 0;
  FakeMediaRecorder.instances = [];
  FakeSpeechRecognition.instances = [];
  FakeSpeechRecognition.lastInstance = null;

  Object.defineProperty(window, "Audio", {
    configurable: true,
    writable: true,
    value: FakeAudio,
  });

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    writable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
    },
  });

  Object.defineProperty(window, "MediaRecorder", {
    configurable: true,
    writable: true,
    value: FakeMediaRecorder,
  });

  Object.defineProperty(window, "SpeechRecognition", {
    configurable: true,
    writable: true,
    value: speechRecognition ? FakeSpeechRecognition : undefined,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    configurable: true,
    writable: true,
    value: speechRecognition ? FakeSpeechRecognition : undefined,
  });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: getUserMediaError
        ? vi.fn().mockRejectedValue(new Error("blocked"))
        : vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }],
          } as unknown as MediaStream),
    },
  });
}

function buildBundle(): SessionBundle {
  return {
    session: {
      id: "session-1",
      userId: "user-1",
      status: "active",
      seniorityLevel: "senior",
      seniorityMultiplier: 1.2,
      targetRoleTitle: "Product Manager",
      targetCompanyName: null,
      cvProfileId: null,
      jdProfileId: null,
      startedAt: null,
      completedAt: null,
      createdAt: "2026-03-03T00:00:00.000Z",
      questionIds: ["question-1"],
    },
    questions: [
      {
        id: "session-question-1",
        sessionId: "session-1",
        questionId: "bank-question-1",
        questionCode: "Q1",
        status: "active",
        attemptCount: 0,
        finalContentRaw: null,
        finalContentCapped: null,
        finalContentWeighted: null,
        deliveryScore: null,
        finalFeedback: null,
        forcedScoringReason: null,
        attempts: [],
        evaluations: [],
        bank: {
          id: "bank-question-1",
          code: "Q1",
          order: 1,
          prompt: "Tell me about a time you led a challenging project.",
          title: "Lead a challenging project",
          category: "Leadership",
          rubricVersion: "v1",
          rubric: {
            score5Signals: [],
            mustInclude: ["situation", "task", "action", "result"],
          },
        },
      },
    ],
    cvProfile: null,
    jdProfile: null,
    aggregate: {
      averageRawContent: 0,
      averageWeightedContent: 0,
      averageWeightedMax: 0,
      averageDelivery: 0,
      strongestQuestionCode: null,
      weakestQuestionCode: null,
      completedQuestions: 0,
      totalQuestions: 1,
    },
  };
}

function buildFetchStub() {
  let scoreRoundCall = 0;

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/intro")) {
      return {
        ok: true,
        json: async () => ({
          text: "Hi, I'm Lucy. I'll ask one question at a time, and I may ask one follow-up before I score your answer. First question: Tell me about a time you led a challenging project.",
          speech: {
            available: true,
            mimeType: "audio/mpeg",
            audioBase64: "ZmFrZQ==",
          },
        }),
      };
    }

    scoreRoundCall += 1;
    if (scoreRoundCall === 1) {
      return {
        ok: true,
        json: async () => ({
          phase: "follow_up",
          transcript: "I led a cross-functional migration.",
          evaluation: {
            finalContentScoreAfterCaps: 3,
            missingComponents: ["result"],
          },
          followUpPrompt:
            "Thanks. One follow-up before I score it: What changed because of your work, and how did you know it worked?",
          conversationTurns: [
            {
              id: "intro",
              speaker: "interviewer",
              text: "Hi, I'm Lucy. I'll ask one question at a time, and I may ask one follow-up before I score your answer. First question: Tell me about a time you led a challenging project.",
              status: "final",
            },
            {
              id: "answer-1",
              speaker: "candidate",
              text: "I led a cross-functional migration.",
              status: "final",
            },
            {
              id: "follow-up",
              speaker: "interviewer",
              text: "Thanks. One follow-up before I score it: What changed because of your work, and how did you know it worked?",
              status: "final",
            },
          ],
          speech: {
            available: true,
            mimeType: "audio/mpeg",
            audioBase64: "ZmFrZQ==",
          },
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        phase: "final",
        transcript:
          "I led a cross-functional migration. We cut onboarding time by 28% and reduced escalation volume.",
        evaluation: {
          finalContentScoreAfterCaps: 4,
          missingComponents: [],
        },
        feedback: {
          verdict: "Strong answer",
          headline: "This answer lands well and feels interview-ready.",
          scoreExplanation: "All the required elements are covered well for this question.",
          strengths: ["You sound like the person who drove the work."],
          improveNext: ["Keep this structure and make the final impact even more specific."],
          deliverySummary: "Delivery was clear.",
          retryPrompt: "Move on.",
          starCoverage: {
            situation: "covered",
            task: "covered",
            action: "covered",
            result: "covered",
          },
          missingElements: [],
          spokenRecap: "Strong answer.",
        },
        questionStatus: "awaiting_retry",
        remainingAttempts: 2,
        nextRoute: "/session/session-1/summary",
        conversationTurns: [
          {
            id: "intro",
            speaker: "interviewer",
            text: "Hi, I'm Lucy. I'll ask one question at a time, and I may ask one follow-up before I score your answer. First question: Tell me about a time you led a challenging project.",
            status: "final",
          },
          {
            id: "answer-1",
            speaker: "candidate",
            text: "I led a cross-functional migration.",
            status: "final",
          },
          {
            id: "follow-up",
            speaker: "interviewer",
            text: "Thanks. One follow-up before I score it: What changed because of your work, and how did you know it worked?",
            status: "final",
          },
          {
            id: "answer-2",
            speaker: "candidate",
            text: "We cut onboarding time by 28% and reduced escalation volume.",
            status: "final",
          },
        ],
        speech: {
          available: true,
          mimeType: "audio/mpeg",
          audioBase64: "ZmFrZQ==",
        },
      }),
    };
  });
}

describe("QuestionWorkspace", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    installBrowserMocks();
    vi.stubGlobal("fetch", buildFetchStub());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses Lucy audio and keeps recording active when live captions are unavailable", async () => {
    render(
      <QuestionWorkspace
        bundle={buildBundle()}
        questionCode="Q1"
        supportsVoiceTranscription
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start interview" }));

    await waitFor(() =>
      expect(screen.getByText("Recording (captions paused)")).toBeTruthy(),
    );

    expect(fetch).toHaveBeenCalledWith("/api/questions/session-question-1/intro", {
      method: "POST",
    });
    expect(FakeAudio.playCount).toBeGreaterThan(0);
    expect(FakeAudio.lastSource).toMatch(/^data:audio\/mpeg;base64,/);
    expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Recording. If captions don't appear, keep speaking. Your answer will be transcribed when you stop.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Editable transcript")).toBeNull();
  });

  it("drops into degraded recording instead of resetting when SpeechRecognition errors", async () => {
    installBrowserMocks({ speechRecognition: true });
    vi.stubGlobal("fetch", buildFetchStub());

    render(
      <QuestionWorkspace
        bundle={buildBundle()}
        questionCode="Q1"
        supportsVoiceTranscription
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start interview" }));

    await waitFor(() => expect(screen.getByText("Recording")).toBeTruthy());

    FakeSpeechRecognition.lastInstance?.onerror?.(new Event("error"));

    await waitFor(() =>
      expect(screen.getByText("Recording (captions paused)")).toBeTruthy(),
    );

    expect(
      screen.getByText(
        "Live captions paused, but recording continues. Keep speaking — your answer will be transcribed when you stop.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "End answer" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("blocks voice practice cleanly when server transcription is unavailable", () => {
    render(
      <QuestionWorkspace
        bundle={buildBundle()}
        questionCode="Q1"
        supportsVoiceTranscription={false}
      />,
    );

    expect(
      screen.getByText(
        "Voice practice needs server transcription enabled before this round can start.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start interview" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("shows a blocking microphone error instead of a typed fallback", async () => {
    installBrowserMocks({ getUserMediaError: true });
    vi.stubGlobal("fetch", buildFetchStub());

    render(
      <QuestionWorkspace
        bundle={buildBundle()}
        questionCode="Q1"
        supportsVoiceTranscription
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start interview" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Microphone access was blocked. Please allow microphone access in your browser settings and try again.",
        ),
      ).toBeTruthy(),
    );

    expect(screen.queryByText("Typed fallback")).toBeNull();
    expect(screen.queryByText("Editable transcript")).toBeNull();
  });

  it("preserves the first answer when a follow-up answer is recorded", async () => {
    installBrowserMocks({ speechRecognition: true });
    vi.stubGlobal("fetch", buildFetchStub());

    render(
      <QuestionWorkspace
        bundle={buildBundle()}
        questionCode="Q1"
        supportsVoiceTranscription
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Start interview" }));
    await waitFor(() => expect(screen.getByText("Recording")).toBeTruthy());

    FakeSpeechRecognition.lastInstance?.onresult?.({
      results: [[{ transcript: "I led a cross-functional migration." }]],
    } as FakeRecognitionEvent);

    await userEvent.click(screen.getByRole("button", { name: "End answer" }));

    await waitFor(() => expect(FakeSpeechRecognition.instances).toHaveLength(2));
    expect(
      screen.getByText(
        "Thanks. One follow-up before I score it: What changed because of your work, and how did you know it worked?",
      ),
    ).toBeTruthy();
    FakeSpeechRecognition.instances[1]?.onresult?.({
      results: [[{ transcript: "We cut onboarding time by 28% and reduced escalation volume." }]],
    } as FakeRecognitionEvent);

    await userEvent.click(screen.getByRole("button", { name: "End answer" }));

    await waitFor(() =>
      expect(
        screen.getByText("We cut onboarding time by 28% and reduced escalation volume."),
      ).toBeTruthy(),
    );

    expect(screen.getByText("I led a cross-functional migration.")).toBeTruthy();
    expect(
      screen.getByText(
        "Thanks. One follow-up before I score it: What changed because of your work, and how did you know it worked?",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Editable transcript")).toBeNull();
  });
});
