import { describe, expect, it } from "vitest";
import { matchesFilter, parseFilterQuery } from "./filterGrammar";

describe("parseFilterQuery", () => {
  it("parses typed clauses", () => {
    expect(parseFilterQuery("type:scene status:draft")).toEqual([
      { key: "type", value: "scene" },
      { key: "status", value: "draft" },
    ]);
  });

  it("parses tag alias and quoted values", () => {
    expect(parseFilterQuery('tag:"My Tag" tags:urgent')).toEqual([
      { key: "tag", value: "my tag" },
      { key: "tag", value: "urgent" },
    ]);
  });

  it("treats bare words as title search", () => {
    expect(parseFilterQuery("opening tavern")).toEqual([
      { key: "title", value: "opening" },
      { key: "title", value: "tavern" },
    ]);
  });

  it("returns empty for blank input", () => {
    expect(parseFilterQuery("   ")).toEqual([]);
  });
});

describe("matchesFilter", () => {
  const meta = {
    docType: "scene",
    status: "draft",
    tags: ["subplot", "urgent"],
    title: "Opening beat",
  };

  it("matches all clauses with AND semantics", () => {
    expect(matchesFilter(meta, parseFilterQuery("type:scene status:draft"))).toBe(true);
    expect(matchesFilter(meta, parseFilterQuery("type:chapter"))).toBe(false);
  });

  it("matches tag and title clauses", () => {
    expect(matchesFilter(meta, parseFilterQuery("tag:urgent opening"))).toBe(true);
    expect(matchesFilter(meta, parseFilterQuery("tag:missing"))).toBe(false);
  });
});
