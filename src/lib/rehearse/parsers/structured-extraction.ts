import type {
  CvProfileStructured,
  JdProfileStructured,
} from "@/types/rehearse";

const competencyTerms = [
  "leadership",
  "conflict resolution",
  "ownership",
  "strategy",
  "stakeholder management",
  "execution",
  "innovation",
  "crisis management",
  "coaching",
  "prioritization",
];

export function extractCvLocally(rawText: string): {
  structured: CvProfileStructured;
  warnings: string[];
} {
  const text = normalizeText(rawText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

  const roleLines = lines.filter((line) =>
    /(manager|lead|engineer|analyst|director|consultant|product|operations)/i.test(
      line,
    ),
  );

  const roles = roleLines.slice(0, 4).map((line) => ({
    title: line,
    seniorityLevelEstimate: inferSeniority(line),
    durationMonths: inferDurationMonths(line),
    teamSizeManaged: inferTeamSize(line),
    scopeSummary: line,
  }));

  const quantifiedAchievements = lines
    .filter((line) => /\d/.test(line))
    .slice(0, 6)
    .map((line) => ({
      description: line,
      metricType: inferMetricType(line),
      value: line.match(/(\d+[%xkKmM]?)/)?.[1] ?? "metric noted",
      impactArea: inferImpactArea(line),
    }));

  const competencySignals = competencyTerms.filter((term) =>
    text.toLowerCase().includes(term),
  );

  const industryTags = [
    "saas",
    "finance",
    "healthcare",
    "retail",
    "education",
    "operations",
  ].filter((tag) => text.toLowerCase().includes(tag));

  const toolsMethods = [
    "sql",
    "excel",
    "jira",
    "tableau",
    "salesforce",
    "okrs",
    "rice",
    "agile",
  ].filter((tag) => text.toLowerCase().includes(tag));

  return {
    structured: {
      roles,
      quantifiedAchievements,
      competencySignals,
      industryTags,
      toolsMethods,
    },
    warnings: [
      roles.length === 0 ? "No role lines were confidently detected." : "",
      quantifiedAchievements.length === 0
        ? "No quantified achievements were confidently detected."
        : "",
    ].filter(Boolean),
  };
}

export function extractJdLocally(rawText: string): {
  structured: JdProfileStructured;
  warnings: string[];
} {
  const text = normalizeText(rawText).toLowerCase();
  const competencies = competencyTerms.filter((term) => text.includes(term));
  const performanceKeywords = [
    "scale",
    "stakeholder",
    "strategy",
    "metrics",
    "cross-functional",
    "leadership",
    "customer",
    "ownership",
  ].filter((term) => text.includes(term));

  const structured: JdProfileStructured = {
    coreCompetencies: competencies,
    leadershipExpectationLevel: text.includes("director")
      ? "director"
      : text.includes("manager")
        ? "manager"
        : text.includes("senior")
          ? "senior"
          : "individual_contributor",
    strategicVsExecutionWeight:
      text.includes("strategy") || text.includes("vision")
        ? "strategy-leaning"
        : "execution-leaning",
    stakeholderComplexityLevel:
      text.includes("cross-functional") || text.includes("executive")
        ? "high"
        : "moderate",
    performanceKeywords,
  };

  return {
    structured,
    warnings: competencies.length === 0 ? ["No obvious competency keywords were detected."] : [],
  };
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
}

function inferSeniority(value: string) {
  if (/director|head|vp/i.test(value)) return "director";
  if (/manager/i.test(value)) return "manager";
  if (/lead|principal|staff/i.test(value)) return "lead";
  if (/senior/i.test(value)) return "senior";
  return "mid";
}

function inferDurationMonths(value: string) {
  const yearMatch = value.match(/(\d+)\+?\s+years?/i);
  if (yearMatch) {
    return Number(yearMatch[1]) * 12;
  }
  return null;
}

function inferTeamSize(value: string) {
  const match = value.match(/team of (\d+)/i);
  return match ? Number(match[1]) : null;
}

function inferMetricType(value: string) {
  if (/%/.test(value)) return "percentage";
  if (/\$|£|€/.test(value)) return "currency";
  if (/\b\d+\b/.test(value)) return "count";
  return "mixed";
}

function inferImpactArea(value: string) {
  if (/revenue|sales|pipeline/i.test(value)) return "growth";
  if (/cost|efficiency|time/i.test(value)) return "efficiency";
  if (/churn|customer|nps|support/i.test(value)) return "customer";
  return "general";
}
