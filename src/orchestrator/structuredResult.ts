export interface StructuredResult {
  issues: string[];
  suggestions: string[];
  confidence: "high" | "medium" | "low";
  needsConfirmation: boolean;
}

export const STRUCTURED_RESULT_MARKER = "===COCKPIT-STRUCTURED-RESULT===";

export const STRUCTURED_RESULT_INSTRUCTION =
  'After you finish your normal answer, add a line that says exactly "===COCKPIT-STRUCTURED-RESULT===" and nothing else, then on the next line output a single-line JSON object with exactly these fields: {"issues": string[], "suggestions": string[], "confidence": "high" | "medium" | "low", "needsConfirmation": boolean}. "issues" lists concrete problems you noticed (empty array if none), "suggestions" lists concrete improvements you\'d make (empty array if none), "confidence" is how sure you are about your own answer, "needsConfirmation" is true only if a human must decide before anything you said should be acted on. Do not use a markdown code fence around the JSON. Output nothing after that JSON line.';

/**
 * Splits the marker + trailing JSON off `text` if present and valid.
 * On ANY failure (no marker, malformed JSON, wrong shape) returns the
 * ORIGINAL text unchanged and `structured: null` — never drops or hides
 * content the user hasn't seen parse successfully.
 */
export function parseStructuredTail(text: string): {
  mainText: string;
  structured: StructuredResult | null;
} {
  const idx = text.indexOf(STRUCTURED_RESULT_MARKER);
  if (idx === -1) return { mainText: text, structured: null };
  const before = text.slice(0, idx).trimEnd();
  const after = text.slice(idx + STRUCTURED_RESULT_MARKER.length).trim();
  try {
    const parsed = JSON.parse(after);
    const validConfidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low";
    if (
      Array.isArray(parsed.issues) &&
      Array.isArray(parsed.suggestions) &&
      validConfidence &&
      typeof parsed.needsConfirmation === "boolean"
    ) {
      return {
        mainText: before,
        structured: {
          issues: parsed.issues.filter((x: unknown) => typeof x === "string"),
          suggestions: parsed.suggestions.filter(
            (x: unknown) => typeof x === "string",
          ),
          confidence: parsed.confidence,
          needsConfirmation: parsed.needsConfirmation,
        },
      };
    }
  } catch {
    /* fall through — treat as unparsed */
  }
  return { mainText: text, structured: null };
}
