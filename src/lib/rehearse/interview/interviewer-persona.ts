import type { QuestionBankItem } from "@/types/rehearse";

export const interviewerName = "Lucy";
export const interviewerVoice = "marin";

export type InterviewerSpeechMode = "intro" | "follow_up" | "feedback";

export function buildInterviewerIntro(question: Pick<QuestionBankItem, "prompt">) {
  return `Hi, I'm ${interviewerName}. I'll ask one question at a time, and I may ask one follow-up before I score your answer. First question: ${question.prompt}`;
}

export function buildInterviewerFollowUp(followUpPrompt: string) {
  return `Thanks. One follow-up before I score it: ${followUpPrompt}`;
}

export function buildInterviewerFeedback(spokenRecap: string) {
  const normalized = spokenRecap.trim();
  if (!normalized) {
    return "Here's my feedback.";
  }

  if (/^here'?s my feedback[.:!]?/i.test(normalized)) {
    return normalized;
  }

  return `Here's my feedback. ${normalized}`;
}

export function getInterviewerSpeechInstructions(mode: InterviewerSpeechMode) {
  switch (mode) {
    case "intro":
      return `You are ${interviewerName}, a calm and focused interviewer. Deliver the question clearly and confidently without sounding theatrical.`;
    case "follow_up":
      return `You are ${interviewerName}, a calm and focused interviewer. Ask the follow-up concisely and leave space for the candidate to answer.`;
    case "feedback":
      return `You are ${interviewerName}, a measured interviewer. Deliver the feedback clearly, professionally, and without sounding harsh.`;
    default:
      return `You are ${interviewerName}, a calm and professional interviewer.`;
  }
}
