export type { OrchestratorAgentId } from "../conversations";
export { ORCHESTRATOR_AGENT_IDS } from "../conversations";

export type AgentRunState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done" }
  | { status: "error"; message: string };

/** Visual lamp on a collapsed agent panel (not the auth-only EngineLamp). */
export type AgentPanelLamp = "ready" | "running" | "attention" | "error" | "offline";

export interface AgentAuthSnapshot {
  id: string;
  installed: boolean;
  loggedIn: boolean;
  account: string | null;
}

export interface AgentFanoutModels {
  claudeModel: string;
  claudeEffort: string;
  codexModel: string;
  codexEffort: string;
  cursorModel: string;
  opencodeModel: string;
  opencodeEffort: string;
}

export interface AgentFanoutSessions {
  claude: string | null;
  codex: string | null;
  cursor: string | null;
  opencode: string | null;
}

export interface EngineReply {
  text: string;
  sessionId: string | null;
}
