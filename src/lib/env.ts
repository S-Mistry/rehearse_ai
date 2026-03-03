export function getEnv() {
  return {
    openAiApiKey: process.env.OPENAI_API_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export const env = {
  get openAiApiKey() {
    return getEnv().openAiApiKey;
  },
  get supabaseUrl() {
    return getEnv().supabaseUrl;
  },
  get supabasePublishableKey() {
    return getEnv().supabasePublishableKey;
  },
  get supabaseSecretKey() {
    return getEnv().supabaseSecretKey;
  },
  get appUrl() {
    return getEnv().appUrl;
  },
};

export const appMode = {
  get hasOpenAI() {
    return Boolean(getEnv().openAiApiKey);
  },
  get hasSupabaseClient() {
    const values = getEnv();
    return Boolean(values.supabaseUrl && values.supabasePublishableKey);
  },
  get hasSupabaseServer() {
    const values = getEnv();
    return Boolean(
      values.supabaseUrl && values.supabasePublishableKey && values.supabaseSecretKey,
    );
  },
};
