import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="paper-panel rounded-xl p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-grey-4">Create account</p>
        <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight">
          Supabase auth is ready to wire in.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-grey-3">
          The production architecture expects email magic link and Google OAuth. For now, the rehearsal workspace is accessible in demo mode.
        </p>
        <Link
          href="/setup"
          className="mt-8 inline-flex rounded-full bg-grey-1 px-5 py-3 text-sm text-white transition hover:bg-grey-2"
        >
          Go to setup
        </Link>
      </div>
    </div>
  );
}
