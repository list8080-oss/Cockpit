export interface EntityTurn {
  role: "user" | "entity";
  /** Set only when role === "entity" — which of the three answered. */
  entityId?: "orchestrator" | "argus" | "vera";
  text: string;
  createdAt: number;
}

export interface EntitiesConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  history: EntityTurn[];
}
