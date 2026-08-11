import { MAX_STORED_CONVERSATIONS, conversationTitle } from "../conversations";
import type { SimpleChatConversation, SimpleChatEngineId } from "./types";

const STORAGE_KEY = "yar-cockpit.simpleChatConversations";
const ACTIVE_STORAGE_KEY = "yar-cockpit.simpleChatActiveConversationId";

/** See CONVERSATIONS_SCHEMA_VERSION in ../conversations.ts for the rationale. */
export const SIMPLE_CHAT_SCHEMA_VERSION = 1;

interface SimpleChatEnvelope {
  version: number;
  conversations: SimpleChatConversation[];
}

export function loadSimpleChatConversations(): SimpleChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Pre-versioning format: a bare array, written by every build before
    // the envelope was introduced.
    if (Array.isArray(parsed)) return parsed;
    // Versioned envelope.
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as SimpleChatEnvelope).conversations)) {
      return (parsed as SimpleChatEnvelope).conversations;
    }
    return [];
  } catch {
    return [];
  }
}

export function persistSimpleChatConversations(list: SimpleChatConversation[]) {
  try {
    const envelope: SimpleChatEnvelope = {
      version: SIMPLE_CHAT_SCHEMA_VERSION,
      conversations: list.slice(0, MAX_STORED_CONVERSATIONS),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* ignore (e.g. storage quota) */
  }
}

export function loadActiveSimpleChatId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function persistActiveSimpleChatId(id: string | null) {
  try {
    localStorage.setItem(ACTIVE_STORAGE_KEY, id ?? "");
  } catch {
    /* ignore */
  }
}

export function newSimpleChatConversation(
  engine: SimpleChatEngineId,
): SimpleChatConversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    engine,
    title: "…",
    createdAt: now,
    updatedAt: now,
    history: [],
    sessionId: null,
  };
}

/** Derives the conversation title from its first user turn, once there is one. */
export function retitle(conversation: SimpleChatConversation): SimpleChatConversation {
  const firstUserTurn = conversation.history.find((turn) => turn.role === "user");
  if (!firstUserTurn) return conversation;
  return { ...conversation, title: conversationTitle(firstUserTurn.text) };
}
