import { invoke } from "@tauri-apps/api/core";
import { useRef, useState } from "react";
import type { AgentFanoutModels } from "../orchestrator/types";
import { runOrchestratorFanout } from "../orchestrator/runFanout";
import { ENTITY_DEFINITIONS, entityById } from "./entityDefinitions";
import { MEMORY_NOTE_INSTRUCTION, splitMemoryNote } from "./memoryNote";
import type { EntitiesConversation, EntityTurn } from "./types";
import {
  loadActiveEntitiesConversationId,
  loadEntitiesConversations,
  newEntitiesConversation,
  persistActiveEntitiesConversationId,
  persistEntitiesConversations,
  retitleEntities,
} from "./conversations";

function speakerLabel(turn: EntityTurn): string {
  if (turn.role === "user") return "Пользователь";
  const entity = turn.entityId ? entityById(turn.entityId) : null;
  return entity?.name ?? "?";
}

function renderHistory(history: EntityTurn[]): string {
  return history.map((turn) => `${speakerLabel(turn)}: ${turn.text}`).join("\n\n");
}

/**
 * Fixed three-entity moderated chat (Оркестратор/Аргус/Вера), all on Claude
 * Code. No auto-dispatch: a user turn only appends to history, and a
 * response only happens when `respondAs(entityId)` is called explicitly —
 * the human is always the one choosing who answers next (see CLAUDE.md's
 * Entities section for why this is deliberate, not a missing feature).
 */
export function useEntitiesChat(models: AgentFanoutModels) {
  const [conversations, setConversations] = useState<EntitiesConversation[]>(() =>
    loadEntitiesConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const id = loadActiveEntitiesConversationId();
    return id && loadEntitiesConversations().some((c) => c.id === id) ? id : null;
  });
  const [draft, setDraft] = useState("");
  const [busyEntityId, setBusyEntityId] = useState<string | null>(null);

  const busyRef = useRef(false);
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;
  const history = activeConversation?.history ?? [];

  const isStillActive = (id: string) => activeIdRef.current === id;

  const upsert = (
    id: string,
    updater: (c: EntitiesConversation) => EntitiesConversation,
  ) => {
    setConversations((list) => {
      const next = list.map((c) => (c.id === id ? updater(c) : c));
      persistEntitiesConversations(next);
      return next;
    });
  };

  const ensureConversation = (): EntitiesConversation => {
    if (activeConversation) return activeConversation;
    const conversation = newEntitiesConversation();
    setConversations((list) => {
      const next = [conversation, ...list];
      persistEntitiesConversations(next);
      return next;
    });
    setActiveConversationId(conversation.id);
    persistActiveEntitiesConversationId(conversation.id);
    return conversation;
  };

  const newChat = () => {
    setActiveConversationId(null);
    persistActiveEntitiesConversationId(null);
    setDraft("");
  };

  const openConversation = (id: string) => {
    setActiveConversationId(id);
    persistActiveEntitiesConversationId(id);
    setDraft("");
  };

  /** Appends the user's message only — no entity responds automatically. */
  const sendUser = () => {
    const text = draft.trim();
    if (!text) return;
    const conversation = ensureConversation();
    const withUserTurn: EntityTurn[] = [
      ...conversation.history,
      { role: "user", text, createdAt: Date.now() },
    ];
    upsert(conversation.id, (c) =>
      retitleEntities({ ...c, history: withUserTurn, updatedAt: Date.now() }),
    );
    setDraft("");
  };

  /** The user picked this entity's avatar to answer next. */
  const respondAs = (entityId: "orchestrator" | "argus" | "vera") => {
    const conversation = activeConversation;
    if (!conversation || busyRef.current || conversation.history.length === 0) return;
    const entity = entityById(entityId);
    if (!entity) return;

    busyRef.current = true;
    setBusyEntityId(entityId);

    const conversationId = conversation.id;
    const priorHistory = conversation.history;

    void invoke<string>("read_entity_memory", { entityId })
      .catch(() => "")
      .then((memory) => {
        const roleInstruction = memory.trim()
          ? `${entity.instruction}\n\nYour own memory from previous sessions (written by you after past replies — yours to build on):\n${memory.trim()}`
          : entity.instruction;
        const task = `${renderHistory(priorHistory)}\n\nRespond now, in your own voice, as yourself — you are ${entity.name}.\n\n${MEMORY_NOTE_INSTRUCTION}`;

        return runOrchestratorFanout({
          prompt: task,
          models,
          agents: ["claude"],
          roleInstructions: { claude: roleInstruction },
          context: "free",
        });
      })
      .then(([result]) => {
        if (!result) return;
        if (result.ok) {
          const { visibleText, note } = splitMemoryNote(result.reply.text);
          const updated: EntitiesConversation = {
            ...conversation,
            history: [
              ...priorHistory,
              { role: "entity", entityId, text: visibleText, createdAt: Date.now() },
            ],
            updatedAt: Date.now(),
          };
          upsert(conversationId, () => updated);
          if (note) {
            void invoke("append_entity_memory", { entityId, note }).catch(() => {
              /* memory growth is best-effort — a failed append never blocks the visible reply */
            });
          }
        }
        // On failure: nothing was optimistically added for entity turns, so
        // there's nothing to roll back — just leave history as it was and
        // let the user pick again.
      })
      .finally(() => {
        busyRef.current = false;
        if (isStillActive(conversationId)) setBusyEntityId(null);
      });
  };

  return {
    entities: ENTITY_DEFINITIONS,
    conversations,
    activeConversation,
    history,
    draft,
    setDraft,
    busyEntityId,
    newChat,
    openConversation,
    sendUser,
    respondAs,
  };
}
