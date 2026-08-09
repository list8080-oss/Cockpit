import type { Locale } from "../i18n";
import { t } from "../i18n";
import type {
  OrchestratorAgentId,
  OrchestratorMessage,
} from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";

function newId(): string {
  return crypto.randomUUID();
}

export function createUserMessage(text: string): OrchestratorMessage {
  return {
    id: newId(),
    role: "user",
    kind: "user",
    createdAt: Date.now(),
    text,
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

const AGENT_LABEL: Record<OrchestratorAgentId, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  opencode: "OpenCode",
};

export function agentDisplayName(id: OrchestratorAgentId): string {
  return AGENT_LABEL[id];
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
    default:
      return message.text;
  }
}

export function legacyMessagesFromConversation(prompt: string): OrchestratorMessage[] {
  if (!prompt.trim()) return [];
  return [createUserMessage(prompt)];
}
