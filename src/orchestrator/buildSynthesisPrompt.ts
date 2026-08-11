import type { ConversationTurn, OrchestratorAgentId, OrchestratorMessage } from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";
import { agentDisplayName } from "./messages";
import type { AgentRunState } from "./types";
import type { StructuredResult } from "./structuredResult";

export interface AgentReplySnapshot {
  id: OrchestratorAgentId;
  /** Last successful assistant text, if any. */
  replyText: string | null;
  state: AgentRunState;
  /** Optional parsed self-assessment from structured-result mode. */
  structured?: StructuredResult | null;
}

export interface SynthesisPromptInput {
  /** User fragment / request from this round. */
  sourceText: string;
  agents: AgentReplySnapshot[];
}

export function lastAssistantText(history: ConversationTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    if (turn.role === "assistant" && turn.text.trim()) return turn.text;
  }
  return null;
}

export function successfulSynthesisAgents(
  agents: AgentReplySnapshot[],
): AgentReplySnapshot[] {
  return agents.filter((a) => a.replyText && a.state.status === "done");
}

/** At least two successful replies are required before synthesis is useful. */
export function canRunSynthesis(agents: AgentReplySnapshot[]): boolean {
  return successfulSynthesisAgents(agents).length >= 2;
}

/**
 * The most recent user request in the current round of the Orchestrator
 * transcript — what synthesis should treat as "the question everyone
 * answered". Falls back to the conversation's original prompt (passed in by
 * the caller) when the transcript has no `"user"` message yet, e.g. right
 * after opening a conversation from History before sending anything new.
 */
export function lastUserRoundText(
  orchestratorMessages: OrchestratorMessage[],
  fallbackPrompt: string,
): string {
  for (let i = orchestratorMessages.length - 1; i >= 0; i -= 1) {
    const msg = orchestratorMessages[i];
    if (msg.kind === "user" && msg.text.trim()) return msg.text;
  }
  return fallbackPrompt;
}

/**
 * Build a one-shot prompt for Claude that compares agent replies.
 * Pure string assembly — no network, no session.
 */
export function buildSynthesisPrompt(input: SynthesisPromptInput): string {
  const answered = successfulSynthesisAgents(input.agents);
  const missing = input.agents.filter((a) => !answered.some((ok) => ok.id === a.id));

  const parts: string[] = [];
  parts.push(
    "You are comparing replies from several writing assistants about the same user request.",
  );
  parts.push(
    "Write a short practical conclusion in the same language as the user request.",
  );
  parts.push(
    "Do NOT retell each reply in full. Compare approaches, note real disagreements, and recommend what to use.",
  );
  if (missing.length > 0) {
    parts.push(
      "Important: not every agent answered. Say clearly that your conclusion is based only on the replies you received, and name who is missing.",
    );
  }
  parts.push("");
  parts.push("## User request");
  parts.push(input.sourceText.trim() || "(empty)");
  parts.push("");
  parts.push("## Agent replies");

  for (const agent of ORCHESTRATOR_AGENT_IDS) {
    const snap = input.agents.find((a) => a.id === agent);
    if (!snap) continue;
    const label = agentDisplayName(agent);
    if (snap.replyText && snap.state.status === "done") {
      parts.push(`### ${label}`);
      parts.push(snap.replyText.trim());
      if (snap.structured) {
        const s = snap.structured;
        parts.push(
          `(self-assessment: confidence=${s.confidence}; needsConfirmation=${s.needsConfirmation}` +
            (s.issues.length ? `; issues: ${s.issues.join("; ")}` : "") +
            (s.suggestions.length
              ? `; suggestions: ${s.suggestions.join("; ")}`
              : "") +
            ")",
        );
      }
      parts.push("");
    } else if (snap.state.status === "error") {
      parts.push(`### ${label}`);
      parts.push(`(no reply — error: ${snap.state.message})`);
      parts.push("");
    } else {
      parts.push(`### ${label}`);
      parts.push("(no reply — unavailable or not finished)");
      parts.push("");
    }
  }

  parts.push("## Your task");
  parts.push(
    "Compare the available replies and give a concise practical conclusion for the author.",
  );
  return parts.join("\n");
}
