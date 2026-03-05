import type {
  CriterionAssessmentStatus,
  CvProfileStructured,
  DeliveryMetrics,
  EvaluationInput,
  JdProfileStructured,
  MissingComponent,
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
  expectedScoreFloor?: 1 | 2 | 3 | 4 | 5;
  expectedScoreCeiling?: 1 | 2 | 3 | 4 | 5;
  expectedCriteria?: Partial<Record<MissingComponent, CriterionAssessmentStatus>>;
  tags?: string[];
}

export const scoreModelSpikeCases: ScoreModelSpikeCase[] = [
  {
    id: "q1-strong-senior",
    label: "Strong senior leadership answer",
    questionCode: "Q1",
    seniorityLevel: "senior",
    transcript:
      "In my role as product lead, I was responsible for rescuing a delayed cross-functional launch when three teams were blocked on different dependencies. My goal was to get the launch back on track within six weeks without cutting the compliance scope. I led a reset with engineering, legal, and operations, mapped the critical path, and changed the plan so we shipped the highest-risk workflow first instead of trying to deliver every feature in one release. That trade-off let us protect the regulatory deadline while deferring lower-value polish items by two sprints. I also set up a daily decision log, aligned executives on escalation paths, and personally handled the vendor negotiation that was slowing us down. As a result, we launched on time, reduced onboarding drop-off by 18 percent in the first month, and avoided a projected four-week compliance slip. The broader impact was that the team reused the rollout playbook for two later launches. I learned that in ambiguous projects, explicit trade-offs and a single source of truth matter more than trying to keep everyone equally happy.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      tradeoff: "covered",
      reflection: "covered",
      strategic_layer: "covered",
    },
    tags: ["high_score_benchmark"],
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
    id: "q1-founder-implicit-valid",
    label: "Founder-style answer with implicit remit",
    questionCode: "Q1",
    seniorityLevel: "senior",
    transcript:
      "I founded a business for food allergy sufferers after seeing how often restaurants were working from outdated allergy matrices. I led the customer discovery with restaurant owners, kitchen staff, and diners, then turned the findings into an MVP that I piloted with one restaurant. I chose to remove the matrix entirely instead of trying to keep it updated because the risk sat in the handoff, not the document. We reduced waiter trips back to the kitchen on allergy orders from effectively 80 percent to zero. What I would do again is validate the staff workflow earlier because that made the pilot much easier to land.",
    expectedScoreFloor: 3,
    expectedScoreCeiling: 4,
    expectedCriteria: {
      task: "covered",
      ownership: "covered",
      tradeoff: "covered",
      reflection: "covered",
    },
    tags: ["implicit_but_valid", "ceiling_4"],
  },
  {
    id: "q1-keyword-trap",
    label: "Keyword-heavy leadership trap",
    questionCode: "Q1",
    seniorityLevel: "senior",
    transcript:
      "I led a challenging launch with a lot of stakeholders and pressure. I managed the team, prioritized what mattered, and we got it done successfully. It was a big trade-off and everyone learned a lot.",
    expectedScoreCeiling: 2,
    expectedCriteria: {
      action: "weak",
      result: "weak",
      tradeoff: "weak",
      metric: "missing",
    },
    tags: ["hard_fail", "false_positive_trap", "ceiling_3"],
  },
  {
    id: "q2-conflict-implicit-valid",
    label: "Conflict answer with implicit resistance",
    questionCode: "Q2",
    seniorityLevel: "manager_director",
    transcript:
      "I was managing a team that were introducing changes to an investment process. We scoped a new process that turned the investment decision around in 48 hours instead of four weeks. That created challenges for an adjacent team because their workload increased, so I met with the lead of that team and we discussed some options. We created a community for senior portfolio companies to coach founders and shifted the final pitch review closer to the pitch itself. That kept the faster process in place, cut operational overhead by over 500k, and the founders were happier because they received feedback much faster. I learned that in conflicts like this, you keep trust by solving the downstream pain rather than defending the original design.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 4,
    expectedCriteria: {
      ownership: "covered",
      action: "covered",
      resistance: "covered",
      reflection: "covered",
    },
    tags: ["implicit_but_valid", "ceiling_4"],
  },
  {
    id: "q2-conflict-keyword-trap",
    label: "Conflict buzzword trap",
    questionCode: "Q2",
    seniorityLevel: "mid_ic",
    transcript:
      "There was conflict and some pushback on a project. We talked about it, handled the resistance, and in the end the relationship was good. I learned communication matters.",
    expectedScoreCeiling: 2,
    expectedCriteria: {
      ownership: "missing",
      action: "weak",
      resistance: "weak",
      result: "weak",
    },
    tags: ["hard_fail", "false_positive_trap", "ceiling_3"],
  },
  {
    id: "q3-weak-ownership",
    label: "Weak failure answer",
    questionCode: "Q3",
    seniorityLevel: "mid_ic",
    transcript:
      "At the time we missed a release and it was a bad experience for everyone. The team had a lot happening and there were communication issues. We worked hard to fix the bugs and eventually things got better. The outcome was okay and the release went out later. I learned that communication matters.",
    expectedScoreCeiling: 2,
    expectedCriteria: {
      ownership: "missing",
      action: "weak",
      result: "weak",
    },
    tags: ["hard_fail", "ceiling_3"],
  },
  {
    id: "q4-mid-ambiguous",
    label: "Mid-level influence answer with gaps",
    questionCode: "Q4",
    seniorityLevel: "mid_ic",
    transcript:
      "When I was working on our reporting workflow, another team disagreed with my proposal because they thought it would slow them down. I needed to get alignment because the current process was breaking for customers and creating repeated manual work. I spoke with the engineering manager, gathered examples from support, and put together a lightweight proposal that showed the issues in the current flow. We discussed a couple of options and I kept pushing for the one that reduced the rework. In the end we moved ahead with a revised process and it improved how the teams worked together. Looking back, I learned I should have brought the other team in earlier.",
    expectedScoreFloor: 3,
    expectedScoreCeiling: 4,
    expectedCriteria: {
      resistance: "covered",
      metric: "missing",
      ownership: "covered",
    },
    tags: ["implicit_but_valid", "ceiling_4"],
  },
  {
    id: "q5-strong-data-decision",
    label: "Strong data decision answer",
    questionCode: "Q5",
    seniorityLevel: "mid_ic",
    transcript:
      "When trial conversion flattened, I owned the pricing recommendation for our self-serve funnel. I pulled cohort data from Amplitude, revenue data from Stripe, and support transcripts to understand where price sensitivity was highest. Instead of rolling out a blanket discount, I tested a narrower trial extension for lower-intent segments because the data showed high-intent users were already converting. Within three weeks, conversion in the target cohort improved from 11 percent to 16 percent and overall revenue held steady. That gave us a better decision rule for future pricing experiments.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      metric: "covered",
      ownership: "covered",
      result: "covered",
    },
    tags: ["high_score_benchmark"],
  },
  {
    id: "q6-ambiguity-strong",
    label: "Strong ambiguity answer",
    questionCode: "Q6",
    seniorityLevel: "senior",
    transcript:
      "We had to define a new onboarding process for a market where we had almost no historical data. I was responsible for shaping the first launch plan while legal and operations were still clarifying the constraints. I listed the assumptions that could break the launch, grouped them by risk, and ran two small manual pilots instead of building the full workflow immediately because I wanted evidence before we scaled the process. That trade-off slowed the first release by one sprint, but it prevented us from automating the wrong steps. As a result, we launched with zero compliance issues and reduced manual review time by 35 percent once the final workflow shipped.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      tradeoff: "covered",
      action: "covered",
      result: "covered",
    },
    tags: ["high_score_benchmark"],
  },
  {
    id: "q7-process-qualitative",
    label: "Process answer with qualitative result only",
    questionCode: "Q7",
    seniorityLevel: "mid_ic",
    transcript:
      "When handoffs kept breaking between support and operations, I was responsible for fixing the process. I introduced a single intake checklist and reviewed the queue with both teams each morning. As a result, both teams adopted the checklist and complaints stopped showing up in the weekly review. The process felt much calmer after that.",
    expectedScoreFloor: 3,
    expectedScoreCeiling: 3,
    expectedCriteria: {
      result: "covered",
      metric: "missing",
      ownership: "covered",
    },
    tags: ["ceiling_3"],
  },
  {
    id: "q8-prioritization-strong",
    label: "Strong competing priorities answer",
    questionCode: "Q8",
    seniorityLevel: "lead_principal",
    transcript:
      "During our busiest quarter, I was balancing a regulatory deadline, a large customer renewal, and a platform migration. I owned the sequencing decision across product, engineering, and support. I mapped the work by business risk and chose to defer three low-value migration tasks instead of squeezing them into the same window because missing the renewal would have hit revenue immediately. I delegated customer comms to one PM, kept the regulatory work on the critical path, and moved the migration cleanup to the next sprint. We kept the renewal, met the deadline, and finished the migration cleanup two weeks later without customer impact. I learned that making the trade-off explicit early prevents the team from pretending every priority is equal.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      tradeoff: "covered",
      ownership: "covered",
      reflection: "covered",
    },
    tags: ["high_score_benchmark"],
  },
  {
    id: "q9-feedback-strong",
    label: "Strong difficult feedback answer",
    questionCode: "Q9",
    seniorityLevel: "manager_director",
    transcript:
      "A high-performing manager on my team was losing trust because their feedback in planning reviews had become dismissive. I decided to address it quickly because the issue was starting to change how the team showed up. I prepared two concrete examples, met with them privately, and framed the conversation around the impact on the room rather than their intent. We agreed on a few changes to how they challenged ideas, and I checked in after the next two planning sessions. Within a month, the tone of the reviews improved, the manager started asking more open questions, and two PMs told me they felt safer speaking up again. I learned that difficult feedback lands better when you stay specific and tie it to a behavior the person can actually change.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      action: "covered",
      ownership: "covered",
      reflection: "covered",
    },
    tags: ["high_score_benchmark"],
  },
  {
    id: "q10-manager-fit",
    label: "Manager fit answer",
    questionCode: "Q10",
    seniorityLevel: "manager_director",
    transcript:
      "I am a strong fit for this role because I have built and led multi-disciplinary teams through scale-up conditions that match what your business needs now. In my previous role, I inherited a fragmented support and operations function across three regions, with inconsistent service levels and no clear ownership model. I was responsible for stabilizing execution while creating a structure that could support growth. I redesigned the team around regional leads, introduced weekly operating reviews, and paired service metrics with hiring and training decisions so managers had a clear basis for trade-offs. Instead of optimizing every queue at once, I prioritized the highest-volume customer issues first because that would have the biggest business impact in the first quarter. Within six months, SLA attainment improved from 71 percent to 93 percent, escalations dropped by 27 percent, and manager attrition fell materially because accountability was clearer. That work also gave executives a more reliable operating view, which helped with planning. What I would bring here is the same mix of operational rigor, coaching discipline, and calm decision-making under pressure.",
    expectedScoreFloor: 4,
    expectedScoreCeiling: 5,
    expectedCriteria: {
      tradeoff: "covered",
      strategic_layer: "covered",
      metric: "covered",
    },
    tags: ["high_score_benchmark"],
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
