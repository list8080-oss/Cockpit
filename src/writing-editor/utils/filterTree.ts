import type { ProjectMetadata } from "../types";
import type { TreeNodeView } from "./manifestTree";
import { matchesFilter, parseFilterQuery, type NodeFilterMeta } from "./filterGrammar";

function metaForNode(node: TreeNodeView, projectMeta: ProjectMetadata): NodeFilterMeta {
  const stored = projectMeta[node.id];
  return {
    docType: node.docType,
    status: stored?.status ?? "draft",
    tags: stored?.tags ?? [],
    title: node.title,
  };
}

/** Keep nodes that match the filter or have a matching descendant. */
export function filterForest(
  forest: TreeNodeView[],
  projectMeta: ProjectMetadata,
  query: string,
): TreeNodeView[] {
  const clauses = parseFilterQuery(query);
  if (clauses.length === 0) return forest;

  const prune = (node: TreeNodeView): TreeNodeView | null => {
    const children = node.children
      .map((child) => prune(child))
      .filter((child): child is TreeNodeView => child != null);
    const selfMatches = matchesFilter(metaForNode(node, projectMeta), clauses);
    if (selfMatches || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };

  return forest
    .map((node) => prune(node))
    .filter((node): node is TreeNodeView => node != null);
}
