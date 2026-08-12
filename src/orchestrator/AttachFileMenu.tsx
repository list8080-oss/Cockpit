import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, type Locale } from "../i18n";
import type { AttachedFile } from "./contextPackage";
import { DocTypeIcon } from "../writing-editor/components/DocTypeIcon";
import type { DocumentContent, ProjectManifest } from "../writing-editor/types";
import { buildForest, type TreeNodeView } from "../writing-editor/utils/manifestTree";

/** Same open/close-on-outside-click-or-Escape popup pattern as
 * `AgentModelMenu` (`src/agents/Variant.tsx`) — a file picker fits it
 * directly, title-only items instead of model options. */
export function AttachFileMenu({
  locale,
  profileId,
  disabled,
  onAttach,
}: {
  locale: Locale;
  profileId: string | null;
  disabled?: boolean;
  onAttach: (file: AttachedFile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const projectPathRef = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    invoke<string>("get_editor_project_dir")
      .then((projectPath) => {
        projectPathRef.current = projectPath;
        return invoke<ProjectManifest>("list_editor_documents", { projectPath });
      })
      .then((m) => setManifest(m))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, profileId]);

  const pick = (nodeId: string) => {
    const projectPath = projectPathRef.current;
    if (!projectPath) return;
    invoke<DocumentContent>("load_document", { projectPath, nodeId })
      .then((doc) => {
        onAttach({ label: doc.title || nodeId, content: doc.content });
        setOpen(false);
      })
      .catch((e) => setError(String(e)));
  };

  const structured = manifest?.mode === "structured";
  const manuscriptForest = structured
    ? buildForest(manifest, manifest.manuscript_roots)
    : [];
  const planningForest = structured ? buildForest(manifest, manifest.planning_roots) : [];

  const legacyDocuments = manifest
    ? Object.entries(manifest.nodes)
        .filter(([, node]) => !!node.file)
        .sort(([, a], [, b]) => (a.title ?? "").localeCompare(b.title ?? ""))
    : [];

  const hasStructuredDocuments =
    countAttachableNodes(manifest, manuscriptForest) + countAttachableNodes(manifest, planningForest) >
    0;

  return (
    <div className="model-menu-wrap" ref={rootRef}>
      <button
        type="button"
        className="clear-prompt-btn orchestrator-attach-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        title={t(locale, "orchestratorAttachFile")}
        onClick={() => setOpen((v) => !v)}
      >
        {t(locale, "orchestratorAttachFile")}
      </button>
      {open && (
        <div
          className="account-dropdown model-menu-dropdown model-menu-dropdown-up attach-file-menu-dropdown"
          role="menu"
        >
          <div className="account-dropdown-note">{t(locale, "orchestratorAttachFilePicker")}</div>
          {loading && <div className="account-dropdown-note muted">…</div>}
          {error && <div className="account-dropdown-note error-text">{error}</div>}
          {!loading && !error && structured && !hasStructuredDocuments && (
            <div className="account-dropdown-note muted">{t(locale, "orchestratorAttachFileEmpty")}</div>
          )}
          {!loading && !error && !structured && legacyDocuments.length === 0 && (
            <div className="account-dropdown-note muted">{t(locale, "orchestratorAttachFileEmpty")}</div>
          )}
          {!loading && !error && structured && manuscriptForest.length > 0 && (
            <>
              <div className="attach-file-section-label">{t(locale, "orchestratorAttachFileManuscript")}</div>
              <AttachFileTree
                manifest={manifest}
                nodes={manuscriptForest}
                depth={0}
                onPick={pick}
              />
            </>
          )}
          {!loading && !error && structured && planningForest.length > 0 && (
            <>
              <div className="attach-file-section-label">{t(locale, "orchestratorAttachFilePlanning")}</div>
              <AttachFileTree
                manifest={manifest}
                nodes={planningForest}
                depth={0}
                onPick={pick}
              />
            </>
          )}
          {!loading &&
            !error &&
            !structured &&
            legacyDocuments.map(([id, node]) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className="account-dropdown-item attach-file-tree-item"
                onClick={() => pick(id)}
              >
                <DocTypeIcon docType={node.doc_type ?? "note"} size={14} />
                <span>{node.title || id}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function AttachFileTree({
  manifest,
  nodes,
  depth,
  onPick,
}: {
  manifest: ProjectManifest;
  nodes: TreeNodeView[];
  depth: number;
  onPick: (nodeId: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const manifestNode = manifest.nodes[node.id];
        const hasFile = !!manifestNode?.file;
        return (
          <div key={node.id}>
            {hasFile && (
              <button
                type="button"
                role="menuitem"
                className="account-dropdown-item attach-file-tree-item"
                style={{ paddingLeft: `${10 + depth * 14}px` }}
                onClick={() => onPick(node.id)}
              >
                <DocTypeIcon docType={node.docType} size={14} />
                <span>{node.title}</span>
              </button>
            )}
            {node.children.length > 0 && (
              <AttachFileTree
                manifest={manifest}
                nodes={node.children}
                depth={depth + 1}
                onPick={onPick}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function countAttachableNodes(
  manifest: ProjectManifest | null,
  forest: TreeNodeView[],
): number {
  if (!manifest) return 0;
  let count = 0;
  const walk = (nodes: TreeNodeView[]) => {
    for (const node of nodes) {
      if (manifest.nodes[node.id]?.file) count += 1;
      walk(node.children);
    }
  };
  walk(forest);
  return count;
}
