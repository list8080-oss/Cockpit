/** Shared conversation persistence for agents + orchestrator. */

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  /** Optional — absent on turns saved before this field existed. */
  createdAt?: number;
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
  | "agent_full_access_error"
  /** Plan-mode Orchestrator agent reply (read/investigate only; no writes). */
  | "agent_plan"
  /** Failed plan-mode agent call — `text` holds the error reason. */
  | "agent_plan_error"
  /** Propose-changes reply: summary + file diffs (apply/reject/rollback in UI). */
  | "agent_proposal"
  /** Failed propose-changes call — `text` holds the error reason. */
  | "agent_proposal_error"
  /** A real Bash call the full-access agent made to a sibling CLI — see `delegation`. */
  | "agent_delegation";

/** Mirror of Rust `FileDiff` from `run_orchestrator_propose`. */
export interface FileDiff {
  path: string;
  /** `null` if the file does not exist yet (new-file proposal). */
  oldContent: string | null;
  newContent: string;
  /** Unified diff text ready to display. */
  diff: string;
}

/** Per-file apply/reject/rollback status for an `agent_proposal` message. */
export type ProposalChangeStatus =
  | { state: "pending" }
  | { state: "applying" }
  | { state: "applied"; journalId: string }
  | { state: "applyError"; error: string }
  | { state: "rejected" }
  | { state: "rollingBack"; journalId: string }
  | { state: "rolledBack" }
  | { state: "rollbackError"; error: string; journalId: string };

export interface DelegatedCall {
  /** Binary name as invoked: "codex" | "cursor-agent" | "opencode" | "claude". */
  agent: string;
  command: string;
  output: string;
  isError: boolean;
}

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
  delegation?: DelegatedCall;
  /** Propose-mode file diffs (kind === "agent_proposal"). */
  proposalChanges?: FileDiff[];
  /** Context the proposal was generated in — apply must use this, not the live toggle. */
  proposalContext?: "project" | "free";
  /** Profile active when the proposal was generated (only set when
   * proposalContext === "project") — apply/rollback must use this, not
   * whichever profile happens to be active now, or a proposal generated for
   * one project could get silently applied to a different one if the user
   * switched profiles in between. */
  proposalProfileId?: string | null;
  /** Per-path apply/reject/rollback status for proposal files. */
  proposalChangeStatus?: Record<string, ProposalChangeStatus>;
  /** Labels of project files attached to this turn (user messages only). */
  attachedFiles?: { label: string }[];
}

export interface OrchestratorThread {
  messages: OrchestratorMessage[];
  /** Persisted Full-access Claude session id (mode itself is not persisted). */
  fullAccessSessionId?: string | null;
  /** Last selected Orchestrator context for this conversation. */
  context?: "project" | "free";
  /** Agents selected for normal fan-out; omit = all. */
  selectedAgents?: OrchestratorAgentId[];
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

/**
 * Bumped whenever the stored shape of `AgentConversation` changes in a way
 * that isn't just an additive optional field (those are handled by the
 * backfill below regardless of version). `loadConversations` always accepts
 * both the pre-versioning bare-array format still sitting in existing
 * users' localStorage and the current envelope, so this alone never breaks
 * old data — real reshapes still need their own migration step added here.
 */
export const CONVERSATIONS_SCHEMA_VERSION = 1;

interface ConversationsEnvelope {
  version: number;
  conversations: unknown[];
}

export function emptyEngineThread(): EngineThread {
  return { history: [], sessionId: null };
}

export function emptyOrchestratorThread(): OrchestratorThread {
  return {
    messages: [],
    fullAccessSessionId: null,
    context: "project",
    selectedAgents: [...ORCHESTRATOR_AGENT_IDS],
  };
}

// Backfill fields added in later versions so older history still loads.
function backfillConversation(c: any): AgentConversation {
  return {
    ...c,
    opencode: c.opencode ?? emptyEngineThread(),
    orchestrator: c.orchestrator ?? emptyOrchestratorThread(),
  };
}

export function loadConversations(): AgentConversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Pre-versioning format: a bare array, written by every build before
    // the envelope was introduced.
    if (Array.isArray(parsed)) {
      return parsed.map(backfillConversation);
    }
    // Versioned envelope.
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as ConversationsEnvelope).conversations)) {
      return (parsed as ConversationsEnvelope).conversations.map(backfillConversation);
    }
    return [];
  } catch {
    return [];
  }
}

export function persistConversations(list: AgentConversation[]) {
  try {
    const envelope: ConversationsEnvelope = {
      version: CONVERSATIONS_SCHEMA_VERSION,
      conversations: list.slice(0, MAX_STORED_CONVERSATIONS),
    };
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(envelope));
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
