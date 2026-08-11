import { describe, expect, it } from "vitest";
import {
  STRUCTURED_RESULT_MARKER,
  parseStructuredTail,
  type StructuredResult,
} from "./structuredResult";

const valid: StructuredResult = {
  issues: ["a"],
  suggestions: ["b"],
  confidence: "medium",
  needsConfirmation: false,
};

describe("parseStructuredTail", () => {
  it("returns the original text unchanged when there is no marker", () => {
    const text = "Just a normal reply.";
    expect(parseStructuredTail(text)).toEqual({
      mainText: text,
      structured: null,
    });
  });

  it("parses a valid marker + JSON and trims mainText before the marker", () => {
    const text = `Hello answer.\n\n${STRUCTURED_RESULT_MARKER}\n${JSON.stringify(valid)}`;
    expect(parseStructuredTail(text)).toEqual({
      mainText: "Hello answer.",
      structured: valid,
    });
  });

  it("keeps the original text when JSON after the marker is malformed", () => {
    const text = `Body\n${STRUCTURED_RESULT_MARKER}\n{not-json`;
    expect(parseStructuredTail(text)).toEqual({
      mainText: text,
      structured: null,
    });
  });

  it("keeps the original text when confidence is invalid", () => {
    const bad = {
      issues: [],
      suggestions: [],
      confidence: "very high",
      needsConfirmation: false,
    };
    const text = `Body\n${STRUCTURED_RESULT_MARKER}\n${JSON.stringify(bad)}`;
    expect(parseStructuredTail(text)).toEqual({
      mainText: text,
      structured: null,
    });
  });

  it("keeps the original text when issues is not an array", () => {
    const bad = {
      issues: "nope",
      suggestions: [],
      confidence: "high",
      needsConfirmation: true,
    };
    const text = `Body\n${STRUCTURED_RESULT_MARKER}\n${JSON.stringify(bad)}`;
    expect(parseStructuredTail(text)).toEqual({
      mainText: text,
      structured: null,
    });
  });

  it("filters non-string elements from issues/suggestions without failing", () => {
    const mixed = {
      issues: ["real", 42, null, "also"],
      suggestions: [{ x: 1 }, "fix"],
      confidence: "low",
      needsConfirmation: true,
    };
    const text = `Body\n${STRUCTURED_RESULT_MARKER}\n${JSON.stringify(mixed)}`;
    expect(parseStructuredTail(text)).toEqual({
      mainText: "Body",
      structured: {
        issues: ["real", "also"],
        suggestions: ["fix"],
        confidence: "low",
        needsConfirmation: true,
      },
    });
  });
});
