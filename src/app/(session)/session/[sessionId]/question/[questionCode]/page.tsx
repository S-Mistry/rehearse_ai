import { notFound } from "next/navigation";
import { QuestionWorkspace } from "@/components/question/question-workspace";
import { getSessionBundle } from "@/lib/rehearse/repositories/memory-store";
import { appMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function QuestionPage({
  params,
}: {
  params: { sessionId: string; questionCode: string };
}) {
  const bundle = await getSessionBundle(params.sessionId);
  if (!bundle) {
    notFound();
  }

  const question = bundle.questions.find(
    (item) => item.questionCode === params.questionCode,
  );
  if (!question) {
    notFound();
  }

  return (
    <QuestionWorkspace
      bundle={bundle}
      questionCode={params.questionCode}
      supportsVoiceTranscription={appMode.hasOpenAI}
    />
  );
}
