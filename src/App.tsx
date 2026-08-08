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
type SidebarPanelId = "notes" | null;

const EDITOR_STORAGE_KEY = "yar-cockpit.editor";
const LEGACY_EDITOR_STORAGE_KEY = "yar-cockpit.notes";

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

type VariantState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

function Variant({
  label,
  state,
  locale,
  auth,
  authLoading,
  limits,
  limitsLoading,
  onRefreshLimits,
}: {
  label: string;
  state: VariantState;
  locale: Locale;
  auth: AuthStatus | undefined;
  authLoading: boolean;
  limits?: CodexLimits | null;
  limitsLoading?: boolean;
  onRefreshLimits?: () => void;
}) {
  const copy = () => {
    if (state.status === "done") navigator.clipboard.writeText(state.text);
  };
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
          {state.status === "done" && (
            <button
              className="copy-btn"
              onClick={copy}
              title={t(locale, "copyTitle")}
            >
              {t(locale, "copy")}
            </button>
          )}
        </div>
        <div className="variant-body">
          {state.status === "idle" && <span className="muted">—</span>}
          {state.status === "running" && (
            <span className="muted">{t(locale, "waiting")}</span>
          )}
          {state.status === "error" && (
            <span className="error-text">{state.message}</span>
          )}
          {state.status === "done" && <pre>{state.text}</pre>}
        </div>
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
              <button
                type="button"
                className="auth-action-btn"
                onClick={onChooseManuscriptFolder}
              >
                {t(locale, "chooseFolder")}
              </button>
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
  const [openPanel, setOpenPanel] = useState<SidebarPanelId>("notes");
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
  const [manuscriptPath, setManuscriptPath] = useState<string | null>(null);
  const [manuscriptMessage, setManuscriptMessage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [claude, setClaude] = useState<VariantState>({ status: "idle" });
  const [codex, setCodex] = useState<VariantState>({ status: "idle" });
  const [cursor, setCursor] = useState<VariantState>({ status: "idle" });
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

  const send = () => {
    if (!prompt.trim()) return;
    setClaude({ status: "running" });
    setCodex({ status: "running" });
    setCursor({ status: "running" });
    invoke<string>("run_claude", { prompt })
      .then((text) => setClaude({ status: "done", text }))
      .catch((e) => setClaude({ status: "error", message: String(e) }));
    invoke<string>("run_codex", { prompt })
      .then((text) => {
        setCodex({ status: "done", text });
        void refreshCodexLimits();
      })
      .catch((e) => {
        setCodex({ status: "error", message: String(e) });
        void refreshCodexLimits();
      });
    invoke<string>("run_cursor", { prompt })
      .then((text) => setCursor({ status: "done", text }))
      .catch((e) => setCursor({ status: "error", message: String(e) }));
  };

  const busy =
    claude.status === "running" ||
    codex.status === "running" ||
    cursor.status === "running";

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
              <span>{t(locale, "notes")}</span>
            </button>
            {openPanel === "notes" && (
              <div className="sidebar-panel-body">
                <p className="panel-hint">{t(locale, "notesHint")}</p>
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
                  locale={locale}
                  auth={authById("claude")}
                  authLoading={authLoading}
                />
                <Variant
                  label="Codex (Sol)"
                  state={codex}
                  locale={locale}
                  auth={authById("codex")}
                  authLoading={authLoading}
                  limits={codexLimits}
                  limitsLoading={codexLimitsLoading}
                  onRefreshLimits={() => {
                    void refreshCodexLimits();
                  }}
                />
                <Variant
                  label="Cursor (ask)"
                  state={cursor}
                  locale={locale}
                  auth={authById("cursor")}
                  authLoading={authLoading}
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
