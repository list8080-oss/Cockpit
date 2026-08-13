import type { OrchestratorContext } from "./runFanout";

/** One localStorage flag per direction — shown once each, independently, the
 * same pattern as the writing editor's `writing-editor-onboarding-v2`
 * (versioned key so a future copy change can force a re-show without a real
 * migration step). */
const CONTEXT_TIP_KEY_PREFIX = "yar-cockpit.orchestratorContextTip.v1.";

function contextTipKey(direction: OrchestratorContext): string {
  return `${CONTEXT_TIP_KEY_PREFIX}${direction}`;
}

export function isContextTipSeen(direction: OrchestratorContext): boolean {
  try {
    return localStorage.getItem(contextTipKey(direction)) === "1";
  } catch {
    return false;
  }
}

export function markContextTipSeen(direction: OrchestratorContext): void {
  try {
    localStorage.setItem(contextTipKey(direction), "1");
  } catch {
    /* ignore */
  }
}
