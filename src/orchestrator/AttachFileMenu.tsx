import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, type Locale } from "../i18n";
import type { AttachedFile } from "./contextPackage";
import type { DocumentContent, ProjectManifest } from "../writing-editor/types";

/** Same open/close-on-outside-click-or-Escape popup pattern as
 * `AgentModelMenu` (`src/agents/Variant.tsx`) — a file picker fits it
 * directly, title-only items instead of model options. */
export function AttachFileMenu({
  locale,
  disabled,
  onAttach,
}: {
  locale: Locale;
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

  // Re-fetch every time the menu opens rather than caching — cheap local
  // reads, and avoids showing a stale list after the user reconnects the
  // project to a different folder.
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
  }, [open]);

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

  const documents = manifest
    ? Object.entries(manifest.nodes).filter(([, node]) => !!node.file)
    : [];

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
        <div className="account-dropdown model-menu-dropdown model-menu-dropdown-up" role="menu">
          <div className="account-dropdown-note">{t(locale, "orchestratorAttachFilePicker")}</div>
          {loading && <div className="account-dropdown-note muted">…</div>}
          {error && <div className="account-dropdown-note error-text">{error}</div>}
          {!loading && !error && documents.length === 0 && (
            <div className="account-dropdown-note muted">{t(locale, "orchestratorAttachFileEmpty")}</div>
          )}
          {!loading &&
            !error &&
            documents.map(([id, node]) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                className="account-dropdown-item"
                onClick={() => pick(id)}
              >
                {node.title || id}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
