import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseSchemaDriftError,
  isSupabaseSchemaDriftCode,
  supabaseSchemaChecks,
} from "@/lib/rehearse/repositories/supabase-errors";

type RepositorySupabaseClient = SupabaseClient<any, any, any>;

let schemaValidated = false;
let schemaValidationPromise: Promise<void> | null = null;

export async function ensureSupabaseSchemaCompatible(client: RepositorySupabaseClient) {
  if (schemaValidated) {
    return;
  }

  if (schemaValidationPromise) {
    return schemaValidationPromise;
  }

  schemaValidationPromise = (async () => {
    for (const check of supabaseSchemaChecks) {
      const { error } = await client.from(check.table).select(check.columns.join(", ")).limit(1);

      if (!error) {
        continue;
      }

      if (isSupabaseSchemaDriftCode(typeof error.code === "string" ? error.code : null)) {
        throw createSupabaseSchemaDriftError(check, error.message);
      }

      throw error;
    }

    schemaValidated = true;
  })();

  try {
    await schemaValidationPromise;
  } catch (error) {
    schemaValidationPromise = null;
    throw error;
  }
}

export function __resetSupabaseSchemaCompatibilityForTests() {
  schemaValidated = false;
  schemaValidationPromise = null;
}
