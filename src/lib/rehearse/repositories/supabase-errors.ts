export type SupabaseSchemaCheck = {
  table: string;
  columns: string[];
  migration: string;
};

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export const supabaseMigrationOrder = [
  "20260303_init.sql",
  "20260303_phase2_contracts.sql",
  "20260303_live_interview_contracts.sql",
] as const;

export const supabaseSchemaChecks: SupabaseSchemaCheck[] = [
  {
    table: "cv_profiles",
    columns: ["file_name", "provider"],
    migration: "20260303_phase2_contracts.sql",
  },
  {
    table: "jd_profiles",
    columns: ["file_name", "provider"],
    migration: "20260303_phase2_contracts.sql",
  },
  {
    table: "evaluations",
    columns: ["provider"],
    migration: "20260303_phase2_contracts.sql",
  },
  {
    table: "sessions",
    columns: ["target_role_title", "target_company_name"],
    migration: "20260303_live_interview_contracts.sql",
  },
  {
    table: "transcript_attempts",
    columns: ["transcript_provider", "conversation_turns_json"],
    migration: "20260303_live_interview_contracts.sql",
  },
];

const schemaErrorCodes = new Set(["42703", "42P01", "PGRST204", "PGRST205"]);

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== "object" || !("message" in error)) {
    return "";
  }

  return typeof error.message === "string" ? error.message : "";
}

function formatMigrationOrder() {
  return supabaseMigrationOrder.join(", ");
}

function formatCheckLabel(check: SupabaseSchemaCheck) {
  return `${check.table}.${check.columns.join(", ")}`;
}

export function isSupabaseSchemaDriftCode(code: string | null) {
  return code !== null && schemaErrorCodes.has(code);
}

export function findSupabaseSchemaCheck(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  for (const check of supabaseSchemaChecks) {
    if (message.includes(`"${check.table}"`) || message.includes(`${check.table}.`)) {
      return check;
    }

    if (
      check.columns.some((column) => {
        const qualified = `${check.table}.${column}`.toLowerCase();
        return message.includes(qualified) || message.includes(column.toLowerCase());
      })
    ) {
      return check;
    }
  }

  return null;
}

export function createSupabaseSchemaDriftMessage(
  check?: SupabaseSchemaCheck | null,
  upstreamMessage?: string,
) {
  const details = [
    "Supabase schema is out of date.",
    "Apply all SQL files in supabase/migrations/ in order:",
    formatMigrationOrder(),
  ];

  if (check) {
    details.push(`First failing contract: ${formatCheckLabel(check)}.`);
    details.push(`Likely missing migration: ${check.migration}.`);
  }

  if (upstreamMessage) {
    details.push(`Supabase said: ${upstreamMessage}`);
  }

  return details.join(" ");
}

export function createSupabaseSchemaDriftError(
  check?: SupabaseSchemaCheck | null,
  upstreamMessage?: string,
) {
  return new Error(createSupabaseSchemaDriftMessage(check, upstreamMessage));
}

export function normalizeSupabaseError(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (isSupabaseSchemaDriftCode(code)) {
    return createSupabaseSchemaDriftError(findSupabaseSchemaCheck(error), message);
  }

  if (error instanceof Error) {
    return error;
  }

  if (message) {
    return new Error(message);
  }

  return new Error("Supabase request failed.");
}
