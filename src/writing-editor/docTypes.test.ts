import { describe, expect, it } from "vitest";
import { DOC_TYPES, docTypesForSection } from "./docTypes";

describe("docTypes", () => {
  it("has fourteen built-in types", () => {
    expect(DOC_TYPES).toHaveLength(14);
  });

  it("filters by section", () => {
    expect(docTypesForSection("manuscript").map((d) => d.id)).toEqual(["part", "chapter", "scene"]);
  });
});
