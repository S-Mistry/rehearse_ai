import { describe, expect, it } from "vitest";
import {
  createSupabaseSchemaDriftMessage,
  normalizeSupabaseError,
} from "@/lib/rehearse/repositories/supabase-errors";

describe("supabase-errors", () => {
  it("returns a generic migration message for missing schema objects", () => {
    const normalized = normalizeSupabaseError({
      code: "PGRST205",
      message: 'Could not find the table "public.sessions" in the schema cache',
    });

    expect(normalized.message).toContain("Supabase schema is out of date.");
    expect(normalized.message).toContain("Apply all SQL files in supabase/migrations/ in order");
    expect(normalized.message).toContain("20260303_init.sql");
    expect(normalized.message).toContain("20260303_live_interview_contracts.sql");
  });

  it("returns a generic migration message for missing relations", () => {
    const normalized = normalizeSupabaseError({
      code: "42P01",
      message: 'relation "sessions" does not exist',
    });

    expect(normalized.message).toContain("Supabase schema is out of date.");
    expect(normalized.message).toContain("Apply all SQL files in supabase/migrations/ in order");
  });

  it("preserves upstream messages for non-schema Supabase errors", () => {
    const normalized = normalizeSupabaseError({
      code: "23503",
      message: "insert or update on table violates foreign key constraint",
    });

    expect(normalized.message).toBe(
      "insert or update on table violates foreign key constraint",
    );
  });

  it("includes upstream context in generated schema drift messages", () => {
    const message = createSupabaseSchemaDriftMessage(null, "column sessions.target_role_title does not exist");

    expect(message).toContain("Supabase said: column sessions.target_role_title does not exist");
  });
});
