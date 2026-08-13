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
  const visited = new Set<string>();
  return rootIds
    .map((id) => buildNode(manifest, id, visited))
    .filter((n): n is TreeNodeView => n != null);
}

// H-03 (editor audit 2026-08-12): a corrupted or hand-edited project.json
// (from before the server-side cycle guard in nodes.rs::move_writing_node,
// or edited outside the app) could contain a node cycle. Without this
// guard the recursion below never terminates and crashes the whole editor
// UI — same visited-Set pattern as the Rust-side fix.
function buildNode(
  manifest: ProjectManifest,
  id: string,
  visited: Set<string>,
): TreeNodeView | null {
  const node = manifest.nodes[id];
  if (!node || visited.has(id)) return null;
  visited.add(id);
  return {
    id,
    title: nodeTitle(node, id),
    docType: node.doc_type ?? "note",
    children: (node.children ?? [])
      .map((childId) => buildNode(manifest, childId, visited))
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
