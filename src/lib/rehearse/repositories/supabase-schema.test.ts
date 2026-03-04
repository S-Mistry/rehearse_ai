import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSupabaseSchemaCompatibilityForTests,
  ensureSupabaseSchemaCompatible,
} from "@/lib/rehearse/repositories/supabase-schema";
import { supabaseSchemaChecks } from "@/lib/rehearse/repositories/supabase-errors";

type FakeResult = {
  error: { code: string; message: string } | null;
};

function createFakeClient(overrides: Record<string, FakeResult> = {}) {
  const calls: Array<{ table: string; columns: string }> = [];

  return {
    calls,
    from(table: string) {
      return {
        select(columns: string) {
          calls.push({ table, columns });

          return {
            limit() {
              return Promise.resolve(overrides[table] ?? { error: null });
            },
          };
        },
      };
    },
  };
}

describe("supabase-schema", () => {
  beforeEach(() => {
    __resetSupabaseSchemaCompatibilityForTests();
  });

  it("points session context drift at the live interview migration", async () => {
    const client = createFakeClient({
      sessions: {
        error: {
          code: "42703",
          message: "column sessions.target_role_title does not exist",
        },
      },
    });

    await expect(
      ensureSupabaseSchemaCompatible(client as never),
    ).rejects.toThrow(/20260303_live_interview_contracts\.sql/);
  });

  it("points transcript conversation drift at the live interview migration", async () => {
    const client = createFakeClient({
      transcript_attempts: {
        error: {
          code: "42703",
          message: "column transcript_attempts.conversation_turns_json does not exist",
        },
      },
    });

    await expect(
      ensureSupabaseSchemaCompatible(client as never),
    ).rejects.toThrow(/transcript_attempts\.transcript_provider, conversation_turns_json/);
  });

  it("points phase 2 document drift at the phase 2 migration", async () => {
    const client = createFakeClient({
      cv_profiles: {
        error: {
          code: "42703",
          message: "column cv_profiles.file_name does not exist",
        },
      },
    });

    await expect(
      ensureSupabaseSchemaCompatible(client as never),
    ).rejects.toThrow(/20260303_phase2_contracts\.sql/);
  });

  it("caches a successful schema validation for the process lifetime", async () => {
    const client = createFakeClient();

    await ensureSupabaseSchemaCompatible(client as never);
    await ensureSupabaseSchemaCompatible(client as never);

    expect(client.calls).toHaveLength(supabaseSchemaChecks.length);
  });
});
