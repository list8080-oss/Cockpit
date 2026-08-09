import { invoke } from "@tauri-apps/api/core";
import type { OrchestratorAgentId } from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";
import type {
  AgentFanoutModels,
  AgentFanoutSessions,
  EngineReply,
} from "./types";

export type FanoutAgentResult =
  | { id: OrchestratorAgentId; ok: true; reply: EngineReply }
  | { id: OrchestratorAgentId; ok: false; error: string };

export interface RunFanoutOptions {
  prompt: string;
  models: AgentFanoutModels;
  /** When set, each agent resumes its session (follow-up turns). */
  sessions?: Partial<AgentFanoutSessions>;
  onAgentStart?: (id: OrchestratorAgentId) => void;
  onAgentResult?: (result: FanoutAgentResult) => void;
  /** Return false to skip applying late results after the user switched chats. */
  isStillActive?: () => boolean;
}

/**
 * Parallel one-shot / resume fan-out across the supported agent CLIs.
 * Does not choose agents intelligently — runs the fixed set the app supports.
 */
export async function runOrchestratorFanout(
  options: RunFanoutOptions,
): Promise<FanoutAgentResult[]> {
  const { prompt, models, sessions = {}, onAgentStart, onAgentResult, isStillActive } =
    options;

  const runOne = async (id: OrchestratorAgentId): Promise<FanoutAgentResult> => {
    onAgentStart?.(id);
    try {
      let reply: EngineReply;
      switch (id) {
        case "claude":
          reply = await invoke<EngineReply>("run_claude", {
            prompt,
            sessionId: sessions.claude ?? null,
            model: models.claudeModel,
            effort: models.claudeEffort,
          });
          break;
        case "codex":
          reply = await invoke<EngineReply>("run_codex", {
            prompt,
            sessionId: sessions.codex ?? null,
            model: models.codexModel,
            effort: models.codexEffort,
          });
          break;
        case "cursor":
          reply = await invoke<EngineReply>("run_cursor", {
            prompt,
            sessionId: sessions.cursor ?? null,
            model: models.cursorModel,
          });
          break;
        case "opencode":
          reply = await invoke<EngineReply>("run_opencode", {
            prompt,
            sessionId: sessions.opencode ?? null,
            model: models.opencodeModel,
            effort: models.opencodeEffort,
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

  const settled = await Promise.all(
    ORCHESTRATOR_AGENT_IDS.map((id) => runOne(id)),
  );
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
        msg.includes("ENOENT")
      ) {
        unavailable.push(r.id);
      } else {
        failed.push(r.id);
      }
    }
  }
  return { answered, failed, unavailable };
}
