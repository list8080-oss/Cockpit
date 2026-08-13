import { describe, expect, it } from "vitest";
import { MEMORY_NOTE_MARKER, splitMemoryNote } from "./memoryNote";

describe("splitMemoryNote", () => {
  it("returns the original text unchanged when there is no marker", () => {
    const text = "Just a normal reply, nothing to remember.";
    expect(splitMemoryNote(text)).toEqual({ visibleText: text, note: null });
  });

  it("splits a valid marker + note and trims visibleText before the marker", () => {
    const text = `Here's my answer.\n\n${MEMORY_NOTE_MARKER}\nRemember: the project uses 12-char minimum passwords.`;
    expect(splitMemoryNote(text)).toEqual({
      visibleText: "Here's my answer.",
      note: "Remember: the project uses 12-char minimum passwords.",
    });
  });

  it("falls back to the full original text with no memory write when there's nothing after the marker", () => {
    const text = `Body text.\n\n${MEMORY_NOTE_MARKER}\n   `;
    expect(splitMemoryNote(text)).toEqual({ visibleText: text, note: null });
  });

  it("falls back to the full original text with no memory write when there's no reply text before the marker", () => {
    const text = `${MEMORY_NOTE_MARKER}\nsomething`;
    expect(splitMemoryNote(text)).toEqual({ visibleText: text, note: null });
  });
});
