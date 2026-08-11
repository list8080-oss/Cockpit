import { describe, expect, it } from "vitest";
import { deriveJournalRows, filterJournalRows, type JournalEntry } from "./journal";

function apply(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "a1",
    kind: "apply",
    context: "project",
    profileId: "development",
    path: "src/foo.ts",
    oldContent: "old",
    newContent: "new",
    timestamp: "2026-08-11T14:00:00Z",
    ...overrides,
  };
}

function rollback(rolledBackId: string, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `rb-${rolledBackId}`,
    kind: "rollback",
    rolledBackId,
    timestamp: "2026-08-11T15:00:00Z",
    ...overrides,
  };
}

describe("deriveJournalRows", () => {
  it("returns one row per apply entry", () => {
    const rows = deriveJournalRows([apply({ id: "a1" }), apply({ id: "a2", path: "b.ts" })]);
    expect(rows).toHaveLength(2);
  });

  it("marks a row rolled back when a later rollback entry references it", () => {
    const rows = deriveJournalRows([apply({ id: "a1" }), rollback("a1")]);
    expect(rows[0].rolledBack).toBe(true);
  });

  it("leaves a row not rolled back when nothing references it", () => {
    const rows = deriveJournalRows([apply({ id: "a1" }), rollback("some-other-id")]);
    expect(rows[0].rolledBack).toBe(false);
  });

  it("sorts newest first by timestamp", () => {
    const rows = deriveJournalRows([
      apply({ id: "old", timestamp: "2026-08-01T00:00:00Z" }),
      apply({ id: "new", timestamp: "2026-08-11T00:00:00Z" }),
      apply({ id: "mid", timestamp: "2026-08-05T00:00:00Z" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual(["new", "mid", "old"]);
  });

  it("defaults context to project and profileId to null when absent (pre-field entries)", () => {
    const rows = deriveJournalRows([
      { id: "a1", kind: "apply", path: "x.ts", timestamp: "2026-08-11T00:00:00Z" },
    ]);
    expect(rows[0].context).toBe("project");
    expect(rows[0].profileId).toBeNull();
  });

  it("ignores rollback entries and apply entries without a path", () => {
    const rows = deriveJournalRows([
      rollback("nothing"),
      { id: "a1", kind: "apply", timestamp: "2026-08-11T00:00:00Z" },
    ]);
    expect(rows).toHaveLength(0);
  });
});

describe("filterJournalRows", () => {
  const rows = deriveJournalRows([
    apply({ id: "dev1", context: "project", profileId: "development" }),
    apply({ id: "ms1", context: "project", profileId: "manuscript", path: "chapter.md" }),
    apply({ id: "free1", context: "free", profileId: null, path: "notes.md" }),
  ]);

  it("'all' returns every row", () => {
    expect(filterJournalRows(rows, { kind: "all" })).toHaveLength(3);
  });

  it("'free' returns only free-context rows", () => {
    const filtered = filterJournalRows(rows, { kind: "free" });
    expect(filtered.map((r) => r.id)).toEqual(["free1"]);
  });

  it("'project' returns only rows for that exact profile", () => {
    const filtered = filterJournalRows(rows, { kind: "project", profileId: "development" });
    expect(filtered.map((r) => r.id)).toEqual(["dev1"]);
  });
});
