/**
 * Optional memory note an entity can leave for its future self, distinct
 * from its visible reply. Deliberately opt-in per turn (not "append every
 * reply") — an earlier version appended every full reply automatically and
 * created a feedback loop: three near-identical "nothing to review yet"
 * turns piled into memory, which then biased the next call toward repeating
 * the same boilerplate instead of reacting to the actual conversation (one
 * entity's second reply literally said "as last time"). Letting the entity
 * itself judge what's worth keeping avoids that — same spirit as
 * `structuredResult.ts`, simpler shape (plain text, not JSON).
 */
export const MEMORY_NOTE_MARKER = "===ENTITY-MEMORY-NOTE===";

export const MEMORY_NOTE_INSTRUCTION = `After your answer, if — and only if — there's something genuinely worth remembering for your future self across separate conversations (a real decision, a correction, a concrete fact you'd want to recall later), add a line that says exactly "${MEMORY_NOTE_MARKER}" and then a short note on the next line. If there's nothing like that this turn (routine chat, "nothing to review yet", a greeting), omit this entirely — do not write a note just to have one.`;

/**
 * Splits the marker + trailing note off `text` if present. On any malformed
 * input, treats the whole thing as ordinary reply text — same fail-safe
 * posture as `parseStructuredTail`.
 */
export function splitMemoryNote(text: string): { visibleText: string; note: string | null } {
  const idx = text.indexOf(MEMORY_NOTE_MARKER);
  if (idx === -1) return { visibleText: text, note: null };
  const before = text.slice(0, idx).trimEnd();
  const note = text.slice(idx + MEMORY_NOTE_MARKER.length).trim();
  // Degenerate cases (no note, or no reply text before the marker) fall back
  // to the raw original text with no memory write — never show an empty
  // bubble or hide content the user hasn't seen, same fail-safe posture as
  // `parseStructuredTail`.
  if (!note || !before) return { visibleText: text, note: null };
  return { visibleText: before, note };
}
