import { useEffect, useRef, useState, type ReactNode } from "react";
import { t, type Locale } from "../i18n";
import type { ConversationTurn } from "../conversations";
import type { AgentOption } from "../agentSettings";
import type { AuthStatus, CodexLimits } from "../authTypes";

export function formatLimitChip(locale: Locale, limits: CodexLimits | null): string {
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

export function formatModelChip(model: string, effort?: string): string | null {
  const parts = [model, effort].filter((v) => v && v.trim().length > 0);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/// Same open/close-on-outside-click-or-Escape pattern as `GithubChip`'s
/// account dropdown — a small popup anchored to a chip, not a native
/// <select>, so model and effort can live in one menu.
export function AgentModelMenu({
  locale,
  model,
  onModelChange,
  modelOptions,
  effort,
  onEffortChange,
  effortOptions,
  dropdownDirection = "down",
}: {
  locale: Locale;
  model: string;
  onModelChange: (value: string) => void;
  modelOptions: AgentOption[];
  effort?: string;
  onEffortChange?: (value: string) => void;
  effortOptions?: AgentOption[];
  /** "up" for chips anchored near the bottom of a clipped container (e.g.
   * Simple Chat's composer) — opening "down" there renders past the visible
   * edge and gets clipped invisibly. Agent panels stay "down" (default). */
  dropdownDirection?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
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

  const chipLabel = formatModelChip(model, effort) ?? t(locale, "optionDefault");

  return (
    <div className="model-menu-wrap" ref={rootRef}>
      <button
        type="button"
        className="limit-chip limit-chip-muted model-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {chipLabel}
      </button>
      {open && (
        <div
          className={
            dropdownDirection === "up"
              ? "account-dropdown model-menu-dropdown model-menu-dropdown-up"
              : "account-dropdown model-menu-dropdown"
          }
          role="menu"
        >
          <div className="account-dropdown-note">{t(locale, "agentModel")}</div>
          <button
            type="button"
            role="menuitem"
            className={
              model === "" ? "account-dropdown-item account-dropdown-item-active" : "account-dropdown-item"
            }
            onClick={() => {
              onModelChange("");
              setOpen(false);
            }}
          >
            {t(locale, "optionDefault")}
          </button>
          {modelOptions.map((o) => (
            <button
              key={o.value}
              type="button"
              role="menuitem"
              className={
                model === o.value
                  ? "account-dropdown-item account-dropdown-item-active"
                  : "account-dropdown-item"
              }
              onClick={() => {
                onModelChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
          {effortOptions && onEffortChange && (
            <>
              <div className="account-dropdown-note">{t(locale, "agentEffort")}</div>
              <button
                type="button"
                role="menuitem"
                className={
                  effort === ""
                    ? "account-dropdown-item account-dropdown-item-active"
                    : "account-dropdown-item"
                }
                onClick={() => {
                  onEffortChange("");
                  setOpen(false);
                }}
              >
                {t(locale, "optionDefault")}
              </button>
              {effortOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="menuitem"
                  className={
                    effort === o.value
                      ? "account-dropdown-item account-dropdown-item-active"
                      : "account-dropdown-item"
                  }
                  onClick={() => {
                    onEffortChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EngineLamp({
  locale,
  auth,
  loading,
  limits,
  limitsLoading,
  onRefreshLimits,
  modelMenu,
}: {
  locale: Locale;
  auth: AuthStatus | undefined;
  loading: boolean;
  limits?: CodexLimits | null;
  limitsLoading?: boolean;
  onRefreshLimits?: () => void;
  modelMenu?: ReactNode;
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
      {modelMenu}
    </div>
  );
}
export type VariantState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done" }
  | { status: "error"; message: string };

export function Variant({
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
  modelMenu,
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
  modelMenu?: ReactNode;
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
        modelMenu={modelMenu}
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
