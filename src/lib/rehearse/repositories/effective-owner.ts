import type { EffectiveOwnerId } from "@/types/rehearse";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export function getEffectiveOwnerId(): EffectiveOwnerId {
  return DEMO_USER_ID;
}
