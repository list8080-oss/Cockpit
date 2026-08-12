import { invoke } from "@tauri-apps/api/core";
import type { OrchestratorAgentId } from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";
import type {
  AgentFanoutModels,
  AgentFanoutSessions,
  EngineReply,
} from "./types";
import { composeContextPackage, type AttachedFile } from "./contextPackage";

export type FanoutAgentResult =
  | { id: OrchestratorAgentId; ok: true; reply: EngineReply }
  | { id: OrchestratorAgentId; ok: false; error: string };

export type OrchestratorContext = "project" | "free";

export interface RunFanoutOptions {
  prompt: string;
  models: AgentFanoutModels;
  /** When set, each agent resumes its session (follow-up turns). */
  sessions?: Partial<AgentFanoutSessions>;
  /** Subset to run; defaults to all four. Empty is treated as all. */
  agents?: OrchestratorAgentId[];
  /** Working-directory context: project manuscript or free-chat sandbox. */
  context?: OrchestratorContext;
  /** Per-engine English role instructions prepended to `prompt` when set. */
  roleInstructions?: Partial<Record<OrchestratorAgentId, string>>;
  /** When true, append structured-result instruction to every engine prompt. */
  structuredResultEnabled?: boolean;
  /** Real project files attached to this turn — same set sent to every engine. */
  attachedFiles?: AttachedFile[];
  onAgentStart?: (id: OrchestratorAgentId) => void;
  onAgentResult?: (result: FanoutAgentResult) => void;
  /** Return false to skip applying late results after the user switched chats. */
  isStillActive?: () => boolean;
}

/**
 * Parallel one-shot / resume fan-out across selected agent CLIs.
 */
export async function runOrchestratorFanout(
  options: RunFanoutOptions,
): Promise<FanoutAgentResult[]> {
  const {
    prompt,
    models,
    sessions = {},
    agents,
    context = "project",
    roleInstructions,
    structuredResultEnabled,
    attachedFiles,
    onAgentStart,
    onAgentResult,
    isStillActive,
  } = options;

  const selected =
    agents && agents.length > 0
      ? ORCHESTRATOR_AGENT_IDS.filter((id) => agents.includes(id))
      : [...ORCHESTRATOR_AGENT_IDS];

  const runOne = async (id: OrchestratorAgentId): Promise<FanoutAgentResult> => {
    onAgentStart?.(id);
    const finalPrompt = composeContextPackage({
      task: prompt,
      roleInstruction: roleInstructions?.[id],
      attachedFiles,
      structuredResultRequested: structuredResultEnabled,
    });
    try {
      let reply: EngineReply;
      switch (id) {
        case "claude":
          reply = await invoke<EngineReply>("run_claude", {
            prompt: finalPrompt,
            sessionId: sessions.claude ?? null,
            model: models.claudeModel,
            effort: models.claudeEffort,
            context,
          });
          break;
        case "codex":
          reply = await invoke<EngineReply>("run_codex", {
            prompt: finalPrompt,
            sessionId: sessions.codex ?? null,
            model: models.codexModel,
            effort: models.codexEffort,
            context,
          });
          break;
        case "cursor":
          reply = await invoke<EngineReply>("run_cursor", {
            prompt: finalPrompt,
            sessionId: sessions.cursor ?? null,
            model: models.cursorModel,
            context,
          });
          break;
        case "opencode":
          reply = await invoke<EngineReply>("run_opencode", {
            prompt: finalPrompt,
            sessionId: sessions.opencode ?? null,
            model: models.opencodeModel,
            effort: models.opencodeEffort,
            context,
          });
          break;
      }
      const result: FanoutAgentResult = { id, ok: true, reply };
      if (!isStillActive || isStillActive()) onAgentResult?.(result);
      return result;
    } catch (e) {
      const result: FanoutAgentResult = { id, ok: false, error: String(e) };
      if (!isStillActive || isStillActive()) onAgentResult?.(result);
      return result;
    }
  };

  const settled = await Promise.all(selected.map((id) => runOne(id)));
  return settled;
}

export function summarizeFanoutResults(results: FanoutAgentResult[]): {
  answered: OrchestratorAgentId[];
  failed: OrchestratorAgentId[];
  unavailable: OrchestratorAgentId[];
} {
  const answered: OrchestratorAgentId[] = [];
  const failed: OrchestratorAgentId[] = [];
  const unavailable: OrchestratorAgentId[] = [];
  for (const r of results) {
    if (r.ok) {
      answered.push(r.id);
    } else {
      const msg = r.error.toLowerCase();
      if (
        msg.includes("not installed") ||
        msg.includes("not found") ||
        msg.includes("missing") ||
        msg.includes("enoent") ||
        msg.includes("no project connected")
      ) {
        unavailable.push(r.id);
      } else {
        failed.push(r.id);
      }
    }
  }
  return { answered, failed, unavailable };
}
