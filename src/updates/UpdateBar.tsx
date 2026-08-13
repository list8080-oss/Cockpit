import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { t, type Locale } from "../i18n";

export type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "downloading"; version: string }
  | { status: "restarting" }
  | { status: "error"; message: string };

const CHECK_RETRY_ATTEMPTS = 5;
// Verified manually: curl to the same URL succeeds reliably even while this
// app's Rust HTTP client is mid-failure, so the bad window is specific to
// that client's connections, not a general outage — but it can last several
// seconds in a burst (3 attempts at a flat 800ms wasn't always enough).
// Backing off geometrically instead of flat gives a burst more room to
// clear without a fixed multi-second wait on the common case where the
// very first retry already succeeds.
const CHECK_RETRY_BASE_DELAY_MS = 700;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The update check itself (a plain GET to GitHub's release CDN) fails
 * intermittently with a generic "error sending request" — reproduced with a
 * bare reqwest client outside the app too, so it's transient connection
 * flakiness on the request path, not a bug in this app's code. A manual
 * retry from the user reliably succeeds, so retry automatically before
 * surfacing an error. Only wraps the check, not downloadAndInstall — a
 * failed download is a bigger, separate operation the user should see
 * fail explicitly rather than have retried silently underneath them. */
async function checkForUpdateWithRetry() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CHECK_RETRY_ATTEMPTS; attempt++) {
    try {
      return await checkForUpdate();
    } catch (e) {
      lastError = e;
      if (attempt < CHECK_RETRY_ATTEMPTS) {
        await sleep(CHECK_RETRY_BASE_DELAY_MS * attempt);
      }
    }
  }
  throw lastError;
}

export function useAppUpdate(locale: Locale) {
  const [version, setVersion] = useState("");
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const run = async () => {
    setState({ status: "checking" });
    try {
      const update = await checkForUpdateWithRetry();
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

export function UpdateBar({ locale }: { locale: Locale }) {
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
