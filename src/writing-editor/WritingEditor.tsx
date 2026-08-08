import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/Editor";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastStack, createToast, type ToastData } from "./components/Toast";
import type { DocumentContent } from "./types";
import { BUILTIN_THEMES } from "./themes/builtinThemes";
import type { ThemeDefinition } from "./themes/themeTypes";
import { modKey } from "./utils/platform";
import "./styles/shell.css";
import "./styles/editor.css";
import "./styles/toolbar.css";
import "./styles/dialogs.css";
import "./styles/toast.css";

const DOC_ID = "cockpit-draft";

export function WritingEditor({
  content,
  onContentChange,
  onBack,
  backLabel,
  title,
  themeId,
}: {
  content: string;
  onContentChange: (value: string) => void;
  onBack: () => void;
  backLabel: string;
  title: string;
  /** Cockpit appearance: normal | night | book → pick Loomdraft syntax theme */
  themeId?: "normal" | "night" | "book";
}) {
  const [doc, setDoc] = useState<DocumentContent>(() => ({
    id: DOC_ID,
    title,
    doc_type: "note",
    content,
    file: `${DOC_ID}.md`,
  }));
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    void invoke<string>("get_editor_project_dir")
      .then(setProjectPath)
      .catch((err) => {
        console.warn("editor project dir unavailable", err);
      });
  }, []);

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

  const docForEditor = useMemo<DocumentContent>(() => {
    if (doc.content === content && doc.title === title) return doc;
    return { ...doc, content, title };
  }, [content, title, doc]);

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

  const handleSave = useCallback(
    async (nodeId: string, next: string) => {
      onContentChange(next);
      setDoc((prev) => ({ ...prev, id: nodeId, content: next }));
      return true;
    },
    [onContentChange],
  );

  return (
    <div className="writing-editor">
      <div className="writing-editor-back">
        <button type="button" onClick={onBack}>
          ← {backLabel}
        </button>
        <span className="writing-editor-back-title">{title}</span>
      </div>
      <Editor
        doc={docForEditor}
        onSave={handleSave}
        projectPath={projectPath ?? undefined}
        activeTheme={activeTheme}
        breadcrumbTitle={title}
        onToast={showToast}
      />
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
