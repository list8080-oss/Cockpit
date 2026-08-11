import type { ConversationTurn, OrchestratorAgentId } from "../conversations";

/** Same id space as the Orchestrator's engines — just one at a time here. */
export type SimpleChatEngineId = OrchestratorAgentId;

export interface SimpleChatConversation {
  id: string;
  engine: SimpleChatEngineId;
  title: string;
  createdAt: number;
  updatedAt: number;
  history: ConversationTurn[];
  sessionId: string | null;
}
