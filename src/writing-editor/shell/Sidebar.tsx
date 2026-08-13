import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { defaultDocTypeForSection, docTypesForSection, type DocTypeCategory } from "../docTypes";
import { useWeT } from "../LocaleContext";
import type { NodeMetadata, ProjectManifest, ProjectMetadata } from "../types";
import { filterForest } from "../utils/filterTree";
import { buildForest } from "../utils/manifestTree";
import { MetadataPanel } from "./MetadataPanel";
import { BacklinksPanel } from "./BacklinksPanel";
import { ProjectSearch } from "./ProjectSearch";
import { TreeNode } from "./TreeNode";

type DialogState =
  | { kind: "create"; section: DocTypeCategory; parentId: string | null }
  | { kind: "rename"; nodeId: string; title: string };

function nodeSection(manifest: ProjectManifest, nodeId: string): DocTypeCategory {
  if (manifest.manuscript_roots?.includes(nodeId)) return "manuscript";
  if (manifest.planning_roots?.includes(nodeId)) return "planning";
  for (const [parentId, node] of Object.entries(manifest.nodes)) {
    if (node.children.includes(nodeId)) {
      return nodeSection(manifest, parentId);
    }
  }
  return "manuscript";
}

function parentInfo(
  manifest: ProjectManifest,
  nodeId: string,
): { parentId: string | null; section: DocTypeCategory; index: number } | null {
  for (let i = 0; i < (manifest.manuscript_roots?.length ?? 0); i++) {
    const id = manifest.manuscript_roots![i];
    if (id === nodeId) return { parentId: null, section: "manuscript", index: i };
  }
  for (let i = 0; i < (manifest.planning_roots?.length ?? 0); i++) {
    const id = manifest.planning_roots![i];
    if (id === nodeId) return { parentId: null, section: "planning", index: i };
  }
  for (const [parentId, node] of Object.entries(manifest.nodes)) {
    const idx = node.children.indexOf(nodeId);
    if (idx >= 0) {
      return { parentId, section: nodeSection(manifest, parentId), index: idx };
    }
  }
  return null;
}

export function Sidebar({
  projectPath,
  manifest,
  activeNodeId,
  projectMetadata,
  onSelectNode,
  onManifestUpdated,
  onMetadataUpdated,
  onProjectMetadataReload,
  onToast,
  hidden,
}: {
  projectPath: string;
  manifest: ProjectManifest;
  activeNodeId: string | null;
  projectMetadata: ProjectMetadata;
  onSelectNode: (id: string) => void;
  onManifestUpdated: (manifest: ProjectManifest) => void;
  onMetadataUpdated: (nodeId: string, meta: NodeMetadata) => void;
  onProjectMetadataReload: () => void;
  onToast: (message: string, type: "success" | "error") => void;
  hidden?: boolean;
}) {
  const t = useWeT();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [docTypeInput, setDocTypeInput] = useState(defaultDocTypeForSection("manuscript"));
  const [filterQuery, setFilterQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const manuscriptForest = useMemo(
    () => filterForest(buildForest(manifest, manifest.manuscript_roots), projectMetadata, filterQuery),
    [manifest, projectMetadata, filterQuery],
  );
  const planningForest = useMemo(
    () => filterForest(buildForest(manifest, manifest.planning_roots), projectMetadata, filterQuery),
    [manifest, projectMetadata, filterQuery],
  );

  const activeMetadata = activeNodeId ? (projectMetadata[activeNodeId] ?? null) : null;

  const runMove = async (nodeId: string, delta: -1 | 1) => {
    const info = parentInfo(manifest, nodeId);
    if (!info) return;
    const newIndex = info.index + delta;
    if (newIndex < 0) return;
    setBusy(true);
    try {
      const updated = await invoke<ProjectManifest>("move_writing_node_command", {
        projectPath,
        nodeId,
        newParentId: info.parentId,
        section: info.section,
        index: newIndex,
      });
      onManifestUpdated(updated);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const openCreate = (section: DocTypeCategory, parentId: string | null) => {
    setDialog({ kind: "create", section, parentId });
    setTitleInput("");
    setDocTypeInput(defaultDocTypeForSection(section));
  };

  const openRename = (nodeId: string) => {
    const title = manifest.nodes[nodeId]?.title ?? nodeId;
    setDialog({ kind: "rename", nodeId, title });
    setTitleInput(title);
  };

  // M-05 (editor audit 2026-08-12): this dialog had no Escape-to-close,
  // unlike ExportDialog/TemplatePickerDialog which both support it.
  useEffect(() => {
    if (!dialog) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialog]);

  const submitDialog = async () => {
    if (!dialog || !titleInput.trim()) return;
    setBusy(true);
    try {
      let updated: ProjectManifest;
      if (dialog.kind === "create") {
        updated = await invoke<ProjectManifest>("create_writing_node_command", {
          projectPath,
          parentId: dialog.parentId,
          section: dialog.section,
          docType: docTypeInput,
          title: titleInput.trim(),
        });
      } else {
        updated = await invoke<ProjectManifest>("rename_writing_node_command", {
          projectPath,
          nodeId: dialog.nodeId,
          newTitle: titleInput.trim(),
        });
      }
      onManifestUpdated(updated);
      onProjectMetadataReload();
      setDialog(null);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteNode = async (nodeId: string) => {
    const hasChildren = (manifest.nodes[nodeId]?.children.length ?? 0) > 0;
    if (hasChildren && !window.confirm(t("deleteDocumentConfirm"))) return;
    setBusy(true);
    try {
      const updated = await invoke<ProjectManifest>("delete_writing_node_command", {
        projectPath,
        nodeId,
        deleteChildren: hasChildren,
      });
      onManifestUpdated(updated);
      onProjectMetadataReload();
      if (activeNodeId === nodeId) onSelectNode(updated.manuscript_roots?.[0] ?? Object.keys(updated.nodes)[0] ?? "");
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (hidden) return null;

  const sectionTypes =
    dialog?.kind === "create" ? docTypesForSection(dialog.section) : docTypesForSection("manuscript");

  return (
    <aside className="we-sidebar" aria-busy={busy} data-tour="sidebar">
      <div className="we-sidebar-filter">
        <input
          type="search"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t("sidebarFilterPlaceholder")}
          aria-label={t("sidebarFilterPlaceholder")}
        />
        <p className="we-sidebar-filter-hint">{t("sidebarFilterHint")}</p>
      </div>

      <ProjectSearch projectPath={projectPath} onSelectNode={onSelectNode} onToast={onToast} />

      <div className="we-sidebar-scroll">
      <div className="we-sidebar-section">
        <div className="we-sidebar-header">
          <span>{t("sidebarManuscript")}</span>
          <button type="button" onClick={() => openCreate("manuscript", null)}>
            {t("addDocument")}
          </button>
        </div>
        {manuscriptForest.map((node, index) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            activeId={activeNodeId}
            siblingIndex={index}
            siblingCount={manuscriptForest.length}
            projectMetadata={projectMetadata}
            onSelect={onSelectNode}
            onAddChild={(id) => openCreate("manuscript", id)}
            onRename={openRename}
            onDelete={deleteNode}
            onMoveUp={(id) => void runMove(id, -1)}
            onMoveDown={(id) => void runMove(id, 1)}
          />
        ))}
      </div>

      <div className="we-sidebar-section">
        <div className="we-sidebar-header">
          <span>{t("sidebarPlanning")}</span>
          <button type="button" onClick={() => openCreate("planning", null)}>
            {t("addDocument")}
          </button>
        </div>
        {planningForest.map((node, index) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            activeId={activeNodeId}
            siblingIndex={index}
            siblingCount={planningForest.length}
            projectMetadata={projectMetadata}
            onSelect={onSelectNode}
            onAddChild={(id) => openCreate("planning", id)}
            onRename={openRename}
            onDelete={deleteNode}
            onMoveUp={(id) => void runMove(id, -1)}
            onMoveDown={(id) => void runMove(id, 1)}
          />
        ))}
      </div>
      </div>

      <MetadataPanel
        projectPath={projectPath}
        nodeId={activeNodeId}
        metadata={activeMetadata}
        onMetadataUpdated={onMetadataUpdated}
        onToast={onToast}
      />

      <BacklinksPanel
        projectPath={projectPath}
        nodeId={activeNodeId}
        onSelectNode={onSelectNode}
      />

      {dialog && (
        <div className="we-sidebar-dialog-backdrop" onClick={() => setDialog(null)}>
          <div
            className="we-sidebar-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="we-sidebar-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="we-sidebar-dialog-title">
              {dialog.kind === "create" ? t("addDocument") : t("renameDocument")}
            </h3>
            {dialog.kind === "create" && (
              <label className="we-sidebar-field">
                {t("documentType")}
                <select value={docTypeInput} onChange={(e) => setDocTypeInput(e.target.value)}>
                  {sectionTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="we-sidebar-field">
              {t("documentTitle")}
              <input
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitDialog();
                }}
              />
            </label>
            <div className="we-sidebar-dialog-actions">
              <button type="button" onClick={() => setDialog(null)}>
                {t("cancel")}
              </button>
              <button type="button" onClick={() => void submitDialog()} disabled={!titleInput.trim()}>
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
