import type {
  CvProfileStructured,
  DeliveryMetrics,
  EvaluationInput,
  JdProfileStructured,
  QuestionCode,
  SeniorityLevel,
} from "../../src/types/rehearse";

export interface ScoreModelSpikeCase {
  id: string;
  label: string;
  questionCode: QuestionCode;
  seniorityLevel: SeniorityLevel;
  transcript: string;
  deliveryMetrics?: Partial<DeliveryMetrics>;
  cvSummary?: CvProfileStructured | null;
  jdSummary?: JdProfileStructured | null;
}

export const scoreModelSpikeCases: ScoreModelSpikeCase[] = [
  {
    id: "q1-strong-senior",
    label: "Strong senior leadership answer",
    questionCode: "Q1",
    seniorityLevel: "senior",
    transcript:
      "In my role as product lead, I was responsible for rescuing a delayed cross-functional launch when three teams were blocked on different dependencies. My goal was to get the launch back on track within six weeks without cutting the compliance scope. I led a reset with engineering, legal, and operations, mapped the critical path, and changed the plan so we shipped the highest-risk workflow first instead of trying to deliver every feature in one release. That trade-off let us protect the regulatory deadline while deferring lower-value polish items by two sprints. I also set up a daily decision log, aligned executives on escalation paths, and personally handled the vendor negotiation that was slowing us down. As a result, we launched on time, reduced onboarding drop-off by 18 percent in the first month, and avoided a projected four-week compliance slip. The broader impact was that the team reused the rollout playbook for two later launches. I learned that in ambiguous projects, explicit trade-offs and a single source of truth matter more than trying to keep everyone equally happy.",
    cvSummary: {
      roles: [
        {
          title: "Senior Product Lead",
          seniorityLevelEstimate: "senior",
          durationMonths: 30,
          teamSizeManaged: 8,
          scopeSummary: "Led cross-functional platform launches in a regulated environment.",
        },
      ],
      quantifiedAchievements: [
        {
          description: "Cut onboarding drop-off by 18 percent on a flagship launch.",
          metricType: "conversion",
          value: "18%",
          impactArea: "growth",
        },
      ],
      competencySignals: ["leadership", "cross-functional execution"],
      industryTags: ["fintech"],
      toolsMethods: ["roadmapping", "stakeholder alignment"],
    },
  },
  {
    id: "q4-mid-ambiguous",
    label: "Mid-level influence answer with gaps",
    questionCode: "Q4",
    seniorityLevel: "mid_ic",
    transcript:
      "When I was working on our reporting workflow, another team disagreed with my proposal because they thought it would slow them down. I needed to get alignment because the current process was breaking for customers and creating repeated manual work. I spoke with the engineering manager, gathered examples from support, and put together a lightweight proposal that showed the issues in the current flow. We discussed a couple of options and I kept pushing for the one that reduced the rework. In the end we moved ahead with a revised process and it improved how the teams worked together. Looking back, I learned I should have brought the other team in earlier.",
  },
  {
    id: "q3-weak-ownership",
    label: "Weak failure answer",
    questionCode: "Q3",
    seniorityLevel: "mid_ic",
    transcript:
      "At the time we missed a release and it was a bad experience for everyone. The team had a lot happening and there were communication issues. We worked hard to fix the bugs and eventually things got better. The outcome was okay and the release went out later. I learned that communication matters.",
  },
  {
    id: "q10-manager-fit",
    label: "Manager fit answer",
    questionCode: "Q10",
    seniorityLevel: "manager_director",
    transcript:
      "I am a strong fit for this role because I have built and led multi-disciplinary teams through scale-up conditions that match what your business needs now. In my previous role, I inherited a fragmented support and operations function across three regions, with inconsistent service levels and no clear ownership model. I was responsible for stabilizing execution while creating a structure that could support growth. I redesigned the team around regional leads, introduced weekly operating reviews, and paired service metrics with hiring and training decisions so managers had a clear basis for trade-offs. Instead of optimizing every queue at once, I prioritized the highest-volume customer issues first because that would have the biggest business impact in the first quarter. Within six months, SLA attainment improved from 71 percent to 93 percent, escalations dropped by 27 percent, and manager attrition fell materially because accountability was clearer. That work also gave executives a more reliable operating view, which helped with planning. What I would bring here is the same mix of operational rigor, coaching discipline, and calm decision-making under pressure.",
    jdSummary: {
      coreCompetencies: ["operational leadership", "stakeholder management", "service design"],
      leadershipExpectationLevel: "manager_director",
      strategicVsExecutionWeight: "balanced",
      stakeholderComplexityLevel: "high",
      performanceKeywords: ["scale", "service quality", "org design"],
    },
  },
];

export function applySpikeCaseDefaults(
  input: ScoreModelSpikeCase,
  question: EvaluationInput["question"],
): EvaluationInput {
  const durationSeconds =
    input.deliveryMetrics?.durationSeconds ??
    Math.max(45, Math.round(input.transcript.split(/\s+/).length / 2));
  const wordCount = input.transcript.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = Math.round((wordCount / durationSeconds) * 60);

  return {
    question,
    transcript: input.transcript,
    seniorityLevel: input.seniorityLevel,
    seniorityMultiplier:
      input.seniorityLevel === "early_career"
        ? 0.9
        : input.seniorityLevel === "mid_ic"
          ? 1
          : input.seniorityLevel === "senior"
            ? 1.2
            : input.seniorityLevel === "lead_principal"
              ? 1.3
              : 1.5,
    deliveryMetrics: {
      durationSeconds,
      wordCount,
      fillerCount: input.deliveryMetrics?.fillerCount ?? 0,
      fillerRate: input.deliveryMetrics?.fillerRate ?? 0,
      wordsPerMinute,
      longPauseCount: input.deliveryMetrics?.longPauseCount ?? 0,
      pauseEvents: input.deliveryMetrics?.pauseEvents ?? [],
      fragmentationScore: input.deliveryMetrics?.fragmentationScore ?? 1,
    },
    previousAttempts: [],
    cvSummary: input.cvSummary ?? null,
    jdSummary: input.jdSummary ?? null,
  };
}
