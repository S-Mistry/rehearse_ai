import { createBrowserClient } from "@supabase/ssr";
import { appMode, env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!appMode.hasSupabaseClient) {
    return null;
  }

  return createBrowserClient(env.supabaseUrl!, env.supabaseAnonKey!);
}
