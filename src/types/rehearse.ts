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
export type EffectiveOwnerId = string;
export type ExtractionProvider = "openai:gpt-4.1-mini" | "fallback:local-parser";
export type EvaluationProvider = "openai:gpt-4.1" | "fallback:heuristic";
export type TranscriptProvider = "gpt-4o-transcribe" | "manual-transcript";
export type ParseStatus = "parsed" | "warning" | "failed";
export type ConversationSpeaker = "interviewer" | "candidate" | "system";
export type StarSection = "situation" | "task" | "action" | "result";
export type StarSectionStatus = "missing" | "weak" | "covered";
export type RoleRelevanceAssessment =
  | "direct_match"
  | "transferable"
  | "weak_match"
  | "not_enough_context";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

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
  starAssessment: Record<StarSection, StarSectionAssessment>;
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
  roleRelevance?: {
    assessment: RoleRelevanceAssessment;
    reasoning: string;
    bridge: string | null;
  };
}

export interface ConversationTurn {
  id: string;
  speaker: ConversationSpeaker;
  text: string;
  status?: "partial" | "final";
  createdAt?: string;
}

export interface StarSectionAssessment {
  status: StarSectionStatus;
  reason: string;
  evidence: string | null;
  qualityScore: 0 | 1 | 2;
}

export interface StarCoverage {
  situation: StarSectionStatus;
  task: StarSectionStatus;
  action: StarSectionStatus;
  result: StarSectionStatus;
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
  verdict: string;
  headline: string;
  strengths: string[];
  improveNext: string[];
  deliverySummary: string;
  retryPrompt: string;
  starCoverage: StarCoverage;
  missingElements: string[];
  answerStarter?: string;
  cvLeverage?: string[];
  roleRelevance?: {
    assessment: RoleRelevanceAssessment;
    headline: string;
    detail: string;
    bridge: string | null;
  };
  spokenRecap: string;
}

export interface TranscriptAttemptRecord {
  id: string;
  sessionQuestionId: string;
  attemptIndex: number;
  transcriptProvider: TranscriptProvider;
  transcriptText: string;
  conversationTurns: ConversationTurn[];
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
  provider: EvaluationProvider;
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
  fileName: string | null;
  sourceType: SourceType;
  rawText: string;
  structuredJson: CvProfileStructured | JdProfileStructured;
  parseStatus: ParseStatus;
  parseWarnings: string[];
  provider: ExtractionProvider;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  status: SessionStatus;
  seniorityLevel: SeniorityLevel;
  seniorityMultiplier: number;
  targetRoleTitle: string | null;
  targetCompanyName: string | null;
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

export const missingComponentSchema = z.enum([
  "situation",
  "task",
  "action",
  "result",
  "metric",
  "ownership",
  "reflection",
  "tradeoff",
  "resistance",
  "strategic_layer",
]);

export const scoreCapSchema = z.enum([
  "no_result",
  "no_ownership",
  "no_metric",
  "no_reflection",
  "no_tradeoff_senior_plus",
  "authenticity_flag",
  "short_answer_cap",
]);

export const starSectionStatusSchema = z.enum(["missing", "weak", "covered"]);

export const starSectionAssessmentSchema = z.object({
  status: starSectionStatusSchema,
  reason: z.string(),
  evidence: z.string().nullable(),
  qualityScore: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export const cvRoleSchema = z.object({
  title: z.string(),
  seniorityLevelEstimate: z.string(),
  durationMonths: z.number().nullable(),
  teamSizeManaged: z.number().nullable(),
  scopeSummary: z.string(),
});

export const cvAchievementSchema = z.object({
  description: z.string(),
  metricType: z.string(),
  value: z.string(),
  impactArea: z.string(),
});

export const cvProfileStructuredSchema = z.object({
  roles: z.array(cvRoleSchema),
  quantifiedAchievements: z.array(cvAchievementSchema),
  competencySignals: z.array(z.string()),
  industryTags: z.array(z.string()),
  toolsMethods: z.array(z.string()),
});

export const jdProfileStructuredSchema = z.object({
  coreCompetencies: z.array(z.string()),
  leadershipExpectationLevel: z.string(),
  strategicVsExecutionWeight: z.string(),
  stakeholderComplexityLevel: z.string(),
  performanceKeywords: z.array(z.string()),
});

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
  starAssessment: z.object({
    situation: starSectionAssessmentSchema,
    task: starSectionAssessmentSchema,
    action: starSectionAssessmentSchema,
    result: starSectionAssessmentSchema,
  }),
  missingComponents: z.array(missingComponentSchema),
  strengths: z.array(z.string()),
  nudges: z.array(z.string()),
  capsApplied: z.array(scoreCapSchema),
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
  roleRelevance: z
    .object({
      assessment: z.union([
        z.literal("direct_match"),
        z.literal("transferable"),
        z.literal("weak_match"),
        z.literal("not_enough_context"),
      ]),
      reasoning: z.string(),
      bridge: z.string().nullable(),
    })
    .optional(),
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
