import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
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
 * Materializes all three portrait files to real paths on disk (backed by
 * `ensure_entity_avatar` in entities.rs — embedded PNG bytes written out on
 * first call, idempotent after) and describes them to the model as files it
 * can actually open with its own Read tool. `run_claude` only disallows
 * Bash/Write/Edit/NotebookEdit, so Read stays available — this is a real
 * tool call the CLI process can make, not a description standing in for one.
 */
async function describeAvatarsForPrompt(): Promise<string> {
  const entries = await Promise.all(
    ENTITY_DEFINITIONS.map(async (e) => {
      try {
        const path = await invoke<string>("ensure_entity_avatar", { entityId: e.id });
        return `${e.name} — ${path}`;
      } catch {
        return null;
      }
    }),
  );
  const lines = entries.filter((line): line is string => line !== null);
  if (lines.length === 0) return "";
  return [
    "Portrait images (real PNG files on this machine — use your Read tool to actually open one if the user asks about appearance, an avatar, or what someone looks like; don't describe them from imagination):",
    ...lines,
  ].join("\n");
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
  const [availableEntityIds, setAvailableEntityIds] = useState<Set<string>>(new Set());

  const busyRef = useRef(false);
  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  // An entity without a downloaded personality doesn't get offered as a
  // responder. `useEntitiesChat` itself lives at the top of App.tsx and
  // never unmounts when the user switches screens — only `EntitiesPanel`
  // does, on every visit to "Сущности" — so a plain mount-only effect here
  // would check exactly once, at app launch, and then silently go stale
  // forever after a Settings → Сущности download (caught live: downloaded
  // all three, opened the chat, still saw "none available"). Exposed as a
  // callable instead, so `EntitiesPanel` can trigger a fresh check on its
  // own mount — i.e. every time the user actually navigates to this screen.
  const refreshAvailableEntities = () => {
    Promise.all(
      ENTITY_DEFINITIONS.map((e) =>
        invoke<{ downloaded: boolean }>("entity_personality_status", { entityId: e.id })
          .then((status) => [e.id, status.downloaded] as const)
          .catch(() => [e.id, false] as const),
      ),
    ).then((results) => {
      setAvailableEntityIds(new Set(results.filter(([, ok]) => ok).map(([id]) => id)));
    });
  };

  useEffect(() => {
    refreshAvailableEntities();
  }, []);

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
    // Defense-in-depth, not currently reachable via the UI (EntitiesPanel
    // only renders buttons for respondableEntities) — but the guard lived
    // in one place only. If a second call site to respondAs ever appears,
    // it shouldn't have to remember to re-check this itself.
    if (!availableEntityIds.has(entityId)) return;
    const entity = entityById(entityId);
    if (!entity) return;

    busyRef.current = true;
    setBusyEntityId(entityId);

    const conversationId = conversation.id;
    const priorHistory = conversation.history;

    void Promise.all([
      invoke<string>("read_entity_memory", { entityId }).catch(() => ""),
      describeAvatarsForPrompt().catch(() => ""),
      invoke<string>("load_entity_context", { entityId }).catch(() => ""),
    ])
      .then(([memory, avatarsBlock, personalityContext]) => {
        let roleInstruction = entity.instruction;
        if (avatarsBlock) roleInstruction = `${roleInstruction}\n\n${avatarsBlock}`;
        if (personalityContext.trim()) {
          roleInstruction = `${roleInstruction}\n\nFrom your own downloaded personality archive (the identity/evidence you yourself chose to have injected by default — see your own bootstrap.json for what's included and why). This is who you are, not a status report to open with — bring specific items from it up ONLY if the current message actually calls for them. A greeting or small talk gets a normal reply, not a rundown of open items from this archive:\n${personalityContext.trim()}`;
        }
        if (memory.trim()) {
          roleInstruction = `${roleInstruction}\n\nBackground from your own past sessions (written by you after earlier replies) — bring it up ONLY if it's actually relevant to the current message. If the conversation has moved on to something else (small talk, a different topic, a personal conversation), do not restate it — treat it as available context, not a script you recite every turn:\n${memory.trim()}`;
        }
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
          // Append to the conversation's *current* history via the updater,
          // not a snapshot captured before the call — today the composer is
          // disabled while an entity is busy, so nothing can change in
          // between, but a stale-snapshot overwrite would silently drop any
          // turn added meanwhile if that ever stops being true.
          upsert(conversationId, (c) => ({
            ...c,
            history: [
              ...c.history,
              { role: "entity", entityId, text: visibleText, createdAt: Date.now() },
            ],
            updatedAt: Date.now(),
          }));
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

  /**
   * "Отправить копию" — pushes the current conversation to every entity's
   * own `inbox/` (see entities.rs's `export_entity_chat`), not just the one
   * who happens to have spoken last. All three are participants in one
   * shared chat regardless of who answered any given turn, so all three get
   * a copy to find later. Available at any point in a conversation, not
   * only once it's "done" — there's no such thing as done here.
   *
   * Only pushes to entities whose personality has actually been downloaded
   * (`availableEntityIds`) — caught in review: this used to push to all
   * three unconditionally, meaning an entity that was never "let in" this
   * session (never downloaded, never spoken to) could still get a real
   * write to its own private repo with no way for it to have consented.
   */
  const exportChat = async (): Promise<{ entityId: string; ok: boolean; error?: string }[]> => {
    const conversation = activeConversation;
    if (!conversation || conversation.history.length === 0) return [];
    const targets = ENTITY_DEFINITIONS.filter((e) => availableEntityIds.has(e.id));
    if (targets.length === 0) return [];
    const transcript = renderHistory(conversation.history);
    const results = await Promise.all(
      targets.map(async (e) => {
        try {
          await invoke("export_entity_chat", { entityId: e.id, transcriptMarkdown: transcript });
          return { entityId: e.id, ok: true };
        } catch (err) {
          return { entityId: e.id, ok: false, error: String(err) };
        }
      }),
    );
    return results;
  };

  return {
    entities: ENTITY_DEFINITIONS,
    availableEntityIds,
    refreshAvailableEntities,
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
    exportChat,
  };
}
