import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Locale } from "../i18n";
import { Editor } from "./components/Editor";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastStack, createToast, type ToastData } from "./components/Toast";
import { WritingEditorLocaleProvider } from "./LocaleContext";
import { weT } from "./i18n";
import type { DocumentContent, ProjectManifest } from "./types";
import { BUILTIN_THEMES } from "./themes/builtinThemes";
import type { ThemeDefinition } from "./themes/themeTypes";
import { modKey } from "./utils/platform";
import "./styles/shell.css";
import "./styles/editor.css";
import "./styles/toolbar.css";
import "./styles/dialogs.css";
import "./styles/toast.css";

function lastNodeKey(projectPath: string): string {
  return `yar-cockpit.editor.lastNode:${projectPath}`;
}

/** First node id in filename order — the manifest already arrives sorted that way from Rust. */
function firstNodeId(manifest: ProjectManifest): string | null {
  const ids = Object.keys(manifest.nodes);
  return ids.length ? ids[0] : null;
}

export function WritingEditor({
  onBack,
  backLabel,
  title,
  themeId,
  locale,
}: {
  onBack: () => void;
  backLabel: string;
  title: string;
  /** InPrincipio appearance: normal | night | book → pick a built-in syntax theme */
  themeId?: "normal" | "night" | "book";
  locale: Locale;
}) {
  const t = useCallback((key: Parameters<typeof weT>[1]) => weT(locale, key), [locale]);

  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentContent | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Resolve the active project's directory once on mount.
  useEffect(() => {
    void invoke<string>("get_editor_project_dir")
      .then((dir) => {
        setProjectPath(dir);
        setProjectError(null);
      })
      .catch((err) => {
        setProjectPath(null);
        setProjectError(String(err));
      });
  }, []);

  // List the project's documents once we know where it lives.
  useEffect(() => {
    if (!projectPath) return;
    let cancelled = false;
    invoke<ProjectManifest>("list_editor_documents", { projectPath })
      .then((m) => {
        if (cancelled) return;
        setManifest(m);
        setManifestError(null);
        let restored: string | null = null;
        try {
          const stored = localStorage.getItem(lastNodeKey(projectPath));
          if (stored && m.nodes[stored]) restored = stored;
        } catch {
          /* ignore */
        }
        setActiveNodeId(restored ?? firstNodeId(m));
      })
      .catch((err) => {
        if (cancelled) return;
        setManifest(null);
        setManifestError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Load the active document's content whenever the selection changes.
  useEffect(() => {
    if (!projectPath || !activeNodeId) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setDocError(null);
    invoke<DocumentContent>("load_document", { projectPath, nodeId: activeNodeId })
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setDoc(null);
          setDocError(String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, activeNodeId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && modKey(e)) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const activeTheme: ThemeDefinition = useMemo(() => {
    if (themeId === "night") return BUILTIN_THEMES.dark;
    if (themeId === "book") return BUILTIN_THEMES["sepia-study"];
    return BUILTIN_THEMES.light;
  }, [themeId]);

  const showToast = useCallback((message: string, type: ToastData["type"] = "success") => {
    setToasts((prev) => [...prev, createToast(message, type)]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const selectNode = useCallback(
    (id: string) => {
      setActiveNodeId(id);
      if (projectPath) {
        try {
          localStorage.setItem(lastNodeKey(projectPath), id);
        } catch {
          /* ignore quota / private mode */
        }
      }
    },
    [projectPath],
  );

  const handleSave = useCallback(
    async (nodeId: string, content: string) => {
      if (!projectPath) return false;
      try {
        await invoke("save_document", { projectPath, nodeId, content });
        return true;
      } catch (err) {
        showToast(String(err), "error");
        return false;
      }
    },
    [projectPath, showToast],
  );

  const sortedNodeEntries = useMemo(
    () => (manifest ? Object.entries(manifest.nodes) : []),
    [manifest],
  );

  return (
    <WritingEditorLocaleProvider locale={locale}>
      <div className="writing-editor">
        <div className="writing-editor-back">
          <button type="button" onClick={onBack}>
            ← {backLabel}
          </button>
          <span className="writing-editor-back-title">{title}</span>
          {sortedNodeEntries.length > 0 && (
            <select
              className="writing-editor-doc-select"
              value={activeNodeId ?? ""}
              onChange={(e) => selectNode(e.target.value)}
              aria-label={t("chapterLabel")}
            >
              {sortedNodeEntries.map(([id, node]) => (
                <option key={id} value={id}>
                  {node.title ?? id}
                </option>
              ))}
            </select>
          )}
        </div>

        {projectError && (
          <div className="writing-editor-empty">
            <p className="error-text">{t("noProjectConnected")}</p>
            <p className="writing-editor-empty-detail">{projectError}</p>
          </div>
        )}

        {!projectError && manifestError && (
          <div className="writing-editor-empty">
            <p className="error-text">{manifestError}</p>
          </div>
        )}

        {!projectError && !manifestError && manifest && sortedNodeEntries.length === 0 && (
          <div className="writing-editor-empty">
            <p>{t("noDocuments")}</p>
          </div>
        )}

        {!projectError && !manifestError && doc && (
          <Editor
            doc={doc}
            onSave={handleSave}
            manifest={manifest ?? undefined}
            onSelectNode={selectNode}
            projectPath={projectPath ?? undefined}
            activeTheme={activeTheme}
            breadcrumbTitle={doc.title}
            onToast={showToast}
          />
        )}

        {!projectError && !manifestError && !doc && docError && (
          <div className="writing-editor-empty">
            <p className="error-text">{docError}</p>
          </div>
        )}

        {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    </WritingEditorLocaleProvider>
  );
}
