import { describe, expect, it } from "vitest";
import { filterForest } from "./filterTree";
import type { TreeNodeView } from "./manifestTree";
import type { ProjectMetadata } from "../types";

const forest: TreeNodeView[] = [
  {
    id: "a",
    title: "Chapter One",
    docType: "chapter",
    children: [
      {
        id: "b",
        title: "Opening scene",
        docType: "scene",
        children: [],
      },
    ],
  },
  {
    id: "c",
    title: "Notes",
    docType: "note",
    children: [],
  },
];

const metadata: ProjectMetadata = {
  a: { synopsis: null, tags: [], status: "draft" },
  b: { synopsis: null, tags: ["urgent"], status: "draft" },
  c: { synopsis: null, tags: [], status: "final" },
};

describe("filterForest", () => {
  it("returns full forest for empty query", () => {
    expect(filterForest(forest, metadata, "")).toEqual(forest);
  });

  it("keeps ancestors of matching nodes", () => {
    const filtered = filterForest(forest, metadata, "tag:urgent");
    expect(filtered.map((n) => n.id)).toEqual(["a"]);
    expect(filtered[0].children.map((n) => n.id)).toEqual(["b"]);
  });

  it("filters by status", () => {
    const filtered = filterForest(forest, metadata, "status:final");
    expect(filtered.map((n) => n.id)).toEqual(["c"]);
  });
});
