import { MAX_STORED_CONVERSATIONS, conversationTitle } from "../conversations";
import type { EntitiesConversation } from "./types";

const STORAGE_KEY = "yar-cockpit.entitiesConversations";
const ACTIVE_STORAGE_KEY = "yar-cockpit.entitiesActiveConversationId";

/** See CONVERSATIONS_SCHEMA_VERSION in ../conversations.ts for the rationale. */
export const ENTITIES_SCHEMA_VERSION = 1;

interface EntitiesEnvelope {
  version: number;
  conversations: EntitiesConversation[];
}

export function loadEntitiesConversations(): EntitiesConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as EntitiesEnvelope).conversations)) {
      return (parsed as EntitiesEnvelope).conversations;
    }
    return [];
  } catch {
    return [];
  }
}

export function persistEntitiesConversations(list: EntitiesConversation[]) {
  try {
    const envelope: EntitiesEnvelope = {
      version: ENTITIES_SCHEMA_VERSION,
      conversations: list.slice(0, MAX_STORED_CONVERSATIONS),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* ignore (e.g. storage quota) */
  }
}

export function loadActiveEntitiesConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function persistActiveEntitiesConversationId(id: string | null) {
  try {
    localStorage.setItem(ACTIVE_STORAGE_KEY, id ?? "");
  } catch {
    /* ignore */
  }
}

export function newEntitiesConversation(): EntitiesConversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "…",
    createdAt: now,
    updatedAt: now,
    history: [],
  };
}

export function retitleEntities(conversation: EntitiesConversation): EntitiesConversation {
  const firstUserTurn = conversation.history.find((turn) => turn.role === "user");
  if (!firstUserTurn) return conversation;
  return { ...conversation, title: conversationTitle(firstUserTurn.text) };
}
