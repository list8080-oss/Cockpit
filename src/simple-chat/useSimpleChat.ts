import { useRef, useState } from "react";
import type { ConversationTurn } from "../conversations";
import { runOrchestratorFanout } from "../orchestrator/runFanout";
import type { AgentFanoutModels, AgentFanoutSessions } from "../orchestrator/types";
import type { SimpleChatConversation, SimpleChatEngineId } from "./types";
import {
  loadActiveSimpleChatId,
  loadSimpleChatConversations,
  newSimpleChatConversation,
  persistActiveSimpleChatId,
  persistSimpleChatConversations,
  retitle,
} from "./conversations";
import { saveTranscript, serializeSimpleChatTranscript, transcriptFileId } from "../transcripts";

/**
 * One-on-one chat with a single engine — no roles, no profile, no fan-out.
 * Reuses `runOrchestratorFanout` with a one-element `agents` list and
 * `context: "free"`, the same invoke path the Orchestrator's own follow-up
 * handlers use, just without any of the multi-agent bookkeeping around it.
 */
export function useSimpleChat(models: AgentFanoutModels) {
  const [conversations, setConversations] = useState<SimpleChatConversation[]>(() =>
    loadSimpleChatConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const id = loadActiveSimpleChatId();
    return id && loadSimpleChatConversations().some((c) => c.id === id) ? id : null;
  });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const busyRef = useRef(false);
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const engine = activeConversation?.engine ?? null;
  const history = activeConversation?.history ?? [];

  const isStillActive = (id: string) => activeIdRef.current === id;

  const upsert = (
    id: string,
    updater: (c: SimpleChatConversation) => SimpleChatConversation,
  ) => {
    setConversations((list) => {
      const next = list.map((c) => (c.id === id ? updater(c) : c));
      persistSimpleChatConversations(next);
      return next;
    });
  };

  /**
   * Picking an engine resumes its one ongoing conversation if it already has
   * one (same idea as reopening a chat you already had with it), or starts a
   * fresh one the first time. There's no mid-chat engine switch, and no way
   * through the UI to end up with two separate conversations for the same
   * engine — one persistent thread per engine, by design.
   */
  const pickEngine = (id: SimpleChatEngineId) => {
    const existing = conversations.find((c) => c.engine === id);
    if (existing) {
      setActiveConversationId(existing.id);
      persistActiveSimpleChatId(existing.id);
      setDraft("");
      return;
    }
    const conversation = newSimpleChatConversation(id);
    setConversations((list) => {
      const next = [conversation, ...list];
      persistSimpleChatConversations(next);
      return next;
    });
    setActiveConversationId(conversation.id);
    persistActiveSimpleChatId(conversation.id);
    setDraft("");
  };

  const newChat = () => {
    setActiveConversationId(null);
    persistActiveSimpleChatId(null);
    setDraft("");
  };

  const send = () => {
    const text = draft.trim();
    const conversation = activeConversation;
    if (!text || busyRef.current || !conversation) return;
    busyRef.current = true;
    setBusy(true);

    const conversationId = conversation.id;
    const conversationEngine = conversation.engine;
    const priorHistory = conversation.history;
    const sessionId = conversation.sessionId;
    const withUserTurn: ConversationTurn[] = [...priorHistory, { role: "user", text, createdAt: Date.now() }];

    upsert(conversationId, (c) =>
      retitle({ ...c, history: withUserTurn, updatedAt: Date.now() }),
    );
    setDraft("");

    void runOrchestratorFanout({
      prompt: text,
      models,
      sessions: sessionId
        ? ({ [conversationEngine]: sessionId } as Partial<AgentFanoutSessions>)
        : {},
      agents: [conversationEngine],
      context: "free",
    })
      .then(([result]) => {
        if (!result) return;
        if (result.ok) {
          const updated: SimpleChatConversation = retitle({
            ...conversation,
            history: [...withUserTurn, { role: "assistant", text: result.reply.text, createdAt: Date.now() }],
            sessionId: result.reply.sessionId,
            updatedAt: Date.now(),
          });
          upsert(conversationId, () => updated);
          void saveTranscript(
            "free",
            updated.engine,
            transcriptFileId(conversationId, updated.createdAt),
            serializeSimpleChatTranscript(updated),
          );
        } else {
          // Roll back the optimistic user turn and restore the typed text so
          // the user can retry, instead of leaving it stuck unanswered —
          // mirrors useOrchestrator's continueClaude/continueCodex/etc.
          upsert(conversationId, (c) => ({ ...c, history: priorHistory }));
          if (isStillActive(conversationId)) setDraft(text);
        }
      })
      .finally(() => {
        busyRef.current = false;
        setBusy(false);
      });
  };

  return {
    engine,
    history,
    draft,
    setDraft,
    busy,
    pickEngine,
    newChat,
    send,
  };
}
