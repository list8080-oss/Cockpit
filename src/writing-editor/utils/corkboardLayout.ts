import { LOOSE_COLUMN_ID } from "../types";

/** Map a corkboard column id to the move command parent id. */
export function columnParentId(columnId: string): string | null {
  return columnId === LOOSE_COLUMN_ID ? null : columnId;
}

/** Clamp a drop index to a valid sibling position. */
export function clampDropIndex(index: number, siblingCount: number): number {
  return Math.max(0, Math.min(index, siblingCount));
}

/**
 * When dragging within the same column, adjust target index if moving downward
 * because the item is removed from its old position first.
 */
export function adjustIndexForSameColumnMove(
  fromIndex: number,
  toIndex: number,
  sameColumn: boolean,
): number {
  if (!sameColumn || toIndex <= fromIndex) return toIndex;
  return toIndex - 1;
}
