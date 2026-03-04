import type { JdProfileStructured, SeniorityLevel, StoredDocumentProfile } from "@/types/rehearse";

export function mapJdLeadershipToSeniority(
  leadershipExpectationLevel?: string | null,
): SeniorityLevel | null {
  const value = leadershipExpectationLevel?.toLowerCase().trim();
  if (!value) {
    return null;
  }

  if (value.includes("director") || value.includes("manager")) {
    return "manager_director";
  }

  if (
    value.includes("principal") ||
    value.includes("staff") ||
    value.includes("lead")
  ) {
    return "lead_principal";
  }

  if (value.includes("senior")) {
    return "senior";
  }

  if (
    value.includes("individual_contributor") ||
    value.includes("ic") ||
    value.includes("mid")
  ) {
    return "mid_ic";
  }

  if (value.includes("early") || value.includes("junior") || value.includes("associate")) {
    return "early_career";
  }

  return null;
}

export function inferSeniorityFromJdDocument(
  document: StoredDocumentProfile | null | undefined,
): SeniorityLevel | null {
  if (!document || document.kind !== "jd") {
    return null;
  }

  return mapJdLeadershipToSeniority(
    (document.structuredJson as JdProfileStructured).leadershipExpectationLevel,
  );
}
