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
import "./App.css";

type View = "workspace" | "settings";

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "downloading"; version: string }
  | { status: "restarting" }
  | { status: "error"; message: string };

function UpdateBar({ locale }: { locale: Locale }) {
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

  return (
    <div className="update-bar">
      <span className="version">v{version || "…"}</span>
      <button type="button" onClick={run} disabled={busy}>
        {busy ? "…" : t(locale, "checkUpdate")}
      </button>
      {statusText && (
        <span className={state.status === "error" ? "error-text" : "muted"}>
          {statusText}
        </span>
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

function authStatusLabel(locale: Locale, auth: AuthStatus | undefined, loading: boolean) {
  if (loading && !auth) return t(locale, "authChecking");
  if (!auth) return t(locale, "authSignedOut");
  if (!auth.installed) return t(locale, "authMissingCli");
  if (auth.loggedIn) return auth.account || t(locale, "authSignedIn");
  return t(locale, "authSignedOut");
}

function AccountMenu({
  locale,
  settingsOpen,
  onOpenSettings,
  github,
  authLoading,
  authMessage,
  onSignInGithub,
  onRefreshAuth,
}: {
  locale: Locale;
  settingsOpen: boolean;
  onOpenSettings: () => void;
  github: AuthStatus | undefined;
  authLoading: boolean;
  authMessage: string | null;
  onSignInGithub: () => void;
  onRefreshAuth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(github?.loggedIn);

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

  const name = signedIn
    ? github?.account || "GitHub"
    : t(locale, "githubTitle");
  const status = authStatusLabel(locale, github, authLoading);

  return (
    <div className="account-menu" ref={rootRef}>
      {open && (
        <div className="account-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="account-dropdown-item"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            {t(locale, "settings")}
          </button>
          {!signedIn && (
            <button
              type="button"
              role="menuitem"
              className="account-dropdown-item"
              disabled={!github?.installed || authLoading}
              onClick={() => {
                setOpen(false);
                onSignInGithub();
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
        className={
          open || settingsOpen
            ? "account-trigger account-trigger-active"
            : "account-trigger"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t(locale, "accountMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={
            signedIn ? "account-avatar account-avatar-ok" : "account-avatar"
          }
          aria-hidden="true"
        >
          {signedIn ? "GH" : "?"}
        </span>
        <span className="account-meta">
          <span className="account-name">{name}</span>
          <span className="account-status">{status}</span>
        </span>
        <span className="account-caret" aria-hidden="true">
          ▾
        </span>
      </button>
    </div>
  );
}

function EngineAuthBar({
  locale,
  auth,
  loading,
  onSignIn,
}: {
  locale: Locale;
  auth: AuthStatus | undefined;
  loading: boolean;
  onSignIn: () => void;
}) {
  const signedIn = Boolean(auth?.loggedIn);
  const missing = Boolean(auth && !auth.installed);
  const status = authStatusLabel(locale, auth, loading);

  return (
    <div className="engine-auth">
      <span
        className={
          missing
            ? "auth-pill auth-pill-miss"
            : signedIn
              ? "auth-pill auth-pill-on"
              : "auth-pill auth-pill-off"
        }
      >
        {status}
      </span>
      {!signedIn && (
        <button
          type="button"
          className="engine-auth-btn"
          disabled={!auth?.installed || loading}
          onClick={onSignIn}
        >
          {t(locale, "authSignIn")}
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
  onSignIn,
}: {
  label: string;
  state: VariantState;
  locale: Locale;
  auth: AuthStatus | undefined;
  authLoading: boolean;
  onSignIn: () => void;
}) {
  const copy = () => {
    if (state.status === "done") navigator.clipboard.writeText(state.text);
  };
  return (
    <div className="variant-column">
      <EngineAuthBar
        locale={locale}
        auth={auth}
        loading={authLoading}
        onSignIn={onSignIn}
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

function SettingsView({
  locale,
  onLocaleChange,
  onBack,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onBack: () => void;
}) {
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
          <AccountMenu
            locale={locale}
            settingsOpen={view === "settings"}
            onOpenSettings={() => setView("settings")}
            github={authById("github")}
            authLoading={authLoading}
            authMessage={authMessage}
            onSignInGithub={() => {
              void signIn("github");
            }}
            onRefreshAuth={() => {
              void refreshAuth();
            }}
          />
        </div>
      </aside>

      <main className="main">
        <div className="main-body">
          {view === "settings" ? (
            <SettingsView
              locale={locale}
              onLocaleChange={setLocale}
              onBack={() => setView("workspace")}
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
                  onSignIn={() => {
                    void signIn("claude");
                  }}
                />
                <Variant
                  label="Codex (Sol)"
                  state={codex}
                  locale={locale}
                  auth={authById("codex")}
                  authLoading={authLoading}
                  onSignIn={() => {
                    void signIn("codex");
                  }}
                />
                <Variant
                  label="Cursor (ask)"
                  state={cursor}
                  locale={locale}
                  auth={authById("cursor")}
                  authLoading={authLoading}
                  onSignIn={() => {
                    void signIn("cursor");
                  }}
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
