import { describe, expect, it } from "vitest";
import { buildForest, flattenForest } from "./manifestTree";
import type { ProjectManifest } from "../types";

const manifest: ProjectManifest = {
  version: 1,
  root: "/book",
  mode: "structured",
  doc_types: [],
  manuscript_roots: ["p1"],
  planning_roots: ["n1"],
  nodes: {
    p1: { title: "Part One", doc_type: "part", file: "manuscript/part_one.md", children: ["c1"] },
    c1: { title: "Chapter 1", doc_type: "chapter", file: "manuscript/ch1.md", children: ["s1"] },
    s1: { title: "Scene 1", doc_type: "scene", file: "manuscript/scene1.md", children: [] },
    n1: { title: "Hero", doc_type: "character", file: "kb/hero.md", children: [] },
  },
};

describe("buildForest", () => {
  it("builds nested manuscript tree", () => {
    const forest = buildForest(manifest, manifest.manuscript_roots);
    expect(forest).toHaveLength(1);
    expect(forest[0].title).toBe("Part One");
    expect(forest[0].children[0].children[0].title).toBe("Scene 1");
  });

  it("flattens in preorder", () => {
    const flat = flattenForest(buildForest(manifest, manifest.manuscript_roots));
    expect(flat.map((n) => n.title)).toEqual(["Part One", "Chapter 1", "Scene 1"]);
  });

  it("H-03: a cycle in project.json (hand-edited or pre-fix) doesn't hang the tree build", () => {
    const cyclic: ProjectManifest = {
      ...manifest,
      manuscript_roots: ["a"],
      nodes: {
        a: { title: "A", doc_type: "part", file: "a.md", children: ["b"] },
        b: { title: "B", doc_type: "chapter", file: "b.md", children: ["a"] },
      },
    };
    const forest = buildForest(cyclic, cyclic.manuscript_roots);
    expect(forest).toHaveLength(1);
    expect(forest[0].title).toBe("A");
    expect(forest[0].children[0].title).toBe("B");
    // "a" is skipped the second time around instead of recursing forever.
    expect(forest[0].children[0].children).toHaveLength(0);
  });
});
