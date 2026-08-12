import type { Locale } from "../i18n";
import { t } from "../i18n";
import type {
  DelegatedCall,
  FileDiff,
  OrchestratorAgentId,
  OrchestratorMessage,
} from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";

function newId(): string {
  return crypto.randomUUID();
}

export function createUserMessage(
  text: string,
  attachedFiles?: { label: string }[],
): OrchestratorMessage {
  return {
    id: newId(),
    role: "user",
    kind: "user",
    createdAt: Date.now(),
    text,
    ...(attachedFiles && attachedFiles.length > 0 ? { attachedFiles } : {}),
  };
}

export function createDispatchedMessage(
  agents: OrchestratorAgentId[] = ORCHESTRATOR_AGENT_IDS,
): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "dispatched",
    createdAt: Date.now(),
    text: "",
    agents: [...agents],
  };
}

export function createCompletedMessage(input: {
  answered: OrchestratorAgentId[];
  failed: OrchestratorAgentId[];
  unavailable: OrchestratorAgentId[];
}): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "completed",
    createdAt: Date.now(),
    text: "",
    answered: input.answered,
    failed: input.failed,
    unavailable: input.unavailable,
  };
}

export function createSynthesisMessage(text: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "synthesis",
    createdAt: Date.now(),
    text,
  };
}

export function createSynthesisErrorMessage(error: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "synthesis_error",
    createdAt: Date.now(),
    text: error,
  };
}

export function createAgentFullAccessMessage(text: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_full_access",
    createdAt: Date.now(),
    text,
  };
}

export function createAgentFullAccessErrorMessage(
  error: string,
): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_full_access_error",
    createdAt: Date.now(),
    text: error,
  };
}

export function createAgentPlanMessage(text: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_plan",
    createdAt: Date.now(),
    text,
  };
}

export function createAgentPlanErrorMessage(error: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_plan_error",
    createdAt: Date.now(),
    text: error,
  };
}

export function createAgentProposalMessage(
  summary: string,
  changes: FileDiff[],
  context: "project" | "free",
): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_proposal",
    createdAt: Date.now(),
    text: summary,
    proposalChanges: changes,
    proposalContext: context,
  };
}

export function createAgentProposalErrorMessage(
  error: string,
): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_proposal_error",
    createdAt: Date.now(),
    text: error,
  };
}

export function createDelegationMessage(call: DelegatedCall): OrchestratorMessage {
  return {
    id: newId(),
    role: "orchestrator",
    kind: "agent_delegation",
    createdAt: Date.now(),
    text: "",
    delegation: call,
  };
}

const AGENT_LABEL: Record<OrchestratorAgentId, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  opencode: "OpenCode",
};

export function agentDisplayName(id: OrchestratorAgentId): string {
  return AGENT_LABEL[id];
}

/** Maps a raw invoked binary name (from a Bash call) to a display name —
 * `cursor-agent` is the CLI binary, "Cursor" is what the rest of the UI
 * calls it everywhere else. Falls back to the raw name if unrecognized. */
const DELEGATED_BINARY_LABEL: Record<string, OrchestratorAgentId> = {
  claude: "claude",
  codex: "codex",
  "cursor-agent": "cursor",
  opencode: "opencode",
};

export function delegatedAgentLabel(binary: string): string {
  const id = DELEGATED_BINARY_LABEL[binary];
  return id ? agentDisplayName(id) : binary;
}

function joinNames(ids: OrchestratorAgentId[]): string {
  return ids.map(agentDisplayName).join(", ");
}

/** Render a stored orchestrator message with the active locale. */
export function formatOrchestratorMessage(
  message: OrchestratorMessage,
  locale: Locale,
): string {
  switch (message.kind) {
    case "user":
      return message.text;
    case "dispatched": {
      const names = joinNames(message.agents ?? ORCHESTRATOR_AGENT_IDS);
      return `${t(locale, "orchestratorDispatched")}\n${t(locale, "orchestratorAgentsList", { agents: names })}`;
    }
    case "completed": {
      const lines = [t(locale, "orchestratorCompleted")];
      if (message.answered && message.answered.length > 0) {
        lines.push(
          t(locale, "orchestratorWhoAnswered", {
            agents: joinNames(message.answered),
          }),
        );
      }
      if (message.failed && message.failed.length > 0) {
        lines.push(
          t(locale, "orchestratorWhoFailed", {
            agents: joinNames(message.failed),
          }),
        );
      }
      if (message.unavailable && message.unavailable.length > 0) {
        lines.push(
          t(locale, "orchestratorWhoUnavailable", {
            agents: joinNames(message.unavailable),
          }),
        );
      }
      lines.push(t(locale, "orchestratorSeePanels"));
      return lines.join("\n");
    }
    case "synthesis":
      return message.text;
    case "synthesis_error":
      return t(locale, "orchestratorSynthesisError", { error: message.text });
    case "agent_full_access":
      return message.text;
    case "agent_full_access_error":
      return t(locale, "orchestratorFullAccessError", { error: message.text });
    case "agent_plan":
      return `${t(locale, "orchestratorPlanPreface")}\n\n${message.text}`;
    case "agent_plan_error":
      return t(locale, "orchestratorPlanError", { error: message.text });
    case "agent_proposal": {
      const paths = (message.proposalChanges ?? []).map((c) => c.path);
      const lines = [message.text.trim()].filter(Boolean);
      if (paths.length > 0) {
        lines.push(paths.join(", "));
      }
      return lines.join("\n");
    }
    case "agent_proposal_error":
      return t(locale, "orchestratorProposeError", { error: message.text });
    case "agent_delegation": {
      const call = message.delegation;
      if (!call) return message.text;
      return [`$ ${call.command}`, "", call.output].join("\n");
    }
    default:
      return message.text;
  }
}

export function legacyMessagesFromConversation(prompt: string): OrchestratorMessage[] {
  if (!prompt.trim()) return [];
  return [createUserMessage(prompt)];
}
