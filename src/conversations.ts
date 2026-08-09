/** Shared conversation persistence for agents + orchestrator. */

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export interface EngineThread {
  history: ConversationTurn[];
  sessionId: string | null;
}

export type OrchestratorMessageKind =
  | "user"
  | "dispatched"
  | "completed"
  /** Real synthesis of agent replies (Orchestrator phase 2). */
  | "synthesis"
  /** Failed synthesis call — `text` holds the error reason. */
  | "synthesis_error"
  /** Full-access Orchestrator agent reply (phase 3; may have written files). */
  | "agent_full_access"
  /** Failed full-access agent call — `text` holds the error reason. */
  | "agent_full_access_error";

export type OrchestratorAgentId = "claude" | "codex" | "cursor" | "opencode";

export const ORCHESTRATOR_AGENT_IDS: OrchestratorAgentId[] = [
  "claude",
  "codex",
  "cursor",
  "opencode",
];

export interface OrchestratorMessage {
  id: string;
  role: "user" | "orchestrator";
  kind: OrchestratorMessageKind;
  createdAt: number;
  /** Plain text for user messages; optional fallback for orchestrator. */
  text: string;
  agents?: OrchestratorAgentId[];
  answered?: OrchestratorAgentId[];
  failed?: OrchestratorAgentId[];
  unavailable?: OrchestratorAgentId[];
}

export interface OrchestratorThread {
  messages: OrchestratorMessage[];
}

export interface AgentConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  prompt: string;
  claude: EngineThread;
  codex: EngineThread;
  cursor: EngineThread;
  opencode: EngineThread;
  /** Present on conversations created after the Orchestrator module. */
  orchestrator?: OrchestratorThread;
}

export const CONVERSATIONS_STORAGE_KEY = "yar-cockpit.agentConversations";
export const ACTIVE_CONVERSATION_STORAGE_KEY = "yar-cockpit.activeConversationId";
export const MAX_STORED_CONVERSATIONS = 100;

export function emptyEngineThread(): EngineThread {
  return { history: [], sessionId: null };
}

export function emptyOrchestratorThread(): OrchestratorThread {
  return { messages: [] };
}

export function loadConversations(): AgentConversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill fields added in later versions so older history still loads.
    return parsed.map((c) => ({
      ...c,
      opencode: c.opencode ?? emptyEngineThread(),
      orchestrator: c.orchestrator ?? emptyOrchestratorThread(),
    }));
  } catch {
    return [];
  }
}

export function persistConversations(list: AgentConversation[]) {
  try {
    localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_STORED_CONVERSATIONS)),
    );
  } catch {
    /* ignore (e.g. storage quota) */
  }
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function persistActiveConversationId(id: string | null) {
  try {
    localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id ?? "");
  } catch {
    /* ignore */
  }
}

export function conversationTitle(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "…";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}
