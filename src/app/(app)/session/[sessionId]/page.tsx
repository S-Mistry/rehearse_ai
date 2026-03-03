import { notFound, redirect } from "next/navigation";
import { getSessionBundle } from "@/lib/rehearse/repositories/memory-store";

export default function SessionRedirectPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const bundle = getSessionBundle(params.sessionId);
  if (!bundle) {
    notFound();
  }

  const activeQuestion = bundle.questions.find(
    (question) => question.status === "active" || question.status === "awaiting_retry",
  );

  if (activeQuestion) {
    redirect(`/session/${params.sessionId}/question/${activeQuestion.questionCode}`);
  }

  redirect(`/session/${params.sessionId}/summary`);
}
