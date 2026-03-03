import { randomUUID } from "crypto";
import type {
  AttemptFeedback,
  DeliveryMetrics,
  EvaluationRecord,
  EvaluationResult,
  QuestionCode,
  QuestionBankItem,
  SeniorityLevel,
  SessionAggregate,
  SessionBundle,
  SessionQuestionRecord,
  SessionQuestionStatus,
  SessionRecord,
  StoredDocumentProfile,
  TranscriptAttemptRecord,
} from "@/types/rehearse";
import { computeDeliveryMetrics } from "@/lib/rehearse/delivery/metrics";
import { evaluateAnswerHeuristically } from "@/lib/rehearse/scoring/evaluate-answer";
import { questionBank, seniorityConfig } from "@/lib/rehearse/questions/question-bank";
import { getEffectiveOwnerId } from "@/lib/rehearse/repositories/effective-owner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appMode } from "@/lib/env";

type StoreShape = {
  userId: string;
  documents: StoredDocumentProfile[];
  sessions: SessionRecord[];
  sessionQuestions: SessionQuestionRecord[];
};

type SessionQuestionWithBank = SessionQuestionRecord & { bank: QuestionBankItem };
type SupabaseRow = Record<string, unknown>;
type EvaluationJoinRow = SupabaseRow & {
  transcript_attempts: {
    session_question_id: unknown;
  };
};

declare global {
  var __rehearseStore: StoreShape | undefined;
}

let repositoryMode: "unknown" | "supabase" | "memory" = "unknown";
let supabaseSeeded = false;

function getStore(): StoreShape {
  if (!globalThis.__rehearseStore) {
    globalThis.__rehearseStore = seedStore();
  }

  return globalThis.__rehearseStore;
}

export async function listDocuments(kind?: "cv" | "jd") {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();

      if (kind) {
        const table = kind === "cv" ? "cv_profiles" : "jd_profiles";
        const { data, error } = await client
          .from(table)
          .select("*")
          .eq("user_id", getEffectiveOwnerId())
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row: SupabaseRow) => mapDocumentRow(row, kind));
      }

      const [cvRows, jdRows] = await Promise.all([
        client
          .from("cv_profiles")
          .select("*")
          .eq("user_id", getEffectiveOwnerId())
          .order("created_at", { ascending: false }),
        client
          .from("jd_profiles")
          .select("*")
          .eq("user_id", getEffectiveOwnerId())
          .order("created_at", { ascending: false }),
      ]);

      if (cvRows.error) throw cvRows.error;
      if (jdRows.error) throw jdRows.error;

      return [
        ...(cvRows.data ?? []).map((row: SupabaseRow) => mapDocumentRow(row, "cv")),
        ...(jdRows.data ?? []).map((row: SupabaseRow) => mapDocumentRow(row, "jd")),
      ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    () => Promise.resolve(listDocumentsMemory(kind)),
  );
}

export async function createDocument(
  input: Omit<StoredDocumentProfile, "userId" | "createdAt">,
) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      const table = input.kind === "cv" ? "cv_profiles" : "jd_profiles";
      const { data, error } = await client
        .from(table)
        .insert({
          id: input.id,
          user_id: getEffectiveOwnerId(),
          storage_path: input.storagePath,
          file_name: input.fileName,
          source_type: input.sourceType,
          raw_text: input.rawText,
          structured_json: input.structuredJson,
          parse_status: input.parseStatus,
          parse_warnings: input.parseWarnings,
          provider: input.provider,
        })
        .select("*")
        .single();

      if (error) throw error;
      return mapDocumentRow(data, input.kind);
    },
    () => Promise.resolve(createDocumentMemory(input)),
  );
}

export async function createSession(input: {
  seniorityLevel: SeniorityLevel;
  cvProfileId: string | null;
  jdProfileId: string | null;
}) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();

      const { data: sessionRow, error: sessionError } = await client
        .from("sessions")
        .insert({
          user_id: getEffectiveOwnerId(),
          status: "ready",
          seniority_level: input.seniorityLevel,
          seniority_multiplier: seniorityConfig[input.seniorityLevel].multiplier,
          cv_profile_id: input.cvProfileId,
          jd_profile_id: input.jdProfileId,
        })
        .select("*")
        .single();

      if (sessionError) throw sessionError;

      const { data: bankRows, error: bankError } = await client
        .from("question_bank")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      if (bankError) throw bankError;

      const questionRows =
        bankRows?.map((row: Record<string, unknown>, index: number) => ({
          session_id: sessionRow.id,
          question_bank_id: row.id,
          status: index === 0 ? "active" : "pending",
          attempt_count: 0,
        })) ?? [];

      const { data: insertedQuestions, error: questionError } = await client
        .from("session_questions")
        .insert(questionRows)
        .select("*");
      if (questionError) throw questionError;

      return mapSessionRow(
        sessionRow,
        (insertedQuestions ?? []).map((row: SupabaseRow) => String(row.id)),
      );
    },
    () => Promise.resolve(createSessionMemory(input)),
  );
}

export async function startSession(sessionId: string) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();

      const { data, error } = await client
        .from("sessions")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select("*")
        .single();
      if (error) throw error;
      return mapSessionRow(data, await getQuestionIdsForSession(client, sessionId));
    },
    () => Promise.resolve(startSessionMemory(sessionId)),
  );
}

export async function getSessionBundle(sessionId: string): Promise<SessionBundle | null> {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      return fetchSessionBundleFromSupabase(client, sessionId);
    },
    () => Promise.resolve(getSessionBundleMemory(sessionId)),
  );
}

export async function listSessionBundles() {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      const { data, error } = await client
        .from("sessions")
        .select("id")
        .eq("user_id", getEffectiveOwnerId())
        .order("created_at", { ascending: false });
      if (error) throw error;

      const bundles = await Promise.all(
        (data ?? []).map((row: SupabaseRow) =>
          fetchSessionBundleFromSupabase(client, String(row.id)),
        ),
      );
      return bundles.filter(Boolean) as SessionBundle[];
    },
    () => Promise.resolve(listSessionBundlesMemory()),
  );
}

export async function getSessionQuestionByCode(
  sessionId: string,
  questionCode: QuestionCode,
) {
  return withRepository(
    async () => {
      const bundle = await getSessionBundle(sessionId);
      return bundle?.questions.find((item) => item.questionCode === questionCode) ?? null;
    },
    () => Promise.resolve(getSessionQuestionByCodeMemory(sessionId, questionCode) ?? null),
  );
}

export async function getSessionQuestion(sessionQuestionId: string) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      return fetchSessionQuestionFromSupabase(client, sessionQuestionId);
    },
    () => Promise.resolve(getSessionQuestionMemory(sessionQuestionId)),
  );
}

export async function submitQuestionAttempt(input: {
  sessionQuestionId: string;
  transcriptProvider: TranscriptAttemptRecord["transcriptProvider"];
  transcriptText: string;
  durationSeconds: number;
  deliveryMetrics: DeliveryMetrics;
  evaluationProvider: EvaluationRecord["provider"];
  evaluationModelName: string;
  evaluationPromptVersion: string;
  evaluation: EvaluationResult;
  feedback: AttemptFeedback;
}) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      const question = await fetchSessionQuestionFromSupabase(client, input.sessionQuestionId);
      if (!question) {
        return null;
      }

      const metrics = input.deliveryMetrics;
      const attemptIndex = question.attemptCount + 1;

      const { data: attemptRow, error: attemptError } = await client
        .from("transcript_attempts")
        .insert({
          session_question_id: question.id,
          attempt_index: attemptIndex,
          transcript_provider: input.transcriptProvider,
          transcript_text: input.transcriptText,
          word_count: metrics.wordCount,
          duration_seconds: metrics.durationSeconds,
          filler_count: metrics.fillerCount,
          filler_rate: metrics.fillerRate,
          words_per_minute: metrics.wordsPerMinute,
          long_pause_count: metrics.longPauseCount,
          fragmentation_score: metrics.fragmentationScore,
          metrics_json: metrics,
        })
        .select("*")
        .single();
      if (attemptError) throw attemptError;

      const { data: evaluationRow, error: evaluationError } = await client
        .from("evaluations")
        .insert({
          transcript_attempt_id: attemptRow.id,
          model_name: input.evaluationModelName,
          provider: input.evaluationProvider,
          prompt_version: input.evaluationPromptVersion,
          rubric_version: questionBank.find((item) => item.code === question.questionCode)!
            .rubricVersion,
          content_score_raw: input.evaluation.contentScoreRaw,
          delivery_score: input.evaluation.deliveryScore,
          missing_components: input.evaluation.missingComponents,
          strengths: input.evaluation.strengths,
          nudges: input.evaluation.nudges,
          caps_applied: input.evaluation.capsApplied,
          reasoning_json: input.evaluation,
          final_content_score_after_caps: input.evaluation.finalContentScoreAfterCaps,
        })
        .select("*")
        .single();
      if (evaluationError) throw evaluationError;

      const shouldFinalize =
        attemptIndex >= 3 ||
        metrics.durationSeconds < 45 ||
        input.evaluation.nudges.length === 0;

      if (shouldFinalize) {
        await finalizeQuestionInSupabase(
          client,
          {
            ...question,
            attemptCount: attemptIndex,
          },
          input.evaluation,
          input.feedback,
          attemptIndex >= 3 ? "max_attempts" : null,
        );
      } else {
        const { error: updateError } = await client
          .from("session_questions")
          .update({
            status: "awaiting_retry",
            attempt_count: attemptIndex,
            final_feedback_json: input.feedback,
          })
          .eq("id", question.id);
        if (updateError) throw updateError;
      }

      return {
        question: (await fetchSessionQuestionFromSupabase(client, question.id))!,
        attempt: mapAttemptRow(attemptRow),
        evaluation: mapEvaluationRow(evaluationRow),
        metrics,
      };
    },
    () => Promise.resolve(submitQuestionAttemptMemory(input)),
  );
}

export async function finalizeQuestion(
  sessionQuestionId: string,
  reason = "user_accepted_score",
) {
  return withRepository(
    async () => {
      const client = createSupabaseAdminClient()!;
      await ensureSupabaseSeeded();
      const question = await fetchSessionQuestionFromSupabase(client, sessionQuestionId);
      if (!question) {
        return null;
      }

      const latestEvaluation = question.evaluations.at(-1)?.reasoningJson;
      const latestFeedback = question.finalFeedback;
      if (!latestEvaluation || !latestFeedback) {
        return null;
      }

      await finalizeQuestionInSupabase(
        client,
        question,
        latestEvaluation,
        latestFeedback,
        reason,
      );

      return fetchSessionQuestionFromSupabase(client, sessionQuestionId);
    },
    () => Promise.resolve(finalizeQuestionMemory(sessionQuestionId, reason)),
  );
}

export async function getHistorySession(sessionId: string) {
  return getSessionBundle(sessionId);
}

async function withRepository<T>(
  supabaseHandler: () => Promise<T>,
  memoryHandler: () => Promise<T>,
) {
  const mode = await getRepositoryMode();
  if (mode === "memory") {
    return memoryHandler();
  }

  try {
    return await supabaseHandler();
  } catch (error) {
    throw normalizeSupabaseError(error);
  }
}

async function getRepositoryMode() {
  if (repositoryMode !== "unknown") {
    return repositoryMode;
  }

  if (!appMode.hasSupabaseServer) {
    repositoryMode = "memory";
    return repositoryMode;
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    repositoryMode = "memory";
    return repositoryMode;
  }

  repositoryMode = "supabase";
  return repositoryMode;
}

async function ensureSupabaseSeeded() {
  if (supabaseSeeded) {
    return;
  }

  const client = createSupabaseAdminClient();
  if (!client) {
    return;
  }

  const profileResult = await client.from("profiles").upsert(
    {
      user_id: getEffectiveOwnerId(),
      display_name: "Demo User",
      default_seniority: "senior",
    },
    {
      onConflict: "user_id",
    },
  );
  if (profileResult.error) {
    throw normalizeSupabaseError(profileResult.error);
  }

  const bankCountResult = await client
    .from("question_bank")
    .select("id", { count: "exact", head: true });
  if (bankCountResult.error) {
    throw normalizeSupabaseError(bankCountResult.error);
  }

  if ((bankCountResult.count ?? 0) === 0) {
    const insertResult = await client.from("question_bank").insert(
      questionBank.map((question) => ({
        question_code: question.code,
        prompt_text: question.prompt,
        display_order: question.order,
        rubric_version: question.rubricVersion,
        rubric_json: question.rubric,
        active: true,
      })),
    );
    if (insertResult.error) {
      throw normalizeSupabaseError(insertResult.error);
    }
  }

  supabaseSeeded = true;
}

function normalizeSupabaseError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "PGRST205"
  ) {
    return new Error(
      "Supabase schema is missing. Run supabase/migrations/20260303_init.sql in the project SQL editor, then retry.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Supabase request failed.");
}

async function fetchSessionBundleFromSupabase(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  sessionId: string,
) {
  const { data: sessionRow, error: sessionError } = await client
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (sessionError || !sessionRow) {
    return null;
  }

  const [questionRowsResult, bankRowsResult, cvResult, jdResult] = await Promise.all([
    client
      .from("session_questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    client.from("question_bank").select("*").eq("active", true),
    sessionRow.cv_profile_id
      ? client.from("cv_profiles").select("*").eq("id", sessionRow.cv_profile_id).single()
      : Promise.resolve({ data: null, error: null }),
    sessionRow.jd_profile_id
      ? client.from("jd_profiles").select("*").eq("id", sessionRow.jd_profile_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (questionRowsResult.error || bankRowsResult.error) {
    throw questionRowsResult.error ?? bankRowsResult.error;
  }

  const questionRows = questionRowsResult.data ?? [];
  const bankMap = new Map<string, QuestionBankItem>(
    (bankRowsResult.data ?? []).map((row: SupabaseRow) => [
      String(row.id),
      mapQuestionBankRow(row),
    ]),
  );

  const questionIds = questionRows.map((row: SupabaseRow) => String(row.id));
  const safeIds =
    questionIds.length > 0
      ? questionIds
      : ["00000000-0000-0000-0000-000000000000"];
  const [attemptRowsResult, evaluationRowsResult] = await Promise.all([
    client
      .from("transcript_attempts")
      .select("*")
      .in("session_question_id", safeIds)
      .order("attempt_index", { ascending: true }),
    client
      .from("evaluations")
      .select("*, transcript_attempts!inner(session_question_id)")
      .in("transcript_attempts.session_question_id", safeIds),
  ]);

  if (attemptRowsResult.error || evaluationRowsResult.error) {
    throw attemptRowsResult.error ?? evaluationRowsResult.error;
  }

  const attemptsByQuestion = new Map<string, TranscriptAttemptRecord[]>();
  for (const row of (attemptRowsResult.data ?? []) as SupabaseRow[]) {
    const mapped = mapAttemptRow(row);
    const collection = attemptsByQuestion.get(mapped.sessionQuestionId) ?? [];
    collection.push(mapped);
    attemptsByQuestion.set(mapped.sessionQuestionId, collection);
  }

  const evaluationsByQuestion = new Map<string, EvaluationRecord[]>();
  for (const row of (evaluationRowsResult.data ?? []) as EvaluationJoinRow[]) {
    const sessionQuestionId = String(row.transcript_attempts.session_question_id);
    const mapped = mapEvaluationRow(row);
    const collection = evaluationsByQuestion.get(sessionQuestionId) ?? [];
    collection.push(mapped);
    evaluationsByQuestion.set(sessionQuestionId, collection);
  }

  const questions: SessionQuestionWithBank[] = questionRows
    .map((row: SupabaseRow) => {
      const bank = bankMap.get(String(row.question_bank_id));
      if (!bank) {
        return null;
      }

      return {
        id: String(row.id),
        sessionId: String(row.session_id),
        questionId: String(row.question_bank_id),
        questionCode: bank.code,
        status: row.status as SessionQuestionStatus,
        attemptCount: Number(row.attempt_count ?? 0),
        finalContentRaw: row.final_content_raw == null ? null : Number(row.final_content_raw),
        finalContentCapped:
          row.final_content_capped == null ? null : Number(row.final_content_capped),
        finalContentWeighted:
          row.final_content_weighted == null
            ? null
            : Number(row.final_content_weighted),
        deliveryScore: row.delivery_score == null ? null : Number(row.delivery_score),
        finalFeedback: (row.final_feedback_json as AttemptFeedback | null) ?? null,
        forcedScoringReason:
          row.forced_scoring_reason == null ? null : String(row.forced_scoring_reason),
        attempts: attemptsByQuestion.get(String(row.id)) ?? [],
        evaluations: evaluationsByQuestion.get(String(row.id)) ?? [],
        bank,
      };
    })
    .filter(isSessionQuestionWithBank)
    .sort(
      (left: SessionQuestionWithBank, right: SessionQuestionWithBank) =>
        left.bank.order - right.bank.order,
    );

  return {
    session: mapSessionRow(sessionRow, questions.map((question) => question.id)),
    questions,
    cvProfile: cvResult.data ? mapDocumentRow(cvResult.data, "cv") : null,
    jdProfile: jdResult.data ? mapDocumentRow(jdResult.data, "jd") : null,
    aggregate: computeAggregate(questions),
  };
}

async function fetchSessionQuestionFromSupabase(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  sessionQuestionId: string,
) {
  const { data: row, error } = await client
    .from("session_questions")
    .select("*")
    .eq("id", sessionQuestionId)
    .single();
  if (error || !row) {
    return null;
  }

  const { data: bankRow, error: bankError } = await client
    .from("question_bank")
    .select("*")
    .eq("id", row.question_bank_id)
    .single();
  if (bankError || !bankRow) {
    return null;
  }

  const [attemptRows, evaluationRows] = await Promise.all([
    client
      .from("transcript_attempts")
      .select("*")
      .eq("session_question_id", sessionQuestionId)
      .order("attempt_index", { ascending: true }),
    client
      .from("evaluations")
      .select("*, transcript_attempts!inner(session_question_id)")
      .eq("transcript_attempts.session_question_id", sessionQuestionId),
  ]);

  if (attemptRows.error || evaluationRows.error) {
    throw attemptRows.error ?? evaluationRows.error;
  }

  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    questionId: String(row.question_bank_id),
    questionCode: mapQuestionBankRow(bankRow).code,
    status: row.status as SessionQuestionStatus,
    attemptCount: Number(row.attempt_count ?? 0),
    finalContentRaw: row.final_content_raw == null ? null : Number(row.final_content_raw),
    finalContentCapped:
      row.final_content_capped == null ? null : Number(row.final_content_capped),
    finalContentWeighted:
      row.final_content_weighted == null ? null : Number(row.final_content_weighted),
    deliveryScore: row.delivery_score == null ? null : Number(row.delivery_score),
    finalFeedback: (row.final_feedback_json as AttemptFeedback | null) ?? null,
    forcedScoringReason:
      row.forced_scoring_reason == null ? null : String(row.forced_scoring_reason),
    attempts: (attemptRows.data ?? []).map((attemptRow: SupabaseRow) =>
      mapAttemptRow(attemptRow),
    ),
    evaluations: (evaluationRows.data ?? []).map((evaluationRow: SupabaseRow) =>
      mapEvaluationRow(evaluationRow),
    ),
  } satisfies SessionQuestionRecord;
}

async function finalizeQuestionInSupabase(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  question: SessionQuestionRecord,
  evaluation: EvaluationResult,
  feedback: AttemptFeedback,
  reason: string | null,
) {
  const nextStatus = reason === "user_accepted_score" ? "ended_early" : "scored";
  const { error: updateError } = await client
    .from("session_questions")
    .update({
      status: nextStatus,
      attempt_count: question.attemptCount,
      final_content_raw: evaluation.contentScoreRaw,
      final_content_capped: evaluation.finalContentScoreAfterCaps,
      final_content_weighted: evaluation.weightedContentScore,
      delivery_score: evaluation.deliveryScore,
      final_feedback_json: feedback,
      forced_scoring_reason: reason,
    })
    .eq("id", question.id);
  if (updateError) throw updateError;

  const { data: siblings, error: siblingsError } = await client
    .from("session_questions")
    .select("id, status, question_bank_id")
    .eq("session_id", question.sessionId);
  if (siblingsError) throw siblingsError;

  const siblingRows = siblings ?? [];
  const ordered = await orderSessionQuestionRows(client, siblingRows);
  const currentIndex = ordered.findIndex((row) => String(row.id) === question.id);
  const nextQuestion = ordered[currentIndex + 1];
  if (nextQuestion && nextQuestion.status === "pending") {
    const { error: nextError } = await client
      .from("session_questions")
      .update({ status: "active" })
      .eq("id", nextQuestion.id);
    if (nextError) throw nextError;
  }

  const allDone = ordered.every((row) => {
    const status = String(row.id) === question.id ? nextStatus : row.status;
    return status === "scored" || status === "ended_early";
  });

  if (allDone) {
    const { error: sessionError } = await client
      .from("sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", question.sessionId);
    if (sessionError) throw sessionError;
  }
}

async function getQuestionIdsForSession(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  sessionId: string,
) {
  const { data, error } = await client
    .from("session_questions")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: SupabaseRow) => String(row.id));
}

async function orderSessionQuestionRows(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  rows: Array<Record<string, unknown>>,
) {
  const ids = rows.map((row) => String(row.question_bank_id));
  const { data, error } = await client
    .from("question_bank")
    .select("id, display_order")
    .in("id", ids);
  if (error) throw error;
  const orderMap = new Map<string, number>(
    (data ?? []).map((row: SupabaseRow) => [
      String(row.id),
      Number(row.display_order),
    ]),
  );

  return [...rows].sort(
    (left, right) =>
      (orderMap.get(String(left.question_bank_id)) ?? 0) -
      (orderMap.get(String(right.question_bank_id)) ?? 0),
  );
}

function mapSessionRow(row: Record<string, unknown>, questionIds: string[]): SessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: row.status as SessionRecord["status"],
    seniorityLevel: row.seniority_level as SeniorityLevel,
    seniorityMultiplier: Number(row.seniority_multiplier),
    cvProfileId: row.cv_profile_id == null ? null : String(row.cv_profile_id),
    jdProfileId: row.jd_profile_id == null ? null : String(row.jd_profile_id),
    startedAt: row.started_at == null ? null : String(row.started_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    createdAt: String(row.created_at),
    questionIds,
  };
}

function mapDocumentRow(
  row: Record<string, unknown>,
  kind: "cv" | "jd",
): StoredDocumentProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind,
    storagePath: row.storage_path == null ? null : String(row.storage_path),
    fileName: row.file_name == null ? null : String(row.file_name),
    sourceType: row.source_type as StoredDocumentProfile["sourceType"],
    rawText: String(row.raw_text),
    structuredJson: row.structured_json as StoredDocumentProfile["structuredJson"],
    parseStatus: row.parse_status as StoredDocumentProfile["parseStatus"],
    parseWarnings: (row.parse_warnings as string[] | null) ?? [],
    provider: (row.provider ?? "fallback:local-parser") as StoredDocumentProfile["provider"],
    createdAt: String(row.created_at),
  };
}

function mapQuestionBankRow(row: Record<string, unknown>): QuestionBankItem {
  const local = questionBank.find((item) => item.code === row.question_code);
  return {
    id: String(row.id),
    code: row.question_code as QuestionCode,
    order: Number(row.display_order),
    prompt: String(row.prompt_text),
    title: local?.title ?? String(row.question_code),
    category: local?.category ?? "Behavioural",
    rubricVersion: String(row.rubric_version),
    rubric: row.rubric_json as QuestionBankItem["rubric"],
  };
}

function mapAttemptRow(row: Record<string, unknown>): TranscriptAttemptRecord {
  return {
    id: String(row.id),
    sessionQuestionId: String(row.session_question_id),
    attemptIndex: Number(row.attempt_index),
    transcriptProvider: (row.transcript_provider ??
      "manual-transcript") as TranscriptAttemptRecord["transcriptProvider"],
    transcriptText: String(row.transcript_text),
    wordCount: Number(row.word_count),
    durationSeconds: Number(row.duration_seconds),
    fillerCount: Number(row.filler_count),
    fillerRate: Number(row.filler_rate),
    wordsPerMinute: Number(row.words_per_minute),
    longPauseCount: Number(row.long_pause_count),
    fragmentationScore: Number(row.fragmentation_score),
    metricsJson: row.metrics_json as TranscriptAttemptRecord["metricsJson"],
    createdAt: String(row.created_at),
  };
}

function mapEvaluationRow(row: Record<string, unknown>): EvaluationRecord {
  return {
    id: String(row.id),
    transcriptAttemptId: String(row.transcript_attempt_id),
    modelName: String(row.model_name),
    provider: (row.provider ?? "fallback:heuristic") as EvaluationRecord["provider"],
    promptVersion: String(row.prompt_version),
    rubricVersion: String(row.rubric_version),
    contentScoreRaw: Number(row.content_score_raw),
    deliveryScore: Number(row.delivery_score),
    missingComponents: row.missing_components as EvaluationRecord["missingComponents"],
    strengths: row.strengths as string[],
    nudges: row.nudges as string[],
    capsApplied: row.caps_applied as EvaluationRecord["capsApplied"],
    reasoningJson: row.reasoning_json as EvaluationResult,
    finalContentScoreAfterCaps: Number(row.final_content_score_after_caps),
    createdAt: String(row.created_at),
  };
}

function isSessionQuestionWithBank(
  value: SessionQuestionWithBank | null,
): value is SessionQuestionWithBank {
  return value !== null;
}

function listDocumentsMemory(kind?: "cv" | "jd") {
  const store = getStore();
  return store.documents.filter((document) => (kind ? document.kind === kind : true));
}

function createDocumentMemory(
  input: Omit<StoredDocumentProfile, "userId" | "createdAt">,
) {
  const store = getStore();
  const document: StoredDocumentProfile = {
    ...input,
    userId: getEffectiveOwnerId(),
    createdAt: new Date().toISOString(),
  };
  store.documents.unshift(document);
  return document;
}

function createSessionMemory(input: {
  seniorityLevel: SeniorityLevel;
  cvProfileId: string | null;
  jdProfileId: string | null;
}) {
  const store = getStore();
  const sessionId = randomUUID();
  const session: SessionRecord = {
    id: sessionId,
    userId: getEffectiveOwnerId(),
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

function startSessionMemory(sessionId: string) {
  const store = getStore();
  const session = store.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return null;
  }

  session.status = "active";
  session.startedAt = session.startedAt ?? new Date().toISOString();
  return session;
}

function getSessionBundleMemory(sessionId: string): SessionBundle | null {
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

function listSessionBundlesMemory() {
  return getStore()
    .sessions.map((session) => getSessionBundleMemory(session.id))
    .filter(Boolean) as SessionBundle[];
}

function getSessionQuestionByCodeMemory(sessionId: string, questionCode: QuestionCode) {
  return getStore().sessionQuestions.find(
    (item) => item.sessionId === sessionId && item.questionCode === questionCode,
  );
}

function getSessionQuestionMemory(sessionQuestionId: string) {
  return getStore().sessionQuestions.find((item) => item.id === sessionQuestionId) ?? null;
}

function submitQuestionAttemptMemory(input: {
  sessionQuestionId: string;
  transcriptProvider: TranscriptAttemptRecord["transcriptProvider"];
  transcriptText: string;
  durationSeconds: number;
  deliveryMetrics: DeliveryMetrics;
  evaluationProvider: EvaluationRecord["provider"];
  evaluationModelName: string;
  evaluationPromptVersion: string;
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
  const metrics = input.deliveryMetrics;

  const attempt: TranscriptAttemptRecord = {
    id: randomUUID(),
    sessionQuestionId: question.id,
    attemptIndex,
    transcriptProvider: input.transcriptProvider,
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
    modelName: input.evaluationModelName,
    provider: input.evaluationProvider,
    promptVersion: input.evaluationPromptVersion,
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
    question.attemptCount >= 3 ||
    metrics.durationSeconds < 45 ||
    input.evaluation.nudges.length === 0;

  if (isForcedFinal) {
    finalizeQuestionInternalMemory(
      question,
      input.evaluation,
      input.feedback,
      question.attemptCount >= 3 ? "max_attempts" : null,
    );
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

function finalizeQuestionMemory(
  sessionQuestionId: string,
  reason = "user_accepted_score",
) {
  const question = getSessionQuestionMemory(sessionQuestionId);
  if (!question) {
    return null;
  }

  const latestEvaluation = question.evaluations.at(-1)?.reasoningJson;
  const latestFeedback = question.finalFeedback;

  if (!latestEvaluation || !latestFeedback) {
    return null;
  }

  finalizeQuestionInternalMemory(question, latestEvaluation, latestFeedback, reason);
  return question;
}

export async function createSeededHeuristicSession() {
  const session = createSessionMemory({
    seniorityLevel: "senior",
    cvProfileId: null,
    jdProfileId: null,
  });
  startSessionMemory(session.id);

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
    const bundle = getSessionBundleMemory(session.id);
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
    submitQuestionAttemptMemory({
      sessionQuestionId: question.id,
      transcriptProvider: "manual-transcript",
      transcriptText: seededAnswers[questionCode],
      durationSeconds: 120,
      deliveryMetrics: computeDeliveryMetrics(seededAnswers[questionCode], 120),
      evaluationProvider: "fallback:heuristic",
      evaluationModelName: "heuristic",
      evaluationPromptVersion: "2026-03-03-v1",
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

function finalizeQuestionInternalMemory(
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

function computeAggregate(questions: SessionQuestionWithBank[]): SessionAggregate {
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
          const multiplier =
            question.finalContentWeighted && question.finalContentCapped
              ? question.finalContentWeighted / question.finalContentCapped
              : 1;
          return sum + 5 * multiplier;
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
    userId: getEffectiveOwnerId(),
    documents: [],
    sessions: [],
    sessionQuestions: [],
  };

  globalThis.__rehearseStore = store;
  void createSeededHeuristicSession();

  return globalThis.__rehearseStore!;
}
