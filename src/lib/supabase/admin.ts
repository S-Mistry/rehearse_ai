import { createClient } from "@supabase/supabase-js";
import { appMode, env } from "@/lib/env";

let adminClient: any = null;

export function createSupabaseAdminClient() {
  if (!appMode.hasSupabaseServer) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl!, env.supabaseSecretKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
