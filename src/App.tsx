import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  LOCALES,
  LOCALE_STORAGE_KEY,
  detectLocale,
  isLocale,
  t,
  type Locale,
} from "./i18n";
import { CHANGELOG, noteFor } from "./changelog";
import "./App.css";

type View = "workspace" | "settings";

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

function GithubIcon({
  locale,
  github,
  authLoading,
  authMessage,
  onSignIn,
  onSignOut,
  onRefreshAuth,
}: {
  locale: Locale;
  github: AuthStatus | undefined;
  authLoading: boolean;
  authMessage: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshAuth: () => void;
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

  const lampClass = missing
    ? "gh-icon gh-icon-miss"
    : signedIn
      ? "gh-icon gh-icon-on"
      : "gh-icon gh-icon-off";
  const title = authStatusLabel(locale, github, authLoading);

  return (
    <div className="gh-menu" ref={rootRef}>
      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-note">
            {github?.account || t(locale, "githubTitle")}
            <br />
            {title}
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
      <button
        type="button"
        className={open ? `${lampClass} gh-icon-active` : lampClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t(locale, "accountMenu")}
        title={title}
        onClick={() => setOpen((value) => !value)}
      >
        GH
      </button>
    </div>
  );
}

function EngineLamp({
  locale,
  auth,
  loading,
}: {
  locale: Locale;
  auth: AuthStatus | undefined;
  loading: boolean;
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
}: {
  label: string;
  state: VariantState;
  locale: Locale;
  auth: AuthStatus | undefined;
  authLoading: boolean;
}) {
  const copy = () => {
    if (state.status === "done") navigator.clipboard.writeText(state.text);
  };
  return (
    <div className="variant-column">
      <EngineLamp locale={locale} auth={auth} loading={authLoading} />
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

function SettingsView({
  locale,
  onLocaleChange,
  onBack,
  agentAuths,
  authLoading,
  authMessage,
  onRefreshAuth,
  onSignIn,
  onSignOut,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onBack: () => void;
  agentAuths: AuthStatus[];
  authLoading: boolean;
  authMessage: string | null;
  onRefreshAuth: () => void;
  onSignIn: (provider: string) => void;
  onSignOut: (provider: string) => void;
}) {
  const {
    version,
    busy: updateBusy,
    statusText: updateStatus,
    isError: updateError,
    run: checkUpdate,
  } = useAppUpdate(locale);

  return (
    <div className="settings">
      <header className="settings-header">
        <button type="button" className="settings-back" onClick={onBack}>
          ← {t(locale, "backToWorkspace")}
        </button>
        <h1>{t(locale, "settings")}</h1>
      </header>

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
      </section>

      <section className="settings-section settings-section-spaced">
        <h2>{t(locale, "settingsUpdates")}</h2>
        <p className="settings-section-hint">{t(locale, "settingsUpdatesHint")}</p>
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

      <section className="settings-section settings-section-spaced">
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
        <p className="settings-section-hint">{t(locale, "settingsAgentsHint")}</p>
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
    </div>
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());
  const [view, setView] = useState<View>("workspace");
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [claude, setClaude] = useState<VariantState>({ status: "idle" });
  const [codex, setCodex] = useState<VariantState>({ status: "idle" });
  const [cursor, setCursor] = useState<VariantState>({ status: "idle" });
  const [auths, setAuths] = useState<AuthStatus[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const authById = (id: string) => auths.find((item) => item.id === id);
  const agentAuths = AGENT_IDS.map((id) => authById(id)).filter(
    (item): item is AuthStatus => Boolean(item),
  );

  const refreshAuth = async () => {
    setAuthLoading(true);
    try {
      const list = await invoke<AuthStatus[]>("list_auth_status");
      setAuths(list);
      setAuthMessage(null);
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
    invoke<ChapterInfo[]>("list_chapters")
      .then(setChapters)
      .catch((e) => setChaptersError(String(e)));
    void refreshAuth();
  }, []);

  const loadChapter = async (file: string) => {
    try {
      const text = await invoke<string>("read_chapter", { file });
      setPrompt(text);
      setView("workspace");
    } catch (e) {
      setPrompt(t(locale, "loadChapterFailed", { error: String(e) }));
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
      .then((text) => setCodex({ status: "done", text }))
      .catch((e) => setCodex({ status: "error", message: String(e) }));
    invoke<string>("run_cursor", { prompt })
      .then((text) => setCursor({ status: "done", text }))
      .catch((e) => setCursor({ status: "error", message: String(e) }));
  };

  const busy =
    claude.status === "running" ||
    codex.status === "running" ||
    cursor.status === "running";

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>{t(locale, "chapters")}</h2>
        {chaptersError && <p className="error-text">{chaptersError}</p>}
        <ul>
          {chapters.map((c) => (
            <li key={c.file}>
              <button type="button" onClick={() => loadChapter(c.file)}>
                {c.title}
              </button>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="sidebar-footer-row">
            <GithubIcon
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
            />
            <button
              type="button"
              className={
                view === "settings"
                  ? "settings-icon-btn settings-icon-btn-active"
                  : "settings-icon-btn"
              }
              aria-label={t(locale, "openSettings")}
              title={t(locale, "openSettings")}
              onClick={() => setView("settings")}
            >
              ⚙
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-body">
          {view === "settings" ? (
            <SettingsView
              locale={locale}
              onLocaleChange={setLocale}
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
