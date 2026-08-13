import { DocTypeIcon } from "../components/DocTypeIcon";
import type { ProjectMetadata } from "../types";
import type { TreeNodeView } from "../utils/manifestTree";
import { useWeT } from "../LocaleContext";
import { statusLabelKey } from "../utils/statusLabels";

export function TreeNode({
  node,
  depth,
  activeId,
  siblingIndex,
  siblingCount,
  projectMetadata,
  onSelect,
  onAddChild,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  node: TreeNodeView;
  depth: number;
  activeId: string | null;
  siblingIndex: number;
  siblingCount: number;
  projectMetadata: ProjectMetadata;
  onSelect: (id: string) => void;
  onAddChild: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const t = useWeT();
  const active = activeId === node.id;
  const canMoveUp = siblingIndex > 0;
  const canMoveDown = siblingIndex < siblingCount - 1;
  const status = projectMetadata[node.id]?.status;

  return (
    <div className="we-tree-branch">
      <div
        className={`we-tree-row${active ? " we-tree-row-active" : ""}`}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button type="button" className="we-tree-select" onClick={() => onSelect(node.id)}>
          {status && (
            <span
              className={`we-tree-status we-tree-status-${status}`}
              role="img"
              aria-label={t(statusLabelKey(status))}
            />
          )}
          <DocTypeIcon docType={node.docType} size={16} />
          <span className="we-tree-title">{node.title}</span>
        </button>
        <div className="we-tree-actions">
          <button type="button" title={t("addChild")} onClick={() => onAddChild(node.id)}>
            +
          </button>
          <button type="button" title={t("renameDocument")} onClick={() => onRename(node.id)}>
            ✎
          </button>
          {canMoveUp && (
            <button type="button" title={t("moveUp")} onClick={() => onMoveUp(node.id)}>
              ↑
            </button>
          )}
          {canMoveDown && (
            <button type="button" title={t("moveDown")} onClick={() => onMoveDown(node.id)}>
              ↓
            </button>
          )}
          <button type="button" title={t("deleteDocument")} onClick={() => onDelete(node.id)}>
            ×
          </button>
        </div>
      </div>
      {node.children.map((child, index) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          siblingIndex={index}
          siblingCount={node.children.length}
          projectMetadata={projectMetadata}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onRename={onRename}
          onDelete={onDelete}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
}
