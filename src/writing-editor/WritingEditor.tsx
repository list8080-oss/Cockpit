import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Locale } from "../i18n";
import { Editor } from "./components/Editor";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { ToastStack, createToast, type ToastData } from "./components/Toast";
import { WritingEditorLocaleProvider } from "./LocaleContext";
import { weT } from "./i18n";
import { Sidebar } from "./shell/Sidebar";
import { CorkboardView } from "./shell/CorkboardView";
import { ExportDialog } from "./shell/ExportDialog";
import { ReadThroughView } from "./shell/ReadThroughView";
import { ThemePicker } from "./shell/ThemePicker";
import { TemplatePickerDialog } from "./shell/TemplatePickerDialog";
import { isOnboardingComplete, OnboardingTour, resetOnboarding, type TourStepId } from "./shell/OnboardingTour";
import type { DocumentContent, EditorProjectMode, NodeMetadata, ProjectManifest, ProjectMetadata, Status, TemplateId } from "./types";
import { BUILTIN_THEMES } from "./themes/builtinThemes";
import { applyWritingEditorTheme } from "./themes/applyTheme";
import { isEditorThemeId, loadEditorThemeId } from "./themes/themeStorage";
import { modKey } from "./utils/platform";
import "./styles/shell.css";
import "./styles/sidebar.css";
import "./styles/editor.css";
import "./styles/toolbar.css";
import "./styles/readthrough.css";
import "./styles/corkboard.css";
import "./styles/dialogs.css";
import "./styles/onboarding.css";
import "./styles/toast.css";

function lastNodeKey(projectPath: string, profileId?: string | null): string {
  return `yar-cockpit.editor.lastNode:${profileId ?? "default"}:${projectPath}`;
}

function firstNodeId(manifest: ProjectManifest): string | null {
  if (manifest.mode === "structured" && manifest.manuscript_roots?.length) {
    return manifest.manuscript_roots[0];
  }
  if (manifest.mode === "structured" && manifest.planning_roots?.length) {
    return manifest.planning_roots[0];
  }
  const ids = Object.keys(manifest.nodes);
  return ids.length ? ids[0] : null;
}

export function WritingEditor({
  onBack,
  backLabel,
  title,
  themeId,
  locale,
  profileId,
}: {
  onBack: () => void;
  backLabel: string;
  title: string;
  themeId?: "normal" | "night" | "book";
  locale: Locale;
  /** Active Cockpit profile — editor remounts when this or the project path changes. */
  profileId?: string | null;
}) {
  const t = useCallback((key: Parameters<typeof weT>[1]) => weT(locale, key), [locale]);

  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectMode, setProjectMode] = useState<EditorProjectMode>("legacy");
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({});
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocumentContent | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [distractionFree, setDistractionFree] = useState(false);
  const [shellView, setShellView] = useState<"editor" | "corkboard" | "readthrough">("editor");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editorThemeId, setEditorThemeId] = useState(() => loadEditorThemeId(themeId));
  const shellRef = useRef<HTMLDivElement>(null);

  const reloadProjectMetadata = useCallback(async (dir: string) => {
    try {
      const raw = await invoke<Record<string, { synopsis: string | null; tags: string[]; status: string }>>(
        "list_writing_project_metadata_command",
        { projectPath: dir },
      );
      const mapped: ProjectMetadata = {};
      for (const [id, meta] of Object.entries(raw)) {
        mapped[id] = {
          synopsis: meta.synopsis,
          tags: meta.tags,
          status: meta.status as Status,
        };
      }
      setProjectMetadata(mapped);
    } catch {
      setProjectMetadata({});
    }
  }, []);

  const reloadManifest = useCallback(async (dir: string) => {
    const m = await invoke<ProjectManifest>("list_editor_documents", { projectPath: dir });
    setManifest(m);
    setManifestError(null);
    setProjectMode(m.mode ?? "legacy");
    if (m.mode === "structured") {
      await reloadProjectMetadata(dir);
      try {
        await invoke("ensure_writing_search_index_command", { projectPath: dir });
      } catch {
        /* index is best-effort on load */
      }
    } else {
      setProjectMetadata({});
    }
    let restored: string | null = null;
    try {
      const stored = localStorage.getItem(lastNodeKey(dir, profileId));
      if (stored && m.nodes[stored]) restored = stored;
    } catch {
      /* ignore */
    }
    setActiveNodeId(restored ?? firstNodeId(m));
    return m;
  }, [reloadProjectMetadata, profileId]);

  useEffect(() => {
    void invoke<string>("get_editor_project_dir")
      .then(async (dir) => {
        setProjectPath(dir);
        setProjectError(null);
        const mode = await invoke<string>("detect_editor_project_mode");
        setProjectMode(mode === "structured" ? "structured" : "legacy");
      })
      .catch((err) => {
        setProjectPath(null);
        setProjectError(String(err));
      });
  }, []);

  useEffect(() => {
    if (!projectPath) return;
    let cancelled = false;
    reloadManifest(projectPath).catch((err) => {
      if (!cancelled) {
        setManifest(null);
        setManifestError(String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectPath, reloadManifest]);

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
    if (!activeNodeId || !doc) return;
    setProjectMetadata((prev) => {
      const existing = prev[activeNodeId];
      const next: NodeMetadata = {
        synopsis: doc.synopsis ?? null,
        tags: doc.tags ?? [],
        status: (doc.status as Status | undefined) ?? existing?.status ?? "draft",
      };
      if (
        existing &&
        existing.synopsis === next.synopsis &&
        existing.tags.join(",") === next.tags.join(",") &&
        existing.status === next.status
      ) {
        return prev;
      }
      return { ...prev, [activeNodeId]: next };
    });
  }, [activeNodeId, doc]);

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

  const activeTheme = useMemo(() => {
    const id = isEditorThemeId(editorThemeId) ? editorThemeId : loadEditorThemeId(themeId);
    return BUILTIN_THEMES[id] ?? BUILTIN_THEMES.light;
  }, [editorThemeId, themeId]);

  useEffect(() => {
    if (!shellRef.current) return;
    applyWritingEditorTheme(shellRef.current, activeTheme);
  }, [activeTheme]);

  const showToast = useCallback((message: string, type: ToastData["type"] = "success") => {
    setToasts((prev) => [...prev, createToast(message, type)]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const selectNode = useCallback(
    (id: string) => {
      if (!id) return;
      setActiveNodeId(id);
      if (projectPath) {
        try {
          localStorage.setItem(lastNodeKey(projectPath, profileId), id);
        } catch {
          /* ignore */
        }
      }
    },
    [projectPath, profileId],
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

  const runStructuredSetup = useCallback(
    async (
      command: "init_writing_project_command" | "migrate_legacy_writing_project_command",
      templateId?: TemplateId,
    ) => {
      if (!projectPath || layoutBusy) return;
      setLayoutBusy(true);
      try {
        if (command === "init_writing_project_command") {
          await invoke<ProjectManifest>(command, { templateId: templateId ?? "blank" });
        } else {
          await invoke<ProjectManifest>(command);
        }
        await reloadManifest(projectPath);
        setProjectMode("structured");
        showToast(t("structuredProjectReady"), "success");
        if (!isOnboardingComplete()) setShowOnboarding(true);
      } catch (err) {
        showToast(`${t("structuredActionFailed")}: ${String(err)}`, "error");
      } finally {
        setLayoutBusy(false);
      }
    },
    [projectPath, layoutBusy, reloadManifest, showToast, t],
  );

  const sortedNodeEntries = useMemo(
    () => (manifest ? Object.entries(manifest.nodes) : []),
    [manifest],
  );

  const hasLegacyDocuments = sortedNodeEntries.length > 0;
  const isStructured = projectMode === "structured";

  useEffect(() => {
    if (!isStructured || sortedNodeEntries.length === 0) return;
    if (!isOnboardingComplete()) setShowOnboarding(true);
  }, [isStructured, sortedNodeEntries.length]);

  const startTour = useCallback(() => {
    resetOnboarding();
    setShowOnboarding(true);
  }, []);

  const prepareTourStep = useCallback((step: TourStepId) => {
    if (step === "wikiLinks" || step === "writingModes") {
      setShellView("editor");
    }
  }, []);

  return (
    <WritingEditorLocaleProvider locale={locale}>
      <div className="writing-editor" ref={shellRef}>
        {!distractionFree && (
          <div className="writing-editor-back">
            <button type="button" onClick={onBack}>
              ← {backLabel}
            </button>
            <span className="writing-editor-back-title">{title}</span>
            {!isStructured && sortedNodeEntries.length > 0 && (
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
        )}

        {!projectError && projectPath && !distractionFree && (
          <div className="writing-editor-project-bar">
            <span className="writing-editor-project-mode">
              {isStructured ? t("projectModeStructured") : t("projectModeLegacy")}
            </span>
            {isStructured && (
              <div className="writing-editor-view-toggle" data-tour="view-toggle">
                <button
                  type="button"
                  className={shellView === "editor" ? "we-view-active" : ""}
                  onClick={() => setShellView("editor")}
                >
                  {t("viewEditor")}
                </button>
                <button
                  type="button"
                  className={shellView === "corkboard" ? "we-view-active" : ""}
                  onClick={() => setShellView("corkboard")}
                >
                  {t("viewCorkboard")}
                </button>
                <button
                  type="button"
                  className={shellView === "readthrough" ? "we-view-active" : ""}
                  onClick={() => setShellView("readthrough")}
                >
                  {t("viewReadThrough")}
                </button>
              </div>
            )}
            {!isStructured && sortedNodeEntries.length > 0 && (
              <div className="writing-editor-view-toggle">
                <button
                  type="button"
                  className={shellView === "editor" ? "we-view-active" : ""}
                  onClick={() => setShellView("editor")}
                >
                  {t("viewEditor")}
                </button>
                <button
                  type="button"
                  className={shellView === "readthrough" ? "we-view-active" : ""}
                  onClick={() => setShellView("readthrough")}
                >
                  {t("viewReadThrough")}
                </button>
              </div>
            )}
            {sortedNodeEntries.length > 0 && (
              <div className="writing-editor-project-actions-inline">
                <button type="button" data-tour="export" onClick={() => setShowExportDialog(true)}>
                  {t("exportAction")}
                </button>
                <ThemePicker
                  activeThemeId={activeTheme.id}
                  onSelect={setEditorThemeId}
                />
                {isStructured && (
                  <button type="button" data-tour="tour-replay" onClick={startTour}>
                    {t("onboardingHelp")}
                  </button>
                )}
              </div>
            )}
            {!isStructured && (
              <div className="writing-editor-project-actions">
                <button
                  type="button"
                  disabled={layoutBusy}
                  onClick={() => setShowTemplateDialog(true)}
                >
                  {t("initStructuredProject")}
                </button>
                {hasLegacyDocuments && (
                  <button
                    type="button"
                    disabled={layoutBusy}
                    onClick={() => void runStructuredSetup("migrate_legacy_writing_project_command")}
                  >
                    {t("migrateToStructuredProject")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="writing-editor-body">
          {isStructured && manifest && projectPath && (
            <Sidebar
              projectPath={projectPath}
              manifest={manifest}
              activeNodeId={activeNodeId}
              projectMetadata={projectMetadata}
              onSelectNode={selectNode}
              onManifestUpdated={(m) => {
                setManifest(m);
                setProjectMode(m.mode ?? "structured");
              }}
              onMetadataUpdated={(nodeId, meta) => {
                setProjectMetadata((prev) => ({ ...prev, [nodeId]: meta }));
              }}
              onProjectMetadataReload={() => {
                if (projectPath) void reloadProjectMetadata(projectPath);
              }}
              onToast={showToast}
              hidden={distractionFree}
            />
          )}

          <div className="writing-editor-main">
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

            {!projectError &&
              !manifestError &&
              isStructured &&
              shellView === "corkboard" &&
              manifest &&
              projectPath &&
              sortedNodeEntries.length > 0 && (
                <CorkboardView
                  projectPath={projectPath}
                  manifest={manifest}
                  activeNodeId={activeNodeId}
                  onSelectNode={(id) => {
                    selectNode(id);
                    setShellView("editor");
                  }}
                  onManifestUpdated={(m) => {
                    setManifest(m);
                    setProjectMode(m.mode ?? "structured");
                  }}
                  onToast={showToast}
                />
              )}

            {!projectError &&
              !manifestError &&
              shellView === "readthrough" &&
              projectPath &&
              sortedNodeEntries.length > 0 && (
                <ReadThroughView
                  projectPath={projectPath}
                  activeNodeId={activeNodeId}
                  onSelectNode={(id) => {
                    selectNode(id);
                    setShellView("editor");
                  }}
                  onClose={() => setShellView("editor")}
                />
              )}

            {!projectError && !manifestError && doc && shellView === "editor" && (
              <Editor
                doc={doc}
                onSave={handleSave}
                manifest={manifest ?? undefined}
                onSelectNode={selectNode}
                projectPath={projectPath ?? undefined}
                activeTheme={activeTheme}
                breadcrumbTitle={doc.title}
                onToast={showToast}
                onDistractionFreeChange={setDistractionFree}
              />
            )}

            {!projectError && !manifestError && !doc && docError && (
              <div className="writing-editor-empty">
                <p className="error-text">{docError}</p>
              </div>
            )}
          </div>
        </div>

        {showShortcuts && (
          <KeyboardShortcuts
            onClose={() => setShowShortcuts(false)}
            onStartTour={isStructured ? startTour : undefined}
          />
        )}
        {showExportDialog && projectPath && (
          <ExportDialog
            projectPath={projectPath}
            onClose={() => setShowExportDialog(false)}
            onToast={showToast}
          />
        )}
        {showTemplateDialog && (
          <TemplatePickerDialog
            busy={layoutBusy}
            onClose={() => setShowTemplateDialog(false)}
            onConfirm={(templateId) => {
              setShowTemplateDialog(false);
              void runStructuredSetup("init_writing_project_command", templateId);
            }}
          />
        )}
        <OnboardingTour
          open={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onPrepareStep={prepareTourStep}
        />
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </div>
    </WritingEditorLocaleProvider>
  );
}
