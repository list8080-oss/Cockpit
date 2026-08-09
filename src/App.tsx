import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import {
  LOCALES,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isLocale,
  t,
  type Locale,
} from "./i18n";
import {
  THEMES,
  THEME_STORAGE_KEY,
  applyTheme,
  detectTheme,
  isTheme,
  type Theme,
} from "./theme";
import { CHANGELOG, noteFor } from "./changelog";
import { WritingEditor } from "./writing-editor";
import "./App.css";

type View = "workspace" | "settings";
type WorkspaceMode = "agents" | "editor";
type SidebarPanelId = "notes" | "appleNotes" | "history" | null;

const EDITOR_STORAGE_KEY = "yar-cockpit.editor";
const LEGACY_EDITOR_STORAGE_KEY = "yar-cockpit.notes";
const SIDEBAR_PANEL_STORAGE_KEY = "yar-cockpit.sidebarPanel";
const CONVERSATIONS_STORAGE_KEY = "yar-cockpit.agentConversations";
const ACTIVE_CONVERSATION_STORAGE_KEY = "yar-cockpit.activeConversationId";
const MAX_STORED_CONVERSATIONS = 100;

const SIDEBAR_PANEL_IDS: SidebarPanelId[] = ["notes", "appleNotes", "history"];

function loadSidebarPanel(): SidebarPanelId {
  try {
    const raw = localStorage.getItem(SIDEBAR_PANEL_STORAGE_KEY);
    return (SIDEBAR_PANEL_IDS as string[]).includes(raw ?? "") ? (raw as SidebarPanelId) : null;
  } catch {
    return null;
  }
}

interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

interface EngineThread {
  history: ConversationTurn[];
  sessionId: string | null;
}

interface AgentConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  prompt: string;
  claude: EngineThread;
  codex: EngineThread;
  cursor: EngineThread;
}

function loadConversations(): AgentConversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistConversations(list: AgentConversation[]) {
  try {
    localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_STORED_CONVERSATIONS)),
    );
  } catch {
    /* ignore (e.g. storage quota) */
  }
}

function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function persistActiveConversationId(id: string | null) {
  try {
    localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id ?? "");
  } catch {
    /* ignore */
  }
}

function conversationTitle(text: string): string {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "…";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine;
}

function emptyEngineThread(): EngineThread {
  return { history: [], sessionId: null };
}

type CodexLimitWindow = {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
};

type CodexLimits = {
  available: boolean;
  fiveHour: CodexLimitWindow | null;
  weekly: CodexLimitWindow | null;
  planType: string | null;
  detail: string | null;
};

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "downloading"; version: string }
  | { status: "restarting" }
  | { status: "error"; message: string };

function useAppUpdate(locale: Locale) {
  const [version, setVersion] = useState("");
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const run = async () => {
    setState({ status: "checking" });
    try {
      const update = await checkForUpdate();
      if (!update) {
        setState({ status: "up-to-date" });
        return;
      }
      setState({ status: "downloading", version: update.version });
      await update.downloadAndInstall();
      setState({ status: "restarting" });
      await relaunch();
    } catch (e) {
      setState({ status: "error", message: String(e) });
    }
  };

  const busy =
    state.status === "checking" ||
    state.status === "downloading" ||
    state.status === "restarting";

  let statusText = "";
  if (state.status === "up-to-date") statusText = t(locale, "updateUpToDate");
  if (state.status === "checking") statusText = t(locale, "updateChecking");
  if (state.status === "downloading") {
    statusText = t(locale, "updateDownloading", { version: state.version });
  }
  if (state.status === "restarting") statusText = t(locale, "updateRestarting");
  if (state.status === "error") statusText = state.message;

  return { version, busy, statusText, isError: state.status === "error", run };
}

function UpdateBar({ locale }: { locale: Locale }) {
  const { version, busy, statusText, isError, run } = useAppUpdate(locale);

  return (
    <div className="update-bar">
      <span className="version">v{version || "…"}</span>
      <button type="button" onClick={run} disabled={busy}>
        {busy ? "…" : t(locale, "checkUpdate")}
      </button>
      {statusText && (
        <span className={isError ? "error-text" : "muted"}>{statusText}</span>
      )}
    </div>
  );
}

interface AuthStatus {
  id: string;
  label: string;
  installed: boolean;
  loggedIn: boolean;
  account: string | null;
  detail: string | null;
}

const AGENT_IDS = ["claude", "codex", "cursor"] as const;

function authStatusLabel(locale: Locale, auth: AuthStatus | undefined, loading: boolean) {
  if (loading && !auth) return t(locale, "authChecking");
  if (!auth) return t(locale, "authSignedOut");
  if (!auth.installed) return t(locale, "authMissingCli");
  if (auth.loggedIn) return auth.account || t(locale, "authSignedIn");
  return t(locale, "authSignedOut");
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
        0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
        -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07
        -.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08
        -.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2
        .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82
        2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01
        2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

function GithubChip({
  locale,
  github,
  authLoading,
  authMessage,
  onSignIn,
  onSignOut,
  onRefreshAuth,
  onOpenSettings,
}: {
  locale: Locale;
  github: AuthStatus | undefined;
  authLoading: boolean;
  authMessage: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshAuth: () => void;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(github?.loggedIn);
  const missing = Boolean(github && !github.installed);

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

  const status = authStatusLabel(locale, github, authLoading);
  const name = signedIn
    ? github?.account || t(locale, "githubTitle")
    : t(locale, "githubTitle");
  const subtitle = signedIn
    ? t(locale, "githubSignedInAs")
    : status;
  const markClass = missing
    ? "gh-mark gh-mark-miss"
    : signedIn
      ? "gh-mark gh-mark-on"
      : "gh-mark gh-mark-off";

  return (
    <div className="gh-chip-wrap" ref={rootRef}>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-note">
            {name}
            <br />
            {status}
          </div>
          {signedIn ? (
            <button
              type="button"
              role="menuitem"
              className="account-dropdown-item"
              disabled={!github?.installed || authLoading}
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              {t(locale, "githubSignOut")}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="account-dropdown-item"
              disabled={!github?.installed || authLoading}
              onClick={() => {
                setOpen(false);
                onSignIn();
              }}
            >
              {t(locale, "githubSignIn")}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="account-dropdown-item"
            disabled={authLoading}
            onClick={() => {
              onRefreshAuth();
            }}
          >
            {authLoading ? t(locale, "authChecking") : t(locale, "authRefresh")}
          </button>
          {authMessage && (
            <div className="account-dropdown-note">{authMessage}</div>
          )}
        </div>
      )}
      <div className={open ? "gh-chip gh-chip-active" : "gh-chip"}>
        <button
          type="button"
          className="gh-chip-main"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t(locale, "accountMenu")}
          title={status}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={markClass}>
            <GithubMark />
          </span>
          <span className="gh-chip-meta">
            <span className="gh-chip-name">{name}</span>
            <span className="gh-chip-status">{subtitle}</span>
          </span>
        </button>
        <button
          type="button"
          className="gh-chip-settings"
          aria-label={t(locale, "openSettings")}
          title={t(locale, "openSettings")}
          onClick={onOpenSettings}
        >
          ⚙
        </button>
      </div>
    </div>
  );
}

function formatLimitChip(locale: Locale, limits: CodexLimits | null): string {
  if (!limits?.available) return t(locale, "limitUnavailable");
  const parts: string[] = [];
  if (limits.fiveHour) {
    parts.push(
      t(locale, "limitUsed", {
        label: t(locale, "limitFiveHour"),
        percent: String(Math.round(limits.fiveHour.usedPercent)),
      }),
    );
  }
  if (limits.weekly) {
    parts.push(
      t(locale, "limitUsed", {
        label: t(locale, "limitWeekly"),
        percent: String(Math.round(limits.weekly.usedPercent)),
      }),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : t(locale, "limitUnavailable");
}

function EngineLamp({
  locale,
  auth,
  loading,
  limits,
  limitsLoading,
  onRefreshLimits,
}: {
  locale: Locale;
  auth: AuthStatus | undefined;
  loading: boolean;
  limits?: CodexLimits | null;
  limitsLoading?: boolean;
  onRefreshLimits?: () => void;
}) {
  const signedIn = Boolean(auth?.loggedIn);
  const missing = Boolean(auth && !auth.installed);
  const label = loading && !auth
    ? t(locale, "authChecking")
    : missing
      ? t(locale, "authMissingCli")
      : signedIn
        ? auth?.account || t(locale, "authReady")
        : t(locale, "authNotReady");

  const showLimits = limits !== undefined;
  const limitTitle = limits?.detail
    ? `${formatLimitChip(locale, limits)} — ${limits.detail}`
    : formatLimitChip(locale, limits ?? null);

  return (
    <div className="engine-lamp-row" title={label}>
      <span
        className={
          loading && !auth
            ? "engine-lamp engine-lamp-loading"
            : missing
              ? "engine-lamp engine-lamp-miss"
              : signedIn
                ? "engine-lamp engine-lamp-on"
                : "engine-lamp engine-lamp-off"
        }
        aria-label={label}
      />
      {showLimits && (
        <button
          type="button"
          className={
            limits?.available
              ? "limit-chip"
              : "limit-chip limit-chip-muted"
          }
          title={limitTitle}
          aria-label={t(locale, "limitRefresh")}
          disabled={limitsLoading}
          onClick={() => onRefreshLimits?.()}
        >
          {limitsLoading ? "…" : formatLimitChip(locale, limits ?? null)}
        </button>
      )}
    </div>
  );
}

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

interface EngineReply {
  text: string;
  sessionId: string | null;
}

type VariantState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done" }
  | { status: "error"; message: string };

function Variant({
  label,
  state,
  history,
  locale,
  auth,
  authLoading,
  limits,
  limitsLoading,
  onRefreshLimits,
  sessionId,
  replyValue,
  onReplyChange,
  onReplySend,
}: {
  label: string;
  state: VariantState;
  history: ConversationTurn[];
  locale: Locale;
  auth: AuthStatus | undefined;
  authLoading: boolean;
  limits?: CodexLimits | null;
  limitsLoading?: boolean;
  onRefreshLimits?: () => void;
  sessionId?: string | null;
  replyValue?: string;
  onReplyChange?: (value: string) => void;
  onReplySend?: () => void;
}) {
  const copy = () => {
    const lastAssistant = [...history].reverse().find((turn) => turn.role === "assistant");
    if (lastAssistant) navigator.clipboard.writeText(lastAssistant.text);
  };
  const canReply = state.status !== "running" && !!sessionId && !!onReplySend;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, state.status]);
  return (
    <div className="variant-column">
      <EngineLamp
        locale={locale}
        auth={auth}
        loading={authLoading}
        limits={limits}
        limitsLoading={limitsLoading}
        onRefreshLimits={onRefreshLimits}
      />
      <div className="variant">
        <div className="variant-head">
          <span className="variant-label">{label}</span>
          {state.status === "running" && (
            <span className="badge badge-running">{t(locale, "writing")}</span>
          )}
          {state.status === "error" && (
            <span className="badge badge-error">{t(locale, "error")}</span>
          )}
          {history.length > 0 && state.status !== "running" && (
            <button
              className="copy-btn"
              onClick={copy}
              title={t(locale, "copyTitle")}
            >
              {t(locale, "copy")}
            </button>
          )}
        </div>
        <div className="variant-body" ref={bodyRef}>
          {history.length === 0 && state.status === "idle" && (
            <span className="muted">—</span>
          )}
          {history.map((turn, i) => (
            <div
              key={i}
              className={
                turn.role === "user" ? "variant-turn variant-turn-user" : "variant-turn"
              }
            >
              <pre>{turn.text}</pre>
            </div>
          ))}
          {state.status === "running" && (
            <span className="muted">{t(locale, "waiting")}</span>
          )}
          {state.status === "error" && (
            <span className="error-text">{state.message}</span>
          )}
        </div>
        {canReply && (
          <div className="variant-reply">
            <textarea
              className="variant-reply-box"
              value={replyValue}
              onChange={(e) => onReplyChange?.(e.target.value)}
              placeholder={t(locale, "replyPlaceholder")}
            />
            <button
              type="button"
              className="variant-reply-btn"
              onClick={onReplySend}
              disabled={!replyValue?.trim()}
            >
              {t(locale, "replySend")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type SettingsSection = "general" | "manuscript" | "dictionaries" | "updates" | "agents";

interface DictionaryStatus {
  lang: string;
  installed: boolean;
}

const DICTIONARY_LABELS: Record<string, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  cs: "Čeština",
};

function themeLabel(locale: Locale, theme: Theme): string {
  switch (theme) {
    case "normal":
      return t(locale, "themeNormal");
    case "night":
      return t(locale, "themeNight");
    case "book":
      return t(locale, "themeBook");
  }
}

function SettingsView({
  locale,
  onLocaleChange,
  theme,
  onThemeChange,
  onBack,
  agentAuths,
  authLoading,
  authMessage,
  onRefreshAuth,
  onSignIn,
  onSignOut,
  manuscriptPath,
  onChooseManuscriptFolder,
  onChooseManuscriptFile,
  onDisconnectManuscript,
  manuscriptMessage,
  dictionaries,
  dictionaryBusy,
  onDownloadDictionary,
  onDeleteDictionary,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onBack: () => void;
  agentAuths: AuthStatus[];
  authLoading: boolean;
  authMessage: string | null;
  onRefreshAuth: () => void;
  onSignIn: (provider: string) => void;
  onSignOut: (provider: string) => void;
  manuscriptPath: string | null;
  onChooseManuscriptFolder: () => void;
  onChooseManuscriptFile: () => void;
  onDisconnectManuscript: () => void;
  manuscriptMessage: string | null;
  dictionaries: DictionaryStatus[];
  dictionaryBusy: string | null;
  onDownloadDictionary: (lang: string) => void;
  onDeleteDictionary: (lang: string) => void;
}) {
  const [section, setSection] = useState<SettingsSection>("general");
  const {
    version,
    busy: updateBusy,
    statusText: updateStatus,
    isError: updateError,
    run: checkUpdate,
  } = useAppUpdate(locale);

  const navItems: { id: SettingsSection; label: string }[] = [
    { id: "general", label: t(locale, "settingsGeneral") },
    { id: "manuscript", label: t(locale, "settingsManuscript") },
    { id: "dictionaries", label: t(locale, "settingsDictionaries") },
    { id: "updates", label: t(locale, "settingsUpdates") },
    { id: "agents", label: t(locale, "settingsAgents") },
  ];

  return (
    <div className="settings">
      <aside className="settings-sidebar">
        <button type="button" className="settings-back" onClick={onBack}>
          ← {t(locale, "backToWorkspace")}
        </button>
        <h1>{t(locale, "settings")}</h1>
        <nav className="settings-nav" aria-label={t(locale, "settingsNav")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                section === item.id
                  ? "settings-nav-item settings-nav-item-active"
                  : "settings-nav-item"
              }
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="settings-panel">
        {section === "general" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsGeneral")}</h2>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "language")}</div>
                <div className="settings-hint">{t(locale, "languageHint")}</div>
              </div>
              <select
                className="settings-select"
                value={locale}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isLocale(next)) onLocaleChange(next);
                }}
                aria-label={t(locale, "language")}
              >
                {LOCALES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "appearance")}</div>
                <div className="settings-hint">{t(locale, "appearanceHint")}</div>
              </div>
              <select
                className="settings-select"
                value={theme}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isTheme(next)) onThemeChange(next);
                }}
                aria-label={t(locale, "appearance")}
              >
                {THEMES.map((id) => (
                  <option key={id} value={id}>
                    {themeLabel(locale, id)}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {section === "manuscript" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsManuscript")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsManuscriptHint")}
            </p>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "manuscriptPath")}</div>
                <div className="settings-hint">
                  {manuscriptPath || t(locale, "manuscriptNotSet")}
                </div>
                {manuscriptMessage && (
                  <div className="settings-hint">{manuscriptMessage}</div>
                )}
              </div>
              <div className="settings-row-actions">
                <button
                  type="button"
                  className="auth-action-btn"
                  onClick={onChooseManuscriptFolder}
                >
                  {t(locale, "chooseFolder")}
                </button>
                <button
                  type="button"
                  className="auth-action-btn"
                  onClick={onChooseManuscriptFile}
                >
                  {t(locale, "chooseFile")}
                </button>
                {manuscriptPath && (
                  <button
                    type="button"
                    className="auth-action-btn"
                    onClick={onDisconnectManuscript}
                  >
                    {t(locale, "projectDisconnect")}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {section === "dictionaries" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsDictionaries")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsDictionariesHint")}
            </p>
            <div className="auth-list">
              {dictionaries.map((item) => (
                <div className="settings-row auth-row" key={item.lang}>
                  <div className="settings-row-text">
                    <div className="settings-label">
                      {DICTIONARY_LABELS[item.lang] ?? item.lang}
                    </div>
                    <div className="settings-hint">
                      {item.installed
                        ? t(locale, "dictionaryInstalled")
                        : t(locale, "dictionaryNotInstalled")}
                    </div>
                  </div>
                  {item.installed ? (
                    <button
                      type="button"
                      className="auth-action-btn"
                      disabled={dictionaryBusy === item.lang}
                      onClick={() => onDeleteDictionary(item.lang)}
                    >
                      {t(locale, "dictionaryRemove")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="auth-action-btn"
                      disabled={dictionaryBusy === item.lang}
                      onClick={() => onDownloadDictionary(item.lang)}
                    >
                      {dictionaryBusy === item.lang
                        ? "…"
                        : t(locale, "dictionaryDownload")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {section === "updates" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsUpdates")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsUpdatesHint")}
            </p>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "currentVersion")}</div>
                <div className="settings-hint">v{version || "…"}</div>
                {updateStatus && (
                  <div className={updateError ? "error-text" : "settings-hint"}>
                    {updateStatus}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="auth-action-btn"
                onClick={() => {
                  void checkUpdate();
                }}
                disabled={updateBusy}
              >
                {updateBusy ? "…" : t(locale, "checkUpdate")}
              </button>
            </div>
            <div className="changelog">
              <div className="changelog-title">{t(locale, "versionHistory")}</div>
              <ul className="changelog-list">
                {CHANGELOG.map((entry) => (
                  <li key={entry.version} className="changelog-item">
                    <div className="changelog-head">
                      <span className="changelog-version">v{entry.version}</span>
                      <span className="changelog-date">{entry.date}</span>
                    </div>
                    <p className="changelog-notes">{noteFor(entry, locale)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {section === "agents" && (
          <section className="settings-section">
            <div className="settings-section-head">
              <h2>{t(locale, "settingsAgents")}</h2>
              <button
                type="button"
                className="settings-refresh"
                onClick={onRefreshAuth}
                disabled={authLoading}
              >
                {authLoading ? t(locale, "authChecking") : t(locale, "authRefresh")}
              </button>
            </div>
            <p className="settings-section-hint">
              {t(locale, "settingsAgentsHint")}
            </p>
            {authMessage && <p className="muted">{authMessage}</p>}
            <div className="auth-list">
              {agentAuths.map((item) => {
                const status = authStatusLabel(locale, item, authLoading);
                return (
                  <div className="settings-row auth-row" key={item.id}>
                    <div className="settings-row-text">
                      <div className="settings-label-row">
                        <span
                          className={
                            !item.installed
                              ? "engine-lamp engine-lamp-miss"
                              : item.loggedIn
                                ? "engine-lamp engine-lamp-on"
                                : "engine-lamp engine-lamp-off"
                          }
                          aria-hidden="true"
                        />
                        <span className="settings-label">{item.label}</span>
                      </div>
                      <div className="settings-hint">{status}</div>
                    </div>
                    {item.loggedIn ? (
                      <button
                        type="button"
                        className="auth-action-btn"
                        disabled={!item.installed || authLoading}
                        onClick={() => onSignOut(item.id)}
                      >
                        {t(locale, "authSignOut")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="auth-action-btn"
                        disabled={!item.installed || authLoading}
                        onClick={() => onSignIn(item.id)}
                      >
                        {t(locale, "authSignIn")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [theme, setTheme] = useState<Theme>(() => detectTheme());
  const [view, setView] = useState<View>("workspace");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("agents");
  const [openPanel, setOpenPanel] = useState<SidebarPanelId>(loadSidebarPanel);
  const [editorText, setEditorText] = useState(() => {
    try {
      return (
        localStorage.getItem(EDITOR_STORAGE_KEY) ??
        localStorage.getItem(LEGACY_EDITOR_STORAGE_KEY) ??
        ""
      );
    } catch {
      return "";
    }
  });
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [appleFolders, setAppleFolders] = useState<AppleNotesFolder[]>([]);
  const [appleNotes, setAppleNotes] = useState<AppleNotesItem[]>([]);
  const [appleFolderId, setAppleFolderId] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleConnected, setAppleConnected] = useState(false);
  const [manuscriptPath, setManuscriptPath] = useState<string | null>(null);
  const [manuscriptMessage, setManuscriptMessage] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>(() =>
    loadConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const id = loadActiveConversationId();
    return id && loadConversations().some((c) => c.id === id) ? id : null;
  });
  const restoredConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  const [prompt, setPrompt] = useState(() => restoredConversation?.prompt ?? "");
  const [claude, setClaude] = useState<VariantState>(() =>
    (restoredConversation?.claude.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [codex, setCodex] = useState<VariantState>(() =>
    (restoredConversation?.codex.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [cursor, setCursor] = useState<VariantState>(() =>
    (restoredConversation?.cursor.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(
    () => restoredConversation?.claude.sessionId ?? null,
  );
  const [codexThreadId, setCodexThreadId] = useState<string | null>(
    () => restoredConversation?.codex.sessionId ?? null,
  );
  const [cursorSessionId, setCursorSessionId] = useState<string | null>(
    () => restoredConversation?.cursor.sessionId ?? null,
  );
  const [claudeReply, setClaudeReply] = useState("");
  const [codexReply, setCodexReply] = useState("");
  const [cursorReply, setCursorReply] = useState("");
  const [claudeHistory, setClaudeHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.claude.history ?? [],
  );
  const [codexHistory, setCodexHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.codex.history ?? [],
  );
  const [cursorHistory, setCursorHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.cursor.history ?? [],
  );
  const [auths, setAuths] = useState<AuthStatus[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [codexLimits, setCodexLimits] = useState<CodexLimits | null>(null);
  const [codexLimitsLoading, setCodexLimitsLoading] = useState(false);
  const [dictionaries, setDictionaries] = useState<DictionaryStatus[]>([]);
  const [dictionaryBusy, setDictionaryBusy] = useState<string | null>(null);

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
    loadChapters();
    invoke<string | null>("get_manuscript_path").then(setManuscriptPath);
    void refreshAuth();
    void refreshCodexLimits();
    loadDictionaries();
  }, []);

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

  const chooseManuscriptFolder = async () => {
    setManuscriptMessage(null);
    const selected = await openFolderDialog({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    try {
      await invoke("set_manuscript_path", { path: selected });
      setManuscriptPath(selected);
      loadChapters();
    } catch (e) {
      setManuscriptMessage(String(e));
    }
  };

  const chooseManuscriptFile = async () => {
    setManuscriptMessage(null);
    const selected = await openFolderDialog({ directory: false, multiple: false });
    if (!selected || Array.isArray(selected)) return;
    try {
      await invoke("set_manuscript_path", { path: selected });
      setManuscriptPath(selected);
      loadChapters();
    } catch (e) {
      setManuscriptMessage(String(e));
    }
  };

  const disconnectManuscript = async () => {
    if (!window.confirm(t(locale, "projectDisconnectConfirm"))) return;
    setManuscriptMessage(null);
    try {
      await invoke("clear_manuscript_path");
      setManuscriptPath(null);
      setChapters([]);
      setChaptersError(null);
    } catch (e) {
      setManuscriptMessage(String(e));
    }
  };

  const loadChapter = async (file: string) => {
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

  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const isStillActive = (id: string) => activeConversationIdRef.current === id;

  // A fast double-click/double-Enter can fire the handler twice before React
  // re-renders to hide the reply box (state updates aren't applied until the
  // next render) — two concurrent `-r <session_id>` resume calls to the same
  // CLI session can then race, and one of the two replies gets lost. These
  // refs make each send/reply a no-op while its own request is in flight.
  const sendBusyRef = useRef(false);
  const claudeBusyRef = useRef(false);
  const codexBusyRef = useRef(false);
  const cursorBusyRef = useRef(false);

  const upsertConversation = (id: string, updater: (c: AgentConversation) => AgentConversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updater(prev[idx]);
      persistConversations(next);
      return next;
    });
  };

  const send = () => {
    if (!prompt.trim() || sendBusyRef.current) return;
    sendBusyRef.current = true;
    const id = crypto.randomUUID();
    const now = Date.now();
    const conversation: AgentConversation = {
      id,
      title: conversationTitle(prompt),
      createdAt: now,
      updatedAt: now,
      prompt,
      claude: emptyEngineThread(),
      codex: emptyEngineThread(),
      cursor: emptyEngineThread(),
    };
    setConversations((prev) => {
      const next = [conversation, ...prev];
      persistConversations(next);
      return next;
    });
    setActiveConversationId(id);
    persistActiveConversationId(id);

    setClaude({ status: "running" });
    setCodex({ status: "running" });
    setCursor({ status: "running" });
    setClaudeSessionId(null);
    setCodexThreadId(null);
    setCursorSessionId(null);
    setClaudeReply("");
    setCodexReply("");
    setCursorReply("");
    setClaudeHistory([]);
    setCodexHistory([]);
    setCursorHistory([]);
    const claudeCall = invoke<EngineReply>("run_claude", { prompt })
      .then((reply) => {
        const history: ConversationTurn[] = [{ role: "assistant", text: reply.text }];
        upsertConversation(id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          claude: { history, sessionId: reply.sessionId },
        }));
        if (!isStillActive(id)) return;
        setClaudeSessionId(reply.sessionId);
        setClaudeHistory(history);
        setClaude({ status: "done" });
      })
      .catch((e) => {
        if (isStillActive(id)) setClaude({ status: "error", message: String(e) });
      });
    const codexCall = invoke<EngineReply>("run_codex", { prompt })
      .then((reply) => {
        const history: ConversationTurn[] = [{ role: "assistant", text: reply.text }];
        upsertConversation(id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          codex: { history, sessionId: reply.sessionId },
        }));
        if (isStillActive(id)) {
          setCodexThreadId(reply.sessionId);
          setCodexHistory(history);
          setCodex({ status: "done" });
        }
        void refreshCodexLimits();
      })
      .catch((e) => {
        if (isStillActive(id)) setCodex({ status: "error", message: String(e) });
        void refreshCodexLimits();
      });
    const cursorCall = invoke<EngineReply>("run_cursor", { prompt })
      .then((reply) => {
        const history: ConversationTurn[] = [{ role: "assistant", text: reply.text }];
        upsertConversation(id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          cursor: { history, sessionId: reply.sessionId },
        }));
        if (!isStillActive(id)) return;
        setCursorSessionId(reply.sessionId);
        setCursorHistory(history);
        setCursor({ status: "done" });
      })
      .catch((e) => {
        if (isStillActive(id)) setCursor({ status: "error", message: String(e) });
      });
    void Promise.allSettled([claudeCall, codexCall, cursorCall]).finally(() => {
      sendBusyRef.current = false;
    });
  };

  const continueClaude = () => {
    const text = claudeReply.trim();
    if (!text || !claudeSessionId || !activeConversationId || claudeBusyRef.current) return;
    claudeBusyRef.current = true;
    const conversationId = activeConversationId;
    setClaude({ status: "running" });
    setClaudeReply("");
    const withUserTurn: ConversationTurn[] = [...claudeHistory, { role: "user", text }];
    setClaudeHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      claude: { ...c.claude, history: withUserTurn },
    }));
    invoke<EngineReply>("run_claude", { prompt: text, sessionId: claudeSessionId })
      .then((reply) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          claude: {
            history: [...c.claude.history, { role: "assistant", text: reply.text }],
            sessionId: reply.sessionId,
          },
        }));
        if (!isStillActive(conversationId)) return;
        setClaudeSessionId(reply.sessionId);
        setClaudeHistory((h) => [...h, { role: "assistant", text: reply.text }]);
        setClaude({ status: "done" });
      })
      .catch((e) => {
        if (isStillActive(conversationId)) setClaude({ status: "error", message: String(e) });
      })
      .finally(() => {
        claudeBusyRef.current = false;
      });
  };

  const continueCodex = () => {
    const text = codexReply.trim();
    if (!text || !codexThreadId || !activeConversationId || codexBusyRef.current) return;
    codexBusyRef.current = true;
    const conversationId = activeConversationId;
    setCodex({ status: "running" });
    setCodexReply("");
    const withUserTurn: ConversationTurn[] = [...codexHistory, { role: "user", text }];
    setCodexHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      codex: { ...c.codex, history: withUserTurn },
    }));
    invoke<EngineReply>("run_codex", { prompt: text, sessionId: codexThreadId })
      .then((reply) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          codex: {
            history: [...c.codex.history, { role: "assistant", text: reply.text }],
            sessionId: reply.sessionId,
          },
        }));
        if (isStillActive(conversationId)) {
          setCodexThreadId(reply.sessionId);
          setCodexHistory((h) => [...h, { role: "assistant", text: reply.text }]);
          setCodex({ status: "done" });
        }
        void refreshCodexLimits();
      })
      .catch((e) => {
        if (isStillActive(conversationId)) setCodex({ status: "error", message: String(e) });
        void refreshCodexLimits();
      })
      .finally(() => {
        codexBusyRef.current = false;
      });
  };

  const continueCursor = () => {
    const text = cursorReply.trim();
    if (!text || !cursorSessionId || !activeConversationId || cursorBusyRef.current) return;
    cursorBusyRef.current = true;
    const conversationId = activeConversationId;
    setCursor({ status: "running" });
    setCursorReply("");
    const withUserTurn: ConversationTurn[] = [...cursorHistory, { role: "user", text }];
    setCursorHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      cursor: { ...c.cursor, history: withUserTurn },
    }));
    invoke<EngineReply>("run_cursor", { prompt: text, sessionId: cursorSessionId })
      .then((reply) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          cursor: {
            history: [...c.cursor.history, { role: "assistant", text: reply.text }],
            sessionId: reply.sessionId,
          },
        }));
        if (!isStillActive(conversationId)) return;
        setCursorSessionId(reply.sessionId);
        setCursorHistory((h) => [...h, { role: "assistant", text: reply.text }]);
        setCursor({ status: "done" });
      })
      .catch((e) => {
        if (isStillActive(conversationId)) setCursor({ status: "error", message: String(e) });
      })
      .finally(() => {
        cursorBusyRef.current = false;
      });
  };

  const openConversation = (conversation: AgentConversation) => {
    setActiveConversationId(conversation.id);
    persistActiveConversationId(conversation.id);
    setPrompt(conversation.prompt);
    setClaudeHistory(conversation.claude.history);
    setClaudeSessionId(conversation.claude.sessionId);
    setClaude({ status: conversation.claude.history.length > 0 ? "done" : "idle" });
    setCodexHistory(conversation.codex.history);
    setCodexThreadId(conversation.codex.sessionId);
    setCodex({ status: conversation.codex.history.length > 0 ? "done" : "idle" });
    setCursorHistory(conversation.cursor.history);
    setCursorSessionId(conversation.cursor.sessionId);
    setCursor({ status: conversation.cursor.history.length > 0 ? "done" : "idle" });
    setClaudeReply("");
    setCodexReply("");
    setCursorReply("");
    setWorkspaceMode("agents");
    setView("workspace");
  };

  const deleteConversation = (id: string) => {
    if (!window.confirm(t(locale, "agentHistoryDeleteConfirm"))) return;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistConversations(next);
      return next;
    });
    if (activeConversationId === id) {
      setActiveConversationId(null);
      persistActiveConversationId(null);
      setPrompt("");
      setClaudeHistory([]);
      setCodexHistory([]);
      setCursorHistory([]);
      setClaudeSessionId(null);
      setCodexThreadId(null);
      setCursorSessionId(null);
      setClaudeReply("");
      setCodexReply("");
      setCursorReply("");
      setClaude({ status: "idle" });
      setCodex({ status: "idle" });
      setCursor({ status: "idle" });
    }
  };

  const busy =
    claude.status === "running" ||
    codex.status === "running" ||
    cursor.status === "running";

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_PANEL_STORAGE_KEY, openPanel ?? "");
    } catch {
      /* ignore */
    }
  }, [openPanel]);

  useEffect(() => {
    try {
      localStorage.setItem(EDITOR_STORAGE_KEY, editorText);
    } catch {
      // ignore quota / private mode
    }
  }, [editorText]);

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

  if (view === "settings") {
    return (
      <div className="app">
        <SettingsView
          locale={locale}
          onLocaleChange={setLocale}
          theme={theme}
          onThemeChange={setTheme}
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
                        : "Cursor",
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
          manuscriptPath={manuscriptPath}
          onChooseManuscriptFolder={() => {
            void chooseManuscriptFolder();
          }}
          onChooseManuscriptFile={() => {
            void chooseManuscriptFile();
          }}
          onDisconnectManuscript={() => {
            void disconnectManuscript();
          }}
          manuscriptMessage={manuscriptMessage}
          dictionaries={dictionaries}
          dictionaryBusy={dictionaryBusy}
          onDownloadDictionary={(lang) => {
            void downloadDictionary(lang);
          }}
          onDeleteDictionary={(lang) => {
            void deleteDictionary(lang);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-panels">
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
                {!manuscriptPath ? (
                  <>
                    <p className="panel-hint">{t(locale, "projectConnectHint")}</p>
                    {manuscriptMessage && (
                      <p className="error-text">{manuscriptMessage}</p>
                    )}
                    <button
                      type="button"
                      className="apple-notes-connect-btn"
                      onClick={() => {
                        void chooseManuscriptFolder();
                      }}
                    >
                      {t(locale, "chooseFolder")}
                    </button>
                    <button
                      type="button"
                      className="apple-notes-connect-btn"
                      onClick={() => {
                        void chooseManuscriptFile();
                      }}
                    >
                      {t(locale, "chooseFile")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="apple-notes-toolbar">
                      <span className="apple-notes-toolbar-label" title={manuscriptPath}>
                        {manuscriptPath}
                      </span>
                      <button
                        type="button"
                        className="apple-notes-link-btn"
                        onClick={() => {
                          void disconnectManuscript();
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
            <WritingEditor
              content={editorText}
              onContentChange={setEditorText}
              onBack={openAgentsMode}
              backLabel={t(locale, "backToAgents")}
              title={t(locale, "editor")}
              themeId={theme}
              locale={locale}
            />
          ) : (
            <>
              <div className="prompt-wrap">
                <textarea
                  className="prompt-box"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t(locale, "promptPlaceholder")}
                />
                {prompt.length > 0 && (
                  <button
                    type="button"
                    className="clear-prompt-btn"
                    onClick={() => setPrompt("")}
                    disabled={busy}
                    title={t(locale, "clearPrompt")}
                  >
                    {t(locale, "clearPrompt")}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="send-btn"
                onClick={send}
                disabled={busy || !prompt.trim()}
              >
                {busy ? t(locale, "waitingAgents") : t(locale, "send")}
              </button>

              <div className="variants">
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
                />
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
                />
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
                />
              </div>
            </>
          )}
        </div>
        <div className="main-footer">
          <UpdateBar locale={locale} />
        </div>
      </main>
    </div>
  );
}
