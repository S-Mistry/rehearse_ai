import { appMode } from "@/lib/env";

export default function ProfilePage() {
  return (
    <div className="paper-panel rounded-xl p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Profile</p>
      <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
        Settings
      </h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
          <p className="text-sm font-medium text-grey-1">OpenAI</p>
          <p className="mt-2 text-sm text-grey-3">
            {appMode.hasOpenAI ? "Configured" : "Not configured"}
          </p>
        </div>
        <div className="rounded-lg border border-grey-5 bg-white/75 p-4">
          <p className="text-sm font-medium text-grey-1">Supabase</p>
          <p className="mt-2 text-sm text-grey-3">
            {appMode.hasSupabaseClient ? "Configured" : "Not configured"}
          </p>
        </div>
      </div>
    </div>
  );
}
