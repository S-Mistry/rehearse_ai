import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="paper-panel rounded-xl p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Sign in</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          Authentication is scaffolded for Supabase.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          Until env vars are configured, the app runs with a demo user so you can review the rehearsal flow end-to-end.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-grey-1 px-5 py-3 text-sm text-white transition hover:bg-grey-2"
        >
          Continue to dashboard
        </Link>
      </div>
    </div>
  );
}
