import type { MessageKey } from "../i18n";
import type { AgentAuthSnapshot, AgentPanelLamp, AgentRunState } from "./types";

/** Collapsed-panel lamp from real auth readiness + run state. */
export function agentPanelLamp(
  auth: AgentAuthSnapshot | undefined,
  state: AgentRunState,
  authLoading: boolean,
): AgentPanelLamp {
  if (state.status === "running") return "running";
  if (state.status === "error") return "error";
  if (authLoading) return "offline";
  if (!auth || !auth.installed) return "offline";
  if (!auth.loggedIn) return "attention";
  if (state.status === "done" || state.status === "idle") return "ready";
  return "offline";
}

export function agentPanelStatusKey(
  auth: AgentAuthSnapshot | undefined,
  state: AgentRunState,
  authLoading: boolean,
): MessageKey {
  if (state.status === "running") return "orchestratorStatusRunning";
  if (state.status === "error") return "orchestratorStatusError";
  if (authLoading) return "authChecking";
  if (!auth || !auth.installed) return "orchestratorStatusUnavailable";
  if (!auth.loggedIn) return "orchestratorStatusNeedsAuth";
  if (state.status === "done") return "orchestratorStatusDone";
  return "orchestratorStatusReady";
}
