/** Mirrors Rust's `JournalEntry` (`src-tauri/src/engines.rs`) — one line of
 * the append-only `orchestrator-journal.jsonl` log. `"rollback"` entries only
 * ever carry `id`/`kind`/`rolledBackId`/`timestamp`; the rest are `apply`-only. */
export interface JournalEntry {
  id: string;
  kind: "apply" | "rollback";
  context?: "project" | "free";
  /** Active profile id when this was applied (only set for `context === "project"`). */
  profileId?: string | null;
  path?: string;
  oldContent?: string | null;
  newContent?: string;
  rolledBackId?: string;
  timestamp: string;
}

export interface JournalRow {
  /** The `apply` entry's own id — pass this to `rollback_orchestrator_change`. */
  id: string;
  path: string;
  context: "project" | "free";
  profileId: string | null;
  timestamp: string;
  rolledBack: boolean;
}

/**
 * One row per `apply` entry, newest first, each carrying whether a later
 * `rollback` entry already reversed it. Pure — no I/O; the raw entries come
 * from `list_orchestrator_journal`.
 */
export function deriveJournalRows(entries: JournalEntry[]): JournalRow[] {
  const rolledBackIds = new Set(
    entries
      .filter((e) => e.kind === "rollback" && e.rolledBackId)
      .map((e) => e.rolledBackId as string),
  );
  return entries
    .filter((e): e is JournalEntry & { path: string } => e.kind === "apply" && !!e.path)
    .map((e) => ({
      id: e.id,
      path: e.path,
      context: e.context ?? "project",
      profileId: e.profileId ?? null,
      timestamp: e.timestamp,
      rolledBack: rolledBackIds.has(e.id),
    }))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0));
}

export type JournalFilter =
  | { kind: "all" }
  | { kind: "free" }
  | { kind: "project"; profileId: string };

export function filterJournalRows(rows: JournalRow[], filter: JournalFilter): JournalRow[] {
  switch (filter.kind) {
    case "all":
      return rows;
    case "free":
      return rows.filter((r) => r.context === "free");
    case "project":
      return rows.filter((r) => r.context === "project" && r.profileId === filter.profileId);
  }
}
