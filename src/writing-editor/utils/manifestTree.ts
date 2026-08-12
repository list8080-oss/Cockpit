import type { ProjectManifest, ProjectNode } from "../types";

export interface TreeNodeView {
  id: string;
  title: string;
  docType: string;
  children: TreeNodeView[];
}

export function nodeTitle(node: ProjectNode, id: string): string {
  return node.title ?? id;
}

/** Build ordered tree views from manifest root id lists. */
export function buildForest(
  manifest: ProjectManifest,
  rootIds: string[] | undefined,
): TreeNodeView[] {
  if (!rootIds?.length) return [];
  return rootIds
    .map((id) => buildNode(manifest, id))
    .filter((n): n is TreeNodeView => n != null);
}

function buildNode(manifest: ProjectManifest, id: string): TreeNodeView | null {
  const node = manifest.nodes[id];
  if (!node) return null;
  return {
    id,
    title: nodeTitle(node, id),
    docType: node.doc_type ?? "note",
    children: (node.children ?? [])
      .map((childId) => buildNode(manifest, childId))
      .filter((n): n is TreeNodeView => n != null),
  };
}

/** Flat preorder list — useful for legacy-style picker fallbacks. */
export function flattenForest(forest: TreeNodeView[]): TreeNodeView[] {
  const out: TreeNodeView[] = [];
  const walk = (nodes: TreeNodeView[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(forest);
  return out;
}
