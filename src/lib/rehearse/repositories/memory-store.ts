import { randomUUID } from "crypto";
import {
  type AttemptFeedback,
  type DeliveryMetrics,
  type EvaluationRecord,
  type EvaluationResult,
  type QuestionCode,
  type SeniorityLevel,
  type SessionAggregate,
  type SessionBundle,
  type SessionQuestionRecord,
  type SessionRecord,
  type StoredDocumentProfile,
  type TranscriptAttemptRecord,
} from "@/types/rehearse";
import { questionBank, seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import { evaluateAnswerHeuristically } from "@/lib/rehearse/scoring/evaluate-answer";

type StoreShape = {
  userId: string;
  documents: StoredDocumentProfile[];
  sessions: SessionRecord[];
  sessionQuestions: SessionQuestionRecord[];
};

declare global {
  var __rehearseStore: StoreShape | undefined;
}

function getStore(): StoreShape {
  if (!globalThis.__rehearseStore) {
    globalThis.__rehearseStore = seedStore();
  }

  return globalThis.__rehearseStore;
}

export const DEMO_USER_ID = "demo-user";

export function listDocuments(kind?: "cv" | "jd") {
  const store = getStore();
  return store.documents.filter((document) => (kind ? document.kind === kind : true));
}

export function createDocument(
  input: Omit<StoredDocumentProfile, "id" | "userId" | "createdAt">,
) {
  const store = getStore();
  const document: StoredDocumentProfile = {
    id: randomUUID(),
    userId: DEMO_USER_ID,
    createdAt: new Date().toISOString(),
    ...input,
  };
  store.documents.unshift(document);
  return document;
}

export function createSession(input: {
  seniorityLevel: SeniorityLevel;
  cvProfileId: string | null;
  jdProfileId: string | null;
}) {
  const store = getStore();
  const sessionId = randomUUID();
  const session: SessionRecord = {
    id: sessionId,
    userId: DEMO_USER_ID,
    status: "ready",
    seniorityLevel: input.seniorityLevel,
    seniorityMultiplier: seniorityConfig[input.seniorityLevel].multiplier,
    cvProfileId: input.cvProfileId,
    jdProfileId: input.jdProfileId,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    questionIds: [],
  };

  const questions = questionBank.map((bankQuestion) => {
    const question: SessionQuestionRecord = {
      id: randomUUID(),
      sessionId,
      questionId: bankQuestion.id,
      questionCode: bankQuestion.code,
      status: bankQuestion.order === 1 ? "active" : "pending",
      attemptCount: 0,
      finalContentRaw: null,
      finalContentCapped: null,
      finalContentWeighted: null,
      deliveryScore: null,
      finalFeedback: null,
      forcedScoringReason: null,
      attempts: [],
      evaluations: [],
    };
    session.questionIds.push(question.id);
    return question;
  });

  store.sessions.unshift(session);
  store.sessionQuestions.push(...questions);

  return session;
}

export function startSession(sessionId: string) {
  const store = getStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return null;
  }

  session.status = "active";
  session.startedAt = session.startedAt ?? new Date().toISOString();
  return session;
}

export function getSessionBundle(sessionId: string): SessionBundle | null {
  const store = getStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return null;
  }

  const questions = store.sessionQuestions
    .filter((item) => item.sessionId === sessionId)
    .sort((left, right) => {
      const leftOrder =
        questionBank.find((question) => question.code === left.questionCode)?.order ?? 0;
      const rightOrder =
        questionBank.find((question) => question.code === right.questionCode)?.order ?? 0;
      return leftOrder - rightOrder;
    })
    .map((question) => ({
      ...question,
      bank: questionBank.find((item) => item.code === question.questionCode)!,
    }));

  const cvProfile = session.cvProfileId
    ? store.documents.find((item) => item.id === session.cvProfileId) ?? null
    : null;
  const jdProfile = session.jdProfileId
    ? store.documents.find((item) => item.id === session.jdProfileId) ?? null
    : null;

  return {
    session,
    questions,
    cvProfile,
    jdProfile,
    aggregate: computeAggregate(questions),
  };
}

export function listSessionBundles() {
  return getStore()
    .sessions.map((session) => getSessionBundle(session.id))
    .filter(Boolean) as SessionBundle[];
}

export function getSessionQuestionByCode(sessionId: string, questionCode: QuestionCode) {
  return getStore().sessionQuestions.find(
    (item) => item.sessionId === sessionId && item.questionCode === questionCode,
  );
}

export function getSessionQuestion(sessionQuestionId: string) {
  return getStore().sessionQuestions.find((item) => item.id === sessionQuestionId) ?? null;
}

export function submitQuestionAttempt(input: {
  sessionQuestionId: string;
  transcriptText: string;
  durationSeconds: number;
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
}) {
  const store = getStore();
  const question = store.sessionQuestions.find((item) => item.id === input.sessionQuestionId);
  if (!question) {
    return null;
  }

  question.attemptCount += 1;
  const attemptIndex = question.attemptCount;
  const metrics = computeDeliveryMetrics(input.transcriptText, input.durationSeconds);

  const attempt: TranscriptAttemptRecord = {
    id: randomUUID(),
    sessionQuestionId: question.id,
    attemptIndex,
    transcriptText: input.transcriptText,
    wordCount: metrics.wordCount,
    durationSeconds: metrics.durationSeconds,
    fillerCount: metrics.fillerCount,
    fillerRate: metrics.fillerRate,
    wordsPerMinute: metrics.wordsPerMinute,
    longPauseCount: metrics.longPauseCount,
    fragmentationScore: metrics.fragmentationScore,
    metricsJson: metrics,
    createdAt: new Date().toISOString(),
  };

  const evaluationRecord: EvaluationRecord = {
    id: randomUUID(),
    transcriptAttemptId: attempt.id,
    modelName: "heuristic-or-openai",
    promptVersion: "2026-03-03-v1",
    rubricVersion: questionBank.find((item) => item.code === question.questionCode)!
      .rubricVersion,
    contentScoreRaw: input.evaluation.contentScoreRaw,
    deliveryScore: input.evaluation.deliveryScore,
    missingComponents: input.evaluation.missingComponents,
    strengths: input.evaluation.strengths,
    nudges: input.evaluation.nudges,
    capsApplied: input.evaluation.capsApplied,
    reasoningJson: input.evaluation,
    finalContentScoreAfterCaps: input.evaluation.finalContentScoreAfterCaps,
    createdAt: new Date().toISOString(),
  };

  question.attempts.push(attempt);
  question.evaluations.push(evaluationRecord);

  const isForcedFinal =
    question.attemptCount >= 3 || metrics.durationSeconds < 45 || input.evaluation.nudges.length === 0;

  if (isForcedFinal) {
    finalizeQuestionInternal(question, input.evaluation, input.feedback, question.attemptCount >= 3 ? "max_attempts" : null);
  } else {
    question.status = "awaiting_retry";
    question.finalFeedback = input.feedback;
  }

  return {
    question,
    attempt,
    evaluation: evaluationRecord,
    metrics,
  };
}

export function finalizeQuestion(
  sessionQuestionId: string,
  reason = "user_accepted_score",
) {
  const question = getSessionQuestion(sessionQuestionId);
  if (!question) {
    return null;
  }

  const latestEvaluation = question.evaluations.at(-1)?.reasoningJson;
  const latestFeedback = question.finalFeedback;

  if (!latestEvaluation || !latestFeedback) {
    return null;
  }

  finalizeQuestionInternal(question, latestEvaluation, latestFeedback, reason);
  return question;
}

export function getHistorySession(sessionId: string) {
  return getSessionBundle(sessionId);
}

export function createSeededHeuristicSession() {
  const session = createSession({
    seniorityLevel: "senior",
    cvProfileId: null,
    jdProfileId: null,
  });
  startSession(session.id);

  const seededAnswers: Record<QuestionCode, string> = {
    Q1: "When I was leading a post-merger onboarding project, my goal was to unify three workflows in six weeks. I led the operating model design, aligned product, support, and ops, and chose to delay a low-value feature so we could protect service continuity. As a result, we cut onboarding time by 28% and improved CSAT by 9 points. I learned to surface trade-offs earlier with executive stakeholders.",
    Q2: "During a launch review, a design partner strongly disagreed with the sequencing I proposed. I owned the decision meeting, listened to their concern about adoption risk, and reframed the conversation around customer impact. We agreed to test a staged rollout instead of a full launch. That preserved trust, reduced escalations, and taught me to separate intent from tone.",
    Q3: "In one planning cycle, I overcommitted the team and assumed a dependency would clear itself. I was responsible for that mistake. I reset the plan, documented the root cause, and introduced a dependency review checkpoint. We recovered the roadmap within two sprints and I learned to make assumptions visible sooner.",
    Q4: "I needed buy-in from sales leaders who did not report to me. I mapped each stakeholder, handled objections around rep workload, and built a pilot plan that showed the trade-off between speed and adoption. The pilot increased usage by 22% and made the wider rollout easier.",
    Q5: "At the time, churn was rising and we believed response time was a driver. I pulled support and product data, set a target threshold, and compared two response policies. We chose the lower-cost policy because it produced the same retention gain. Churn dropped by 18% versus baseline.",
    Q6: "We had an ambiguous brief with no clean owner and conflicting deadlines. I reframed the problem into three assumptions, ran weekly check-ins, and created a risk register. The team shipped on time with fewer escalations, and I learned to narrow ambiguity into testable decisions.",
    Q7: "I inherited a process that required six manual handoffs. I diagnosed the bottleneck with timing data, automated two steps, and rewrote the review checklist. Cycle time dropped from 9 days to 5 and the process scaled across two regions.",
    Q8: "I had three urgent initiatives in flight. I used a simple impact-versus-risk prioritization frame, delegated one workstream, and accepted a delay on the lowest-value request. We protected the most important launch without compromising quality.",
    Q9: "A high performer was creating friction for the team. I prepared specific examples, framed the conversation around behaviors and outcomes, and followed up with support. Their collaboration scores improved and the relationship stayed strong.",
    Q10: "You should hire me because I turn ambiguous operating problems into measurable execution. In my last role, I led programs that reduced churn by 18% and improved onboarding speed by 28%. I match your need for cross-functional leadership and I can help this team scale with clearer operating rhythms.",
  };

  for (const questionCode of Object.keys(seededAnswers) as QuestionCode[]) {
    const bundle = getSessionBundle(session.id);
    const question = bundle?.questions.find((item) => item.questionCode === questionCode);
    if (!question) continue;
    const evaluationBundle = evaluateAnswerHeuristically({
      question: question.bank,
      transcript: seededAnswers[questionCode],
      seniorityLevel: session.seniorityLevel,
      seniorityMultiplier: session.seniorityMultiplier,
      deliveryMetrics: computeDeliveryMetrics(seededAnswers[questionCode], 120),
      previousAttempts: [],
      cvSummary: null,
      jdSummary: null,
    });
    submitQuestionAttempt({
      sessionQuestionId: question.id,
      transcriptText: seededAnswers[questionCode],
      durationSeconds: 120,
      evaluation: evaluationBundle.evaluation,
      feedback: evaluationBundle.feedback,
    });
  }

  const storedSession = getStore().sessions.find((item) => item.id === session.id);
  if (storedSession) {
    storedSession.status = "completed";
    storedSession.completedAt = new Date().toISOString();
  }

  return session;
}

function finalizeQuestionInternal(
  question: SessionQuestionRecord,
  evaluation: EvaluationResult,
  feedback: AttemptFeedback,
  reason: string | null,
) {
  question.status = reason === "user_accepted_score" ? "ended_early" : "scored";
  question.finalContentRaw = evaluation.contentScoreRaw;
  question.finalContentCapped = evaluation.finalContentScoreAfterCaps;
  question.finalContentWeighted = evaluation.weightedContentScore;
  question.deliveryScore = evaluation.deliveryScore;
  question.finalFeedback = feedback;
  question.forcedScoringReason = reason;

  const store = getStore();
  const sessionQuestions = store.sessionQuestions.filter(
    (item) => item.sessionId === question.sessionId,
  );

  const currentIndex = sessionQuestions.findIndex((item) => item.id === question.id);
  const nextQuestion = sessionQuestions[currentIndex + 1];
  if (nextQuestion && nextQuestion.status === "pending") {
    nextQuestion.status = "active";
  }

  const session = store.sessions.find((item) => item.id === question.sessionId);
  if (
    session &&
    sessionQuestions.every((item) => item.status === "scored" || item.status === "ended_early")
  ) {
    session.status = "completed";
    session.completedAt = new Date().toISOString();
  }
}

function computeAggregate(
  questions: Array<SessionQuestionRecord & { bank: { code: QuestionCode } }>,
): SessionAggregate {
  const scored = questions.filter((item) => typeof item.finalContentWeighted === "number");
  const completedQuestions = scored.length;
  const averageWeightedContent =
    completedQuestions === 0
      ? 0
      : scored.reduce((sum, question) => sum + (question.finalContentWeighted ?? 0), 0) /
        completedQuestions;
  const averageRawContent =
    completedQuestions === 0
      ? 0
      : scored.reduce((sum, question) => sum + (question.finalContentCapped ?? 0), 0) /
        completedQuestions;
  const averageDelivery =
    completedQuestions === 0
      ? 0
      : scored.reduce((sum, question) => sum + (question.deliveryScore ?? 0), 0) /
        completedQuestions;
  const averageWeightedMax =
    completedQuestions === 0
      ? 0
      : scored.reduce((sum, question) => {
          const session = getStore().sessions.find((item) => item.id === question.sessionId);
          return sum + (session ? 5 * session.seniorityMultiplier : 5);
        }, 0) / completedQuestions;

  const sorted = [...scored].sort(
    (left, right) => (right.finalContentWeighted ?? 0) - (left.finalContentWeighted ?? 0),
  );

  return {
    averageRawContent,
    averageWeightedContent,
    averageWeightedMax,
    averageDelivery,
    strongestQuestionCode: sorted[0]?.questionCode ?? null,
    weakestQuestionCode: sorted.at(-1)?.questionCode ?? null,
    completedQuestions,
    totalQuestions: questions.length,
  };
}

function seedStore(): StoreShape {
  const store: StoreShape = {
    userId: DEMO_USER_ID,
    documents: [],
    sessions: [],
    sessionQuestions: [],
  };

  globalThis.__rehearseStore = store;
  createSeededHeuristicSession();

  return globalThis.__rehearseStore!;
}
