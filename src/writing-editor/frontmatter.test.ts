import { describe, expect, it } from "vitest";
import { composeDocument, splitDocument } from "./frontmatter";

describe("splitDocument", () => {
  it("parses frontmatter and body", () => {
    const raw = composeDocument(
      {
        id: "abc",
        type: "chapter",
        title: "Intro",
        created: "2026-08-12T07:00:00Z",
        modified: "2026-08-12T07:00:00Z",
        tags: [],
        status: "draft",
      },
      "Hello prose.",
    );
    const parsed = splitDocument(raw);
    expect(parsed?.body).toBe("Hello prose.");
    expect(parsed?.frontmatter.title).toBe("Intro");
  });
});
