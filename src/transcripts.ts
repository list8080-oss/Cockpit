import { invoke } from "@tauri-apps/api/core";
import type { Locale } from "./i18n";
import type { AgentConversation, OrchestratorAgentId } from "./conversations";
import { ORCHESTRATOR_AGENT_IDS } from "./conversations";
import { agentDisplayName, formatOrchestratorMessage } from "./orchestrator/messages";
import type { SimpleChatConversation } from "./simple-chat/types";

/** Subfolder a transcript files under, one per engine — `"orchestrator"`
 * covers every Orchestrator conversation (regular fan-out, Full
 * access/Plan/Propose-changes), since those genuinely span multiple engines
 * in one file and don't have a single engine to file under the way a Simple
 * Chat conversation (always exactly one engine) does. */
export type TranscriptEngine = OrchestratorAgentId | "orchestrator";

function isoDate(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Filename stem for a conversation's archive file — `2026-08-11_<id>`, so
 * Finder (or `ls`) sorts and reads chronologically without opening each file,
 * instead of a bare UUID that carries no visible information. Anchored to
 * the conversation's own `createdAt`, not "now" — the date must stay fixed
 * across resaves, since every save overwrites the same file (a save-time
 * date would rename the file underneath itself on the very next save,
 * orphaning the old one).
 */
export function transcriptFileId(conversationId: string, createdAt: number): string {
  const date = isoDate(createdAt).slice(0, 10);
  return `${date}_${conversationId}`;
}

/** `## You (2026-08-11 13:29)` — sortable, unambiguous timestamp for an
 * archival document, unlike a locale-formatted display string. Minute
 * precision is enough for "when was this said"; down to the second would
 * just be noise. Omits the timestamp entirely for turns saved before this
 * field existed (`createdAt` is optional on `ConversationTurn`). */
function heading(level: "##" | "###", who: string, createdAt: number | undefined): string {
  if (createdAt === undefined) return `${level} ${who}`;
  const stamp = isoDate(createdAt).slice(0, 16).replace("T", " ");
  return `${level} ${who} (${stamp})`;
}

/** Plain-Markdown archive of a Simple Chat conversation — one engine, a
 * straight back-and-forth. Pure string assembly, no I/O. */
export function serializeSimpleChatTranscript(conversation: SimpleChatConversation): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title}`);
  lines.push(`<!-- engine: ${conversation.engine} -->`);
  lines.push(`<!-- created: ${isoDate(conversation.createdAt)} -->`);
  lines.push(`<!-- updated: ${isoDate(conversation.updatedAt)} -->`);
  lines.push("");
  for (const turn of conversation.history) {
    const who = turn.role === "user" ? "You" : agentDisplayName(conversation.engine);
    lines.push(heading("##", who, turn.createdAt), "", turn.text, "");
  }
  return lines.join("\n");
}

/** Plain-Markdown archive of an Orchestrator conversation. Two sections:
 * the visible transcript (`orchestrator.messages`), reusing the same
 * locale-aware rendering the chat UI itself uses (`formatOrchestratorMessage`)
 * so the archived text reads the same as what the user actually saw; and,
 * for regular fan-out conversations, each agent's own full reply text —
 * that history lives in `conversation.claude/codex/cursor/opencode`, not in
 * `orchestrator.messages` (which only records terse status lines like "sent
 * to agents" there — the real per-agent text is what the chat UI shows in
 * the side panels, not inline). Full-access/Plan/Propose-changes
 * conversations never populate those per-engine threads, so this section is
 * simply empty for them — no duplication either way. `projectPath` is
 * recorded as provenance — the connected folder can change later, but the
 * archive should still say what it was at save time. Pure string assembly,
 * no I/O. */
export function serializeOrchestratorTranscript(
  conversation: AgentConversation,
  locale: Locale,
  projectPath: string | null,
): string {
  const lines: string[] = [];
  lines.push(`# ${conversation.title}`);
  lines.push(`<!-- created: ${isoDate(conversation.createdAt)} -->`);
  lines.push(`<!-- updated: ${isoDate(conversation.updatedAt)} -->`);
  if (projectPath) {
    lines.push(`<!-- project: ${projectPath} -->`);
  }
  lines.push("");
  const messages = conversation.orchestrator?.messages ?? [];
  for (const message of messages) {
    const who = message.role === "user" ? "You" : "Orchestrator";
    lines.push(heading("##", who, message.createdAt), "", formatOrchestratorMessage(message, locale), "");
  }
  for (const agentId of ORCHESTRATOR_AGENT_IDS) {
    const thread = conversation[agentId];
    if (!thread || thread.history.length === 0) continue;
    lines.push(`## ${agentDisplayName(agentId)} — full replies`, "");
    for (const turn of thread.history) {
      const who = turn.role === "user" ? "You" : agentDisplayName(agentId);
      lines.push(heading("###", who, turn.createdAt), "", turn.text, "");
    }
  }
  return lines.join("\n");
}

/**
 * Fire-and-forget archival write. Failures are logged, never surfaced to the
 * user and never block sending/receiving a chat reply — this is a derived
 * copy, not the app's source of truth (that stays localStorage).
 */
export async function saveTranscript(
  bucket: "project" | "free",
  engine: TranscriptEngine,
  conversationId: string,
  markdown: string,
): Promise<void> {
  try {
    await invoke("save_conversation_transcript", { bucket, engine, conversationId, markdown });
  } catch (e) {
    console.warn("transcript save failed", e);
  }
}
