import { useEffect, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { t, type Locale } from "../i18n";
import type { AuthStatus } from "../authTypes";

export function authStatusLabel(locale: Locale, auth: AuthStatus | undefined, loading: boolean) {
  if (loading && !auth) return t(locale, "authChecking");
  if (!auth) return t(locale, "authSignedOut");
  if (!auth.installed) return t(locale, "authMissingCli");
  if (auth.loggedIn) return auth.account || t(locale, "authSignedIn");
  return t(locale, "authSignedOut");
}

export function GithubMark({ className }: { className?: string }) {
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

export function GithubChip({
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
  const [avatarError, setAvatarError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(github?.loggedIn);
  const missing = Boolean(github && !github.installed);

  useEffect(() => {
    setAvatarError(false);
  }, [github?.account]);

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
        {signedIn && github?.account && !avatarError ? (
          <button
            type="button"
            className={`${markClass} gh-mark-btn`}
            title={t(locale, "githubOpenProfile")}
            onClick={() => {
              void openUrl(`https://github.com/${github.account}`);
            }}
          >
            <img
              src={`https://github.com/${github.account}.png?size=64`}
              alt=""
              className="gh-avatar-img"
              onError={() => setAvatarError(true)}
            />
          </button>
        ) : (
          <span className={markClass}>
            <GithubMark />
          </span>
        )}
        <button
          type="button"
          className="gh-chip-main"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t(locale, "accountMenu")}
          title={status}
          onClick={() => setOpen((value) => !value)}
        >
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
