import type { Locale } from "../i18n";
import { ORCHESTRATOR_AGENT_IDS, type OrchestratorMessage } from "../conversations";
import { agentDisplayName, formatOrchestratorMessage } from "./messages";
import type { AgentReplySnapshot } from "./buildSynthesisPrompt";

export interface FullAccessContextInput {
  orchestratorMessages: OrchestratorMessage[];
  locale: Locale;
  agents: AgentReplySnapshot[];
}

/**
 * A brand-new "Full access"/"Plan"/"Propose changes" session starts with
 * zero context by default — the Rust side only ever sees the literal text
 * typed into the composer, nothing else. Since InPrincipio's chat transcript
 * is deliberately terse (status lines, not full replies), prepend the actual
 * conversation so far plus each agent's full last reply on the first message
 * of a new session, so it isn't flying blind. Once a session exists, resume
 * (`-r`) already carries this forward, so callers only use this for the
 * first message. Returns `""` when there's nothing to prepend (a fresh
 * conversation with no prior agent replies) — the caller sends the bare
 * prompt in that case.
 */
export function buildFullAccessContext({
  orchestratorMessages,
  locale,
  agents,
}: FullAccessContextInput): string {
  const parts: string[] = [];
  if (orchestratorMessages.length > 0) {
    parts.push("Context — this Orchestrator conversation so far:");
    parts.push("");
    for (const m of orchestratorMessages) {
      const who = m.role === "user" ? "User" : "Orchestrator";
      parts.push(`[${who}] ${formatOrchestratorMessage(m, locale)}`);
    }
    parts.push("");
  }
  const answered = agents.filter((a) => a.replyText && a.state.status === "done");
  if (answered.length > 0) {
    parts.push("Full text of each agent's reply (the transcript above only shows status):");
    parts.push("");
    for (const agentId of ORCHESTRATOR_AGENT_IDS) {
      const snap = agents.find((a) => a.id === agentId);
      if (snap?.replyText && snap.state.status === "done") {
        parts.push(`### ${agentDisplayName(agentId)}`);
        parts.push(snap.replyText.trim());
        parts.push("");
      }
    }
  }
  if (parts.length === 0) return "";
  parts.push("## New request");
  return parts.join("\n");
}
