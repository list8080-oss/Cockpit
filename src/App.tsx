import { lazy, Suspense, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import {
  LOCALE_STORAGE_KEY,
  detectLocale,
  t,
  type Locale,
} from "./i18n";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  detectTheme,
  type Theme,
} from "./theme";
const WritingEditor = lazy(() =>
  import("./writing-editor").then((module) => ({ default: module.WritingEditor })),
);
import {
  AgentPanels,
  OrchestratorChat,
  useOrchestrator,
} from "./orchestrator";
import {
  AGENT_SETTING_KEYS,
  CLAUDE_EFFORT_OPTIONS,
  CLAUDE_MODEL_OPTIONS,
  CODEX_EFFORT_OPTIONS,
  CODEX_MODEL_OPTIONS,
  OPENCODE_EFFORT_OPTIONS,
  loadAgentSetting,
  persistAgentSetting,
  type AgentOption,
} from "./agentSettings";
import type { AuthStatus, CodexLimits } from "./authTypes";
import { UpdateBar } from "./updates/UpdateBar";
import { GithubChip } from "./sidebar/GithubChip";
import { AgentModelMenu, Variant } from "./agents/Variant";
import { SettingsView, type DictionaryStatus } from "./settings/SettingsView";
import type { WorkspaceMode } from "./workspaceMode";
import { SimpleChat, useSimpleChat } from "./simple-chat";
import { EntitiesPanel, useEntitiesChat } from "./entities";
import "./App.css";

type View = "workspace" | "settings";
type SidebarPanelId = "notes" | "appleNotes" | "history" | null;

const SIDEBAR_PANEL_STORAGE_KEY = "yar-cockpit.sidebarPanel";

const SIDEBAR_PANEL_IDS: SidebarPanelId[] = ["notes", "appleNotes", "history"];

function loadSidebarPanel(): SidebarPanelId {
  try {
    const raw = localStorage.getItem(SIDEBAR_PANEL_STORAGE_KEY);
    return (SIDEBAR_PANEL_IDS as string[]).includes(raw ?? "") ? (raw as SidebarPanelId) : null;
  } catch {
    return null;
  }
}

const AGENT_IDS = ["claude", "codex", "cursor", "opencode"] as const;

interface ChapterInfo {
  file: string;
  title: string;
}

interface AppleNotesFolder {
  id: string;
  name: string;
  account: string;
}

interface AppleNotesItem {
  id: string;
  title: string;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [theme, setTheme] = useState<Theme>(() => detectTheme());
  const [view, setView] = useState<View>("workspace");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("simpleChat");
  const [openPanel, setOpenPanel] = useState<SidebarPanelId>(loadSidebarPanel);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [appleFolders, setAppleFolders] = useState<AppleNotesFolder[]>([]);
  const [appleNotes, setAppleNotes] = useState<AppleNotesItem[]>([]);
  const [appleFolderId, setAppleFolderId] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleConnected, setAppleConnected] = useState(false);
  const [projectPaths, setProjectPaths] = useState<Record<string, string | null>>({});
  const [projectMessages, setProjectMessages] = useState<Record<string, string | null>>({});
  const [auths, setAuths] = useState<AuthStatus[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [codexLimits, setCodexLimits] = useState<CodexLimits | null>(null);
  const [codexLimitsLoading, setCodexLimitsLoading] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryStatus[]>([]);
  const [dictionaryBusy, setDictionaryBusy] = useState<string | null>(null);
  const [claudeModel, setClaudeModelState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.claudeModel),
  );
  const [claudeEffort, setClaudeEffortState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.claudeEffort),
  );
  const [codexModel, setCodexModelState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.codexModel),
  );
  const [codexEffort, setCodexEffortState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.codexEffort),
  );
  const [cursorModel, setCursorModelState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.cursorModel),
  );
  const [cursorModelOptions, setCursorModelOptions] = useState<AgentOption[]>([]);
  const [opencodeModel, setOpencodeModelState] = useState(() => {
    // A model saved before the free-only restriction (or edited by hand in
    // localStorage) could be a paid one — never honor that, reset to
    // "Default" (which itself now resolves to a real free model) instead.
    const stored = loadAgentSetting(AGENT_SETTING_KEYS.opencodeModel);
    if (stored !== "" && !stored.endsWith("-free")) {
      persistAgentSetting(AGENT_SETTING_KEYS.opencodeModel, "");
      return "";
    }
    return stored;
  });
  const [opencodeEffort, setOpencodeEffortState] = useState(() =>
    loadAgentSetting(AGENT_SETTING_KEYS.opencodeEffort),
  );
  const [opencodeModelOptions, setOpencodeModelOptions] = useState<AgentOption[]>([]);

  useEffect(() => {
    invoke<{ id: string; label: string }[]>("list_cursor_models")
      .then((models) => setCursorModelOptions(models.map((m) => ({ value: m.id, label: m.label }))))
      .catch(() => {
        /* cursor-agent not installed or --list-models failed — leave empty,
           the picker just falls back to "По умолчанию" only. */
      });
    invoke<{ id: string; label: string }[]>("list_opencode_models")
      .then((models) => setOpencodeModelOptions(models.map((m) => ({ value: m.id, label: m.label }))))
      .catch(() => {
        /* opencode not installed or `models` failed — same fallback. */
      });
  }, []);
  const setClaudeModel = (v: string) => {
    setClaudeModelState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.claudeModel, v);
  };
  const setClaudeEffort = (v: string) => {
    setClaudeEffortState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.claudeEffort, v);
  };
  const setCodexModel = (v: string) => {
    setCodexModelState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.codexModel, v);
  };
  const setCodexEffort = (v: string) => {
    setCodexEffortState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.codexEffort, v);
  };
  const setCursorModel = (v: string) => {
    setCursorModelState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.cursorModel, v);
  };
  const setOpencodeModel = (v: string) => {
    setOpencodeModelState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.opencodeModel, v);
  };
  const setOpencodeEffort = (v: string) => {
    setOpencodeEffortState(v);
    persistAgentSetting(AGENT_SETTING_KEYS.opencodeEffort, v);
  };

  const authById = (id: string) => auths.find((item) => item.id === id);
  const agentAuths = AGENT_IDS.map((id) => authById(id)).filter(
    (item): item is AuthStatus => Boolean(item),
  );

  const refreshCodexLimits = async () => {
    setCodexLimitsLoading(true);
    try {
      const limits = await invoke<CodexLimits>("get_codex_limits");
      setCodexLimits(limits);
    } catch (e) {
      setCodexLimits({
        available: false,
        fiveHour: null,
        weekly: null,
        planType: null,
        detail: String(e),
      });
    } finally {
      setCodexLimitsLoading(false);
    }
  };

  const {
    conversations,
    activeConversationId,
    prompt,
    setPrompt,
    claude,
    codex,
    cursor,
    opencode,
    claudeSessionId,
    codexThreadId,
    cursorSessionId,
    opencodeSessionId,
    claudeReply,
    setClaudeReply,
    codexReply,
    setCodexReply,
    cursorReply,
    setCursorReply,
    opencodeReply,
    setOpencodeReply,
    claudeHistory,
    codexHistory,
    cursorHistory,
    opencodeHistory,
    orchestratorMessages,
    expandedAgentPanel,
    setExpandedAgentPanel,
    fullAccessMode,
    planMode,
    proposeMode,
    orchestratorContext,
    contextTip,
    dismissContextTip,
    selectedAgents,
    activeProfile,
    availableProfiles,
    profileSwitchError,
    activeProfileProjectPath,
    refreshActiveProfileProjectPath,
    selectedRoles,
    structuredResultMode,
    synthesizing,
    busy,
    canSynthesize,
    send,
    synthesize,
    continueClaude,
    continueCodex,
    continueCursor,
    continueOpencode,
    toggleSelectedAgent,
    setAgentRole,
    setStructuredResultModeSafe,
    setActiveProfileId,
    setOrchestratorContextSafe,
    setFullAccessModeSafe,
    setPlanModeSafe,
    setProposeModeSafe,
    openConversation,
    deleteConversation,
    resetActiveConversation,
    applyProposalChange,
    rejectProposalChange,
    rollbackProposalChange,
    attachedFiles,
    addAttachedFile,
    removeAttachedFile,
    activeSince,
  } = useOrchestrator({
    locale,
    claudeModel,
    claudeEffort,
    codexModel,
    codexEffort,
    cursorModel,
    opencodeModel,
    opencodeEffort,
    refreshCodexLimits,
    setWorkspaceMode,
    setView,
  });

  const {
    engine: simpleChatEngine,
    history: simpleChatHistory,
    draft: simpleChatDraft,
    setDraft: setSimpleChatDraft,
    busy: simpleChatBusy,
    pickEngine: pickSimpleChatEngine,
    newChat: newSimpleChat,
    send: sendSimpleChat,
  } = useSimpleChat({
    claudeModel,
    claudeEffort,
    codexModel,
    codexEffort,
    cursorModel,
    opencodeModel,
    opencodeEffort,
  });

  const {
    entities,
    history: entitiesHistory,
    draft: entitiesDraft,
    setDraft: setEntitiesDraft,
    busyEntityId,
    newChat: newEntitiesChat,
    sendUser: sendEntitiesUser,
    respondAs: respondAsEntity,
  } = useEntitiesChat({
    claudeModel,
    claudeEffort,
    codexModel,
    codexEffort,
    cursorModel,
    opencodeModel,
    opencodeEffort,
  });

  // Same per-engine model/effort menu the Orchestrator's agent panels use —
  // Simple Chat shares the same global settings, just shows the one for
  // whichever engine this conversation is bound to.
  const simpleChatModelMenu =
    simpleChatEngine === "claude" ? (
      <AgentModelMenu
        locale={locale}
        model={claudeModel}
        onModelChange={setClaudeModel}
        modelOptions={CLAUDE_MODEL_OPTIONS}
        effort={claudeEffort}
        onEffortChange={setClaudeEffort}
        effortOptions={CLAUDE_EFFORT_OPTIONS}
        dropdownDirection="up"
      />
    ) : simpleChatEngine === "codex" ? (
      <AgentModelMenu
        locale={locale}
        model={codexModel}
        onModelChange={setCodexModel}
        modelOptions={CODEX_MODEL_OPTIONS}
        effort={codexEffort}
        onEffortChange={setCodexEffort}
        effortOptions={CODEX_EFFORT_OPTIONS}
        dropdownDirection="up"
      />
    ) : simpleChatEngine === "cursor" ? (
      <AgentModelMenu
        locale={locale}
        model={cursorModel}
        onModelChange={setCursorModel}
        modelOptions={cursorModelOptions}
        dropdownDirection="up"
      />
    ) : simpleChatEngine === "opencode" ? (
      <AgentModelMenu
        locale={locale}
        model={opencodeModel}
        onModelChange={setOpencodeModel}
        modelOptions={opencodeModelOptions}
        effort={opencodeEffort}
        onEffortChange={setOpencodeEffort}
        effortOptions={OPENCODE_EFFORT_OPTIONS}
        dropdownDirection="up"
      />
    ) : null;

  const refreshAuth = async () => {
    setAuthLoading(true);
    try {
      const list = await invoke<AuthStatus[]>("list_auth_status");
      setAuths(list);
      setAuthMessage(null);
      void refreshCodexLimits();
    } catch (e) {
      setAuthMessage(String(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const signIn = async (provider: string) => {
    setAuthMessage(null);
    try {
      await invoke("start_auth_login", { provider });
      setAuthMessage(t(locale, "authLoginStarted"));
      window.setTimeout(() => {
        void refreshAuth();
      }, 4000);
    } catch (e) {
      setAuthMessage(String(e));
    }
  };

  const signOut = async (provider: string) => {
    setAuthMessage(null);
    try {
      await invoke("start_auth_logout", { provider });
      setAuthMessage(t(locale, "authLogoutStarted"));
      window.setTimeout(() => {
        void refreshAuth();
      }, 4000);
    } catch (e) {
      setAuthMessage(String(e));
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // "manuscript" is only a fallback for the brief window before
  // activeProfile first resolves (matches the backend default in
  // `profiles::active_profile_id()`) — the sidebar "Project" panel and
  // chapters list must follow whichever profile is actually active, not
  // always "Рукопись".
  const activeProfileId = activeProfile?.id ?? "manuscript";

  const loadChapters = () => {
    invoke<ChapterInfo[]>("list_chapters")
      .then((list) => {
        setChapters(list);
        setChaptersError(null);
      })
      .catch((e) => setChaptersError(String(e)));
  };

  const loadDictionaries = () => {
    invoke<DictionaryStatus[]>("list_dictionary_status")
      .then(setDictionaries)
      .catch(() => {});
  };

  useEffect(() => {
    void refreshAuth();
    void refreshCodexLimits();
    loadDictionaries();
  }, []);

  // Chapters belong to whichever profile is active, not always "manuscript"
  // — re-fetch on mount (once activeProfile first resolves) and again on
  // every profile switch, instead of once and never again.
  useEffect(() => {
    loadChapters();
  }, [activeProfile?.id]);

  useEffect(() => {
    if (availableProfiles.length === 0) return;
    Promise.all(
      availableProfiles.map((p) =>
        invoke<string | null>("get_project_path", { profileId: p.id }).then(
          (path) => [p.id, path] as const,
        ),
      ),
    ).then((entries) => {
      setProjectPaths(Object.fromEntries(entries));
    });
  }, [availableProfiles]);

  const downloadDictionary = async (lang: string) => {
    setDictionaryBusy(lang);
    try {
      await invoke("download_dictionary", { lang });
      loadDictionaries();
    } catch {
      // status list keeps showing "not installed"; user can retry
    } finally {
      setDictionaryBusy(null);
    }
  };

  const deleteDictionary = async (lang: string) => {
    setDictionaryBusy(lang);
    try {
      await invoke("delete_dictionary", { lang });
      loadDictionaries();
    } catch {
      // ignore
    } finally {
      setDictionaryBusy(null);
    }
  };

  const chooseProjectPath = async (profileId: string, directory: boolean) => {
    setProjectMessages((m) => ({ ...m, [profileId]: null }));
    const selected = await openFolderDialog({ directory, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    try {
      await invoke("set_project_path", { profileId, path: selected });
      setProjectPaths((p) => ({ ...p, [profileId]: selected }));
      refreshActiveProfileProjectPath();
      if (profileId === activeProfileId) {
        loadChapters();
        if (orchestratorContext === "free") setOrchestratorContextSafe("project");
      }
    } catch (e) {
      setProjectMessages((m) => ({ ...m, [profileId]: String(e) }));
    }
  };

  const disconnectProjectPath = async (profileId: string) => {
    if (!window.confirm(t(locale, "projectDisconnectConfirm"))) return;
    setProjectMessages((m) => ({ ...m, [profileId]: null }));
    try {
      await invoke("clear_project_path", { profileId });
      setProjectPaths((p) => ({ ...p, [profileId]: null }));
      refreshActiveProfileProjectPath();
      if (profileId === activeProfileId) {
        setChapters([]);
        setChaptersError(null);
        // Staying in "project" with nothing connected would just be a
        // blocked composer — same reasoning as the auto-switch on connect,
        // mirrored.
        if (orchestratorContext === "project") setOrchestratorContextSafe("free");
      }
    } catch (e) {
      setProjectMessages((m) => ({ ...m, [profileId]: String(e) }));
    }
  };

  const loadChapter = async (file: string) => {
    if (activeConversationId) resetActiveConversation();
    try {
      const text = await invoke<string>("read_chapter", { file });
      setPrompt(text);
      setWorkspaceMode("agents");
      setView("workspace");
    } catch (e) {
      setPrompt(t(locale, "loadChapterFailed", { error: String(e) }));
      setWorkspaceMode("agents");
      setView("workspace");
    }
  };

  const formatAppleNotesError = (raw: string) => {
    const msg = String(raw);
    if (msg.includes("only available on macOS") || msg.includes("only on macOS")) {
      return t(locale, "appleNotesOnlyMac");
    }
    if (msg.includes("access_denied") || msg.toLowerCase().includes("not allowed")) {
      return t(locale, "appleNotesAccessDenied");
    }
    return msg;
  };

  const connectAppleNotes = async () => {
    setAppleLoading(true);
    setAppleError(null);
    setAppleFolderId(null);
    setAppleNotes([]);
    try {
      const folders = await invoke<AppleNotesFolder[]>("list_apple_notes_folders");
      setAppleFolders(folders);
      setAppleConnected(true);
    } catch (e) {
      setAppleConnected(false);
      setAppleError(formatAppleNotesError(String(e)));
    } finally {
      setAppleLoading(false);
    }
  };

  const openAppleFolder = async (folderId: string) => {
    setAppleLoading(true);
    setAppleError(null);
    setAppleFolderId(folderId);
    try {
      const notes = await invoke<AppleNotesItem[]>("list_apple_notes", { folderId });
      setAppleNotes(notes);
    } catch (e) {
      setAppleNotes([]);
      setAppleError(formatAppleNotesError(String(e)));
    } finally {
      setAppleLoading(false);
    }
  };

  const loadAppleNote = async (noteId: string) => {
    if (activeConversationId) resetActiveConversation();
    try {
      const text = await invoke<string>("read_apple_note", { noteId });
      setPrompt(text);
      setWorkspaceMode("agents");
      setView("workspace");
    } catch (e) {
      setPrompt(
        t(locale, "loadAppleNoteFailed", { error: formatAppleNotesError(String(e)) }),
      );
      setWorkspaceMode("agents");
      setView("workspace");
    }
  };


  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PANEL_STORAGE_KEY, openPanel ?? "");
    } catch {
      /* ignore */
    }
  }, [openPanel]);

  const toggleNotesPanel = () => {
    setOpenPanel((current) => (current === "notes" ? null : "notes"));
  };

  const toggleAppleNotesPanel = () => {
    setOpenPanel((current) => {
      const opening = current !== "appleNotes";
      if (opening && !appleConnected && !appleLoading) {
        void connectAppleNotes();
      }
      return opening ? "appleNotes" : null;
    });
  };

  const toggleHistoryPanel = () => {
    setOpenPanel((current) => (current === "history" ? null : "history"));
  };

  const openEditorMode = () => {
    setWorkspaceMode("editor");
    setOpenPanel(null);
  };

  const openAgentsMode = () => {
    setWorkspaceMode("agents");
    setOpenPanel("notes");
  };

  const openSimpleChatMode = () => {
    setWorkspaceMode("simpleChat");
    setOpenPanel(null);
  };

  const openEntitiesMode = () => {
    setWorkspaceMode("entities");
    setOpenPanel(null);
  };

  const openChatArchive = () => {
    invoke("open_transcripts_dir").catch((e) => {
      console.error("failed to open chat archive folder", e);
    });
  };

  if (view === "settings") {
    return (
      <div className="app">
        <SettingsView
          locale={locale}
          onLocaleChange={setLocale}
          theme={theme}
          onThemeChange={setTheme}
          onOpenChatArchive={openChatArchive}
          onBack={() => setView("workspace")}
          agentAuths={
            agentAuths.length > 0
              ? agentAuths
              : AGENT_IDS.map((id) => ({
                  id,
                  label:
                    id === "claude"
                      ? "Claude"
                      : id === "codex"
                        ? "Codex"
                        : id === "cursor"
                          ? "Cursor"
                          : "OpenCode",
                  installed: false,
                  loggedIn: false,
                  account: null,
                  detail: null,
                }))
          }
          authLoading={authLoading}
          authMessage={authMessage}
          onRefreshAuth={() => {
            void refreshAuth();
          }}
          onSignIn={(provider) => {
            void signIn(provider);
          }}
          onSignOut={(provider) => {
            void signOut(provider);
          }}
          availableProfiles={availableProfiles}
          projectPaths={projectPaths}
          projectMessages={projectMessages}
          onChooseProjectFolder={(profileId) => {
            void chooseProjectPath(profileId, true);
          }}
          onChooseProjectFile={(profileId) => {
            void chooseProjectPath(profileId, false);
          }}
          onDisconnectProject={(profileId) => {
            void disconnectProjectPath(profileId);
          }}
          orchestratorContext={orchestratorContext}
          onOrchestratorContextChange={setOrchestratorContextSafe}
          activeProfileId={activeProfile?.id ?? null}
          onActiveProfileChange={setActiveProfileId}
          profileSwitchError={profileSwitchError}
          orchestratorBusy={busy}
          orchestratorSynthesizing={synthesizing}
          fullAccessMode={fullAccessMode}
          onFullAccessModeChange={setFullAccessModeSafe}
          planMode={planMode}
          onPlanModeChange={setPlanModeSafe}
          proposeMode={proposeMode}
          onProposeModeChange={setProposeModeSafe}
          selectedAgents={selectedAgents}
          onToggleAgent={toggleSelectedAgent}
          selectedRoles={selectedRoles}
          onAgentRoleChange={setAgentRole}
          structuredResultMode={structuredResultMode}
          onStructuredResultModeChange={setStructuredResultModeSafe}
          dictionaries={dictionaries}
          dictionaryBusy={dictionaryBusy}
          onDownloadDictionary={(lang) => {
            void downloadDictionary(lang);
          }}
          onDeleteDictionary={(lang) => {
            void deleteDictionary(lang);
          }}
          claudeModel={claudeModel}
          onClaudeModelChange={setClaudeModel}
          claudeEffort={claudeEffort}
          onClaudeEffortChange={setClaudeEffort}
          codexModel={codexModel}
          onCodexModelChange={setCodexModel}
          codexEffort={codexEffort}
          onCodexEffortChange={setCodexEffort}
          cursorModel={cursorModel}
          onCursorModelChange={setCursorModel}
          cursorModelOptions={cursorModelOptions}
          opencodeModel={opencodeModel}
          onOpencodeModelChange={setOpencodeModel}
          opencodeModelOptions={opencodeModelOptions}
          opencodeEffort={opencodeEffort}
          onOpencodeEffortChange={setOpencodeEffort}
        />
      </div>
    );
  }

  const showOrchestratorChrome = workspaceMode === "agents";

  return (
    <div className={showOrchestratorChrome ? "app app-orchestrator" : "app"}>
      {showOrchestratorChrome && (
        <header className="orchestrator-banner">
          <h1 className="orchestrator-title">
            {t(locale, "orchestrator")}
            <span
              className={
                fullAccessMode
                  ? "orchestrator-title-mode orchestrator-title-mode-full"
                  : planMode
                    ? "orchestrator-title-mode orchestrator-title-mode-plan"
                    : proposeMode
                      ? "orchestrator-title-mode orchestrator-title-mode-propose"
                      : "orchestrator-title-mode"
              }
            >
              {" "}
              ·{" "}
              {fullAccessMode
                ? t(locale, "orchestratorModeFullAccess")
                : planMode
                  ? t(locale, "orchestratorModePlan")
                  : proposeMode
                    ? t(locale, "orchestratorModePropose")
                    : t(locale, "orchestratorModeNormal")}
            </span>
          </h1>
          <p className="orchestrator-subtitle muted">{t(locale, "orchestratorHint")}</p>
        </header>
      )}
      <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-panels">
          <section
            className={
              workspaceMode === "simpleChat"
                ? "sidebar-panel sidebar-panel-mode-active"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-pressed={workspaceMode === "simpleChat"}
              onClick={openSimpleChatMode}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {workspaceMode === "simpleChat" ? "●" : "○"}
              </span>
              <span>{t(locale, "simpleChatSidebarLabel")}</span>
            </button>
          </section>

          <section
            className={
              workspaceMode === "agents"
                ? "sidebar-panel sidebar-panel-mode-active"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-pressed={workspaceMode === "agents"}
              onClick={openAgentsMode}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {workspaceMode === "agents" ? "●" : "○"}
              </span>
              <span>{t(locale, "orchestratorSidebarPanel")}</span>
            </button>
          </section>

          <section
            className={
              workspaceMode === "entities"
                ? "sidebar-panel sidebar-panel-mode-active"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-pressed={workspaceMode === "entities"}
              onClick={openEntitiesMode}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {workspaceMode === "entities" ? "●" : "○"}
              </span>
              <span>{t(locale, "entitiesSidebarLabel")}</span>
            </button>
          </section>

          <section
            className={
              openPanel === "notes"
                ? "sidebar-panel sidebar-panel-open"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-expanded={openPanel === "notes"}
              onClick={toggleNotesPanel}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {openPanel === "notes" ? "▾" : "▸"}
              </span>
              <span>{t(locale, "project")}</span>
            </button>
            {openPanel === "notes" && (
              <div className="sidebar-panel-body">
                {!projectPaths[activeProfileId] ? (
                  <>
                    <p className="panel-hint">{t(locale, "projectConnectHint")}</p>
                    {projectMessages[activeProfileId] && (
                      <p className="error-text">{projectMessages[activeProfileId]}</p>
                    )}
                    <button
                      type="button"
                      className="apple-notes-connect-btn"
                      onClick={() => {
                        void chooseProjectPath(activeProfileId, true);
                      }}
                    >
                      {t(locale, "chooseFolder")}
                    </button>
                    <button
                      type="button"
                      className="apple-notes-connect-btn"
                      onClick={() => {
                        void chooseProjectPath(activeProfileId, false);
                      }}
                    >
                      {t(locale, "chooseFile")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="apple-notes-toolbar">
                      <span
                        className="apple-notes-toolbar-label"
                        title={projectPaths[activeProfileId] ?? undefined}
                      >
                        {projectPaths[activeProfileId]}
                      </span>
                      <button
                        type="button"
                        className="apple-notes-link-btn"
                        onClick={() => {
                          void disconnectProjectPath(activeProfileId);
                        }}
                      >
                        {t(locale, "projectDisconnect")}
                      </button>
                    </div>
                    {chaptersError && <p className="error-text">{chaptersError}</p>}
                    <ul className="chapter-list" aria-label={t(locale, "chapters")}>
                      {chapters.map((c) => (
                        <li key={c.file}>
                          <button type="button" onClick={() => loadChapter(c.file)}>
                            {c.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>

          <section
            className={
              openPanel === "appleNotes"
                ? "sidebar-panel sidebar-panel-open"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-expanded={openPanel === "appleNotes"}
              onClick={toggleAppleNotesPanel}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {openPanel === "appleNotes" ? "▾" : "▸"}
              </span>
              <span>{t(locale, "appleNotes")}</span>
            </button>
            {openPanel === "appleNotes" && (
              <div className="sidebar-panel-body">
                <p className="panel-hint">{t(locale, "appleNotesHint")}</p>
                {!appleConnected && (
                  <button
                    type="button"
                    className="apple-notes-connect-btn"
                    disabled={appleLoading}
                    onClick={() => {
                      void connectAppleNotes();
                    }}
                  >
                    {appleLoading
                      ? t(locale, "appleNotesConnecting")
                      : t(locale, "appleNotesConnect")}
                  </button>
                )}
                {appleConnected && (
                  <div className="apple-notes-toolbar">
                    {appleFolderId ? (
                      <button
                        type="button"
                        className="apple-notes-link-btn"
                        onClick={() => {
                          setAppleFolderId(null);
                          setAppleNotes([]);
                          setAppleError(null);
                        }}
                      >
                        {t(locale, "appleNotesBack")}
                      </button>
                    ) : (
                      <span className="apple-notes-toolbar-label">
                        {t(locale, "appleNotesFolders")}
                      </span>
                    )}
                    <button
                      type="button"
                      className="apple-notes-link-btn"
                      disabled={appleLoading}
                      onClick={() => {
                        if (appleFolderId) void openAppleFolder(appleFolderId);
                        else void connectAppleNotes();
                      }}
                    >
                      {t(locale, "appleNotesRefresh")}
                    </button>
                  </div>
                )}
                {appleError && <p className="error-text">{appleError}</p>}
                {appleLoading && appleConnected && (
                  <p className="panel-hint">{t(locale, "appleNotesConnecting")}</p>
                )}
                {appleConnected && !appleFolderId && !appleLoading && (
                  <ul className="chapter-list" aria-label={t(locale, "appleNotesFolders")}>
                    {appleFolders.map((f) => (
                      <li key={f.id}>
                        <button type="button" onClick={() => void openAppleFolder(f.id)}>
                          {f.account} / {f.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {appleConnected && appleFolderId && !appleLoading && (
                  <ul className="chapter-list" aria-label={t(locale, "appleNotesNotes")}>
                    {appleNotes.length === 0 ? (
                      <li className="panel-hint">{t(locale, "appleNotesEmpty")}</li>
                    ) : (
                      appleNotes.map((n) => (
                        <li key={n.id}>
                          <button type="button" onClick={() => void loadAppleNote(n.id)}>
                            {n.title}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section
            className={
              openPanel === "history"
                ? "sidebar-panel sidebar-panel-open"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-expanded={openPanel === "history"}
              onClick={toggleHistoryPanel}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {openPanel === "history" ? "▾" : "▸"}
              </span>
              <span>{t(locale, "agentHistory")}</span>
            </button>
            {openPanel === "history" && (
              <div className="sidebar-panel-body">
                <p className="panel-hint">{t(locale, "agentHistoryHint")}</p>
                {conversations.length === 0 ? (
                  <p className="panel-hint">{t(locale, "agentHistoryEmpty")}</p>
                ) : (
                  <ul className="chapter-list" aria-label={t(locale, "agentHistory")}>
                    {[...conversations]
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .map((c) => (
                        <li key={c.id} className="history-row">
                          <button
                            type="button"
                            className={
                              c.id === activeConversationId
                                ? "history-item history-item-active"
                                : "history-item"
                            }
                            onClick={() => openConversation(c)}
                          >
                            <span className="history-item-title">{c.title}</span>
                            <span className="history-item-date">
                              {new Date(c.updatedAt).toLocaleString()}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="history-delete-btn"
                            title={t(locale, "agentHistoryDelete")}
                            aria-label={t(locale, "agentHistoryDelete")}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversation(c.id);
                            }}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section
            className={
              workspaceMode === "editor"
                ? "sidebar-panel sidebar-panel-mode-active"
                : "sidebar-panel"
            }
          >
            <button
              type="button"
              className="sidebar-panel-toggle"
              aria-pressed={workspaceMode === "editor"}
              onClick={openEditorMode}
            >
              <span className="sidebar-panel-chevron" aria-hidden="true">
                {workspaceMode === "editor" ? "●" : "○"}
              </span>
              <span>{t(locale, "editor")}</span>
            </button>
          </section>
        </div>
        <div className="sidebar-footer">
          <GithubChip
            locale={locale}
            github={authById("github")}
            authLoading={authLoading}
            authMessage={authMessage}
            onSignIn={() => {
              void signIn("github");
            }}
            onSignOut={() => {
              void signOut("github");
            }}
            onRefreshAuth={() => {
              void refreshAuth();
            }}
            onOpenSettings={() => setView("settings")}
          />
        </div>
      </aside>

      <main className="main">
        <div className="main-body">
          {workspaceMode === "editor" ? (
            <Suspense
              fallback={
                <div className="editor-loading-shell">{t(locale, "editorLoading")}</div>
              }
            >
              <WritingEditor
                key={`${activeProfile?.id ?? "none"}:${activeProfileProjectPath ?? ""}`}
                onBack={openAgentsMode}
                backLabel={t(locale, "backToAgents")}
                title={t(locale, "editor")}
                themeId={theme}
                locale={locale}
                profileId={activeProfile?.id ?? null}
              />
            </Suspense>
          ) : workspaceMode === "simpleChat" ? (
            <SimpleChat
              locale={locale}
              engine={simpleChatEngine}
              history={simpleChatHistory}
              draft={simpleChatDraft}
              onDraftChange={setSimpleChatDraft}
              busy={simpleChatBusy}
              onPickEngine={pickSimpleChatEngine}
              onNewChat={newSimpleChat}
              onSend={sendSimpleChat}
              modelMenu={simpleChatModelMenu}
            />
          ) : workspaceMode === "entities" ? (
            <EntitiesPanel
              locale={locale}
              entities={entities}
              history={entitiesHistory}
              draft={entitiesDraft}
              onDraftChange={setEntitiesDraft}
              busyEntityId={busyEntityId}
              onSend={sendEntitiesUser}
              onRespondAs={respondAsEntity}
              onNewChat={newEntitiesChat}
            />
          ) : (
            <div className="orchestrator-workspace">
              <AgentPanels
                locale={locale}
                expandedId={expandedAgentPanel}
                onToggle={(id) =>
                  setExpandedAgentPanel((current) =>
                    current === id ? null : id,
                  )
                }
                mainSlot={
                  <OrchestratorChat
                    locale={locale}
                    messages={orchestratorMessages}
                    draft={prompt}
                    onDraftChange={setPrompt}
                    onSend={send}
                    busy={busy}
                    canSynthesize={canSynthesize}
                    synthesizing={synthesizing}
                    onSynthesize={synthesize}
                    fullAccessMode={fullAccessMode}
                    planMode={planMode}
                    proposeMode={proposeMode}
                    context={orchestratorContext}
                    onSwitchToFreeChat={() => setOrchestratorContextSafe("free")}
                    onSwitchToProject={() => setOrchestratorContextSafe("project")}
                    contextTip={contextTip}
                    onDismissContextTip={dismissContextTip}
                    selectedAgents={selectedAgents}
                    projectConnected={!!activeProfileProjectPath}
                    activeProfileId={activeProfile?.id ?? null}
                    onApplyProposalChange={applyProposalChange}
                    onRejectProposalChange={rejectProposalChange}
                    onRollbackProposalChange={rollbackProposalChange}
                    attachedFiles={attachedFiles}
                    onAttachFile={addAttachedFile}
                    onRemoveAttachedFile={removeAttachedFile}
                    activeSince={activeSince}
                  />
                }
                panels={[
                  {
                    id: "claude",
                    state: claude,
                    auth: authById("claude"),
                    authLoading,
                    body: (
                      <Variant
                        label="Claude"
                        state={claude}
                        history={claudeHistory}
                        locale={locale}
                        auth={authById("claude")}
                        authLoading={authLoading}
                        sessionId={claudeSessionId}
                        replyValue={claudeReply}
                        onReplyChange={setClaudeReply}
                        onReplySend={continueClaude}
                        modelMenu={
                          <AgentModelMenu
                            locale={locale}
                            model={claudeModel}
                            onModelChange={setClaudeModel}
                            modelOptions={CLAUDE_MODEL_OPTIONS}
                            effort={claudeEffort}
                            onEffortChange={setClaudeEffort}
                            effortOptions={CLAUDE_EFFORT_OPTIONS}
                          />
                        }
                      />
                    ),
                  },
                  {
                    id: "codex",
                    state: codex,
                    auth: authById("codex"),
                    authLoading,
                    body: (
                      <Variant
                        label="Codex (Sol)"
                        state={codex}
                        history={codexHistory}
                        locale={locale}
                        auth={authById("codex")}
                        authLoading={authLoading}
                        limits={codexLimits}
                        limitsLoading={codexLimitsLoading}
                        onRefreshLimits={() => {
                          void refreshCodexLimits();
                        }}
                        sessionId={codexThreadId}
                        replyValue={codexReply}
                        onReplyChange={setCodexReply}
                        onReplySend={continueCodex}
                        modelMenu={
                          <AgentModelMenu
                            locale={locale}
                            model={codexModel}
                            onModelChange={setCodexModel}
                            modelOptions={CODEX_MODEL_OPTIONS}
                            effort={codexEffort}
                            onEffortChange={setCodexEffort}
                            effortOptions={CODEX_EFFORT_OPTIONS}
                          />
                        }
                      />
                    ),
                  },
                  {
                    id: "cursor",
                    state: cursor,
                    auth: authById("cursor"),
                    authLoading,
                    body: (
                      <Variant
                        label="Cursor (plan)"
                        state={cursor}
                        history={cursorHistory}
                        locale={locale}
                        auth={authById("cursor")}
                        authLoading={authLoading}
                        sessionId={cursorSessionId}
                        replyValue={cursorReply}
                        onReplyChange={setCursorReply}
                        onReplySend={continueCursor}
                        modelMenu={
                          <AgentModelMenu
                            locale={locale}
                            model={cursorModel}
                            onModelChange={setCursorModel}
                            modelOptions={cursorModelOptions}
                          />
                        }
                      />
                    ),
                  },
                  {
                    id: "opencode",
                    state: opencode,
                    auth: authById("opencode"),
                    authLoading,
                    body: (
                      <Variant
                        label="OpenCode (plan)"
                        state={opencode}
                        history={opencodeHistory}
                        locale={locale}
                        auth={authById("opencode")}
                        authLoading={authLoading}
                        sessionId={opencodeSessionId}
                        replyValue={opencodeReply}
                        onReplyChange={setOpencodeReply}
                        onReplySend={continueOpencode}
                        modelMenu={
                          <AgentModelMenu
                            locale={locale}
                            model={opencodeModel}
                            onModelChange={setOpencodeModel}
                            modelOptions={opencodeModelOptions}
                            effort={opencodeEffort}
                            onEffortChange={setOpencodeEffort}
                            effortOptions={OPENCODE_EFFORT_OPTIONS}
                          />
                        }
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
        <div className="main-footer">
          <UpdateBar locale={locale} />
        </div>
      </main>
      </div>
    </div>
  );
}
