export const env = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const appMode = {
  hasOpenAI: Boolean(env.openAiApiKey),
  hasSupabaseClient: Boolean(env.supabaseUrl && env.supabasePublishableKey),
  hasSupabaseServer: Boolean(
    env.supabaseUrl && env.supabasePublishableKey && env.supabaseSecretKey,
  ),
};
