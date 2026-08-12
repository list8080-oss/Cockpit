import { describe, expect, it } from "vitest";
import {
  adjustIndexForSameColumnMove,
  clampDropIndex,
  columnParentId,
} from "./corkboardLayout";
import { LOOSE_COLUMN_ID } from "../types";

describe("columnParentId", () => {
  it("maps loose column to null parent", () => {
    expect(columnParentId(LOOSE_COLUMN_ID)).toBeNull();
    expect(columnParentId("chapter-1")).toBe("chapter-1");
  });
});

describe("clampDropIndex", () => {
  it("clamps to sibling range", () => {
    expect(clampDropIndex(5, 3)).toBe(3);
    expect(clampDropIndex(-1, 3)).toBe(0);
  });
});

describe("adjustIndexForSameColumnMove", () => {
  it("shifts index when moving down within column", () => {
    expect(adjustIndexForSameColumnMove(1, 3, true)).toBe(2);
    expect(adjustIndexForSameColumnMove(1, 0, true)).toBe(0);
    expect(adjustIndexForSameColumnMove(1, 3, false)).toBe(3);
  });
});
