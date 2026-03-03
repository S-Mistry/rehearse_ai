import { z } from "zod";

export type SeniorityLevel =
  | "early_career"
  | "mid_ic"
  | "senior"
  | "lead_principal"
  | "manager_director";

export type SessionStatus =
  | "draft"
  | "ready"
  | "active"
  | "completed"
  | "abandoned";

export type SessionQuestionStatus =
  | "pending"
  | "active"
  | "awaiting_retry"
  | "scored"
  | "ended_early";

export type QuestionCode =
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | "Q5"
  | "Q6"
  | "Q7"
  | "Q8"
  | "Q9"
  | "Q10";

export type MissingComponent =
  | "situation"
  | "task"
  | "action"
  | "result"
  | "metric"
  | "ownership"
  | "reflection"
  | "tradeoff"
  | "resistance"
  | "strategic_layer";

export type ScoreCap =
  | "no_result"
  | "no_ownership"
  | "no_metric"
  | "no_reflection"
  | "no_tradeoff_senior_plus"
  | "authenticity_flag"
  | "short_answer_cap";

export type SourceType = "upload" | "paste";
export type DocumentKind = "cv" | "jd";

export interface DeliveryMetrics {
  durationSeconds: number;
  wordCount: number;
  fillerCount: number;
  fillerRate: number;
  wordsPerMinute: number;
  longPauseCount: number;
  pauseEvents: Array<{ startMs: number; endMs: number; durationMs: number }>;
  fragmentationScore: number;
}

export interface EvaluationResult {
  contentScoreRaw: 1 | 2 | 3 | 4 | 5;
  finalContentScoreAfterCaps: 1 | 2 | 3 | 4 | 5;
  weightedContentScore: number;
  weightedContentMax: number;
  deliveryScore: 1 | 2 | 3 | 4 | 5;
  missingComponents: MissingComponent[];
  strengths: string[];
  nudges: string[];
  capsApplied: ScoreCap[];
  contentReasoning: {
    structure: string;
    ownership: string;
    metrics: string;
    tradeoffs: string;
    reflection: string;
  };
  deliveryReasoning: {
    clarity: string;
    pacing: string;
    fillerAssessment: string;
    conciseness: string;
  };
}

export interface QuestionRubric {
  score5Signals: string[];
  mustInclude: MissingComponent[];
  senioritySensitive?: boolean;
  resistanceRequired?: boolean;
}

export interface QuestionBankItem {
  id: string;
  code: QuestionCode;
  order: number;
  prompt: string;
  title: string;
  category: string;
  rubricVersion: string;
  rubric: QuestionRubric;
}

export interface AttemptFeedback {
  strengths: string[];
  missingElements: string[];
  whatWouldElevateToFive: string;
  structuralImprovement: string;
  cvLeverage?: string[];
  spokenText: string;
}

export interface TranscriptAttemptRecord {
  id: string;
  sessionQuestionId: string;
  attemptIndex: number;
  transcriptText: string;
  wordCount: number;
  durationSeconds: number;
  fillerCount: number;
  fillerRate: number;
  wordsPerMinute: number;
  longPauseCount: number;
  fragmentationScore: number;
  metricsJson: DeliveryMetrics;
  createdAt: string;
}

export interface EvaluationRecord {
  id: string;
  transcriptAttemptId: string;
  modelName: string;
  promptVersion: string;
  rubricVersion: string;
  contentScoreRaw: number;
  deliveryScore: number;
  missingComponents: MissingComponent[];
  strengths: string[];
  nudges: string[];
  capsApplied: ScoreCap[];
  reasoningJson: EvaluationResult;
  finalContentScoreAfterCaps: number;
  createdAt: string;
}

export interface SessionQuestionRecord {
  id: string;
  sessionId: string;
  questionId: string;
  questionCode: QuestionCode;
  status: SessionQuestionStatus;
  attemptCount: number;
  finalContentRaw: number | null;
  finalContentCapped: number | null;
  finalContentWeighted: number | null;
  deliveryScore: number | null;
  finalFeedback: AttemptFeedback | null;
  forcedScoringReason: string | null;
  attempts: TranscriptAttemptRecord[];
  evaluations: EvaluationRecord[];
}

export interface CvRole {
  title: string;
  seniorityLevelEstimate: string;
  durationMonths: number | null;
  teamSizeManaged: number | null;
  scopeSummary: string;
}

export interface CvAchievement {
  description: string;
  metricType: string;
  value: string;
  impactArea: string;
}

export interface CvProfileStructured {
  roles: CvRole[];
  quantifiedAchievements: CvAchievement[];
  competencySignals: string[];
  industryTags: string[];
  toolsMethods: string[];
}

export interface JdProfileStructured {
  coreCompetencies: string[];
  leadershipExpectationLevel: string;
  strategicVsExecutionWeight: string;
  stakeholderComplexityLevel: string;
  performanceKeywords: string[];
}

export interface StoredDocumentProfile {
  id: string;
  userId: string;
  kind: DocumentKind;
  storagePath: string | null;
  sourceType: SourceType;
  rawText: string;
  structuredJson: CvProfileStructured | JdProfileStructured;
  parseStatus: "parsed" | "warning";
  parseWarnings: string[];
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  status: SessionStatus;
  seniorityLevel: SeniorityLevel;
  seniorityMultiplier: number;
  cvProfileId: string | null;
  jdProfileId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  questionIds: string[];
}

export interface SessionAggregate {
  averageRawContent: number;
  averageWeightedContent: number;
  averageWeightedMax: number;
  averageDelivery: number;
  strongestQuestionCode: QuestionCode | null;
  weakestQuestionCode: QuestionCode | null;
  completedQuestions: number;
  totalQuestions: number;
}

export interface SessionBundle {
  session: SessionRecord;
  questions: Array<SessionQuestionRecord & { bank: QuestionBankItem }>;
  cvProfile: StoredDocumentProfile | null;
  jdProfile: StoredDocumentProfile | null;
  aggregate: SessionAggregate;
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  actionTaken: "allow" | "pause_evaluation";
}

export interface SpeechPayload {
  mimeType: string;
  base64Audio: string;
}

export const evaluationResultSchema = z.object({
  contentScoreRaw: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  finalContentScoreAfterCaps: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  weightedContentScore: z.number(),
  weightedContentMax: z.number(),
  deliveryScore: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  missingComponents: z.array(z.string()),
  strengths: z.array(z.string()),
  nudges: z.array(z.string()),
  capsApplied: z.array(z.string()),
  contentReasoning: z.object({
    structure: z.string(),
    ownership: z.string(),
    metrics: z.string(),
    tradeoffs: z.string(),
    reflection: z.string(),
  }),
  deliveryReasoning: z.object({
    clarity: z.string(),
    pacing: z.string(),
    fillerAssessment: z.string(),
    conciseness: z.string(),
  }),
});

export interface EvaluationInput {
  question: QuestionBankItem;
  transcript: string;
  seniorityLevel: SeniorityLevel;
  seniorityMultiplier: number;
  deliveryMetrics: DeliveryMetrics;
  previousAttempts: string[];
  cvSummary?: CvProfileStructured | null;
  jdSummary?: JdProfileStructured | null;
}
