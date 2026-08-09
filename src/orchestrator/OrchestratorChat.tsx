import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type { OrchestratorMessage } from "../conversations";
import { formatOrchestratorMessage } from "./messages";

export function OrchestratorChat({
  locale,
  messages,
  draft,
  onDraftChange,
  onSend,
  busy,
  canSynthesize,
  synthesizing,
  onSynthesize,
  fullAccessMode,
  onFullAccessModeChange,
}: {
  locale: Locale;
  messages: OrchestratorMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  /** Show "Make a conclusion" only when ≥2 agents answered this round. */
  canSynthesize: boolean;
  synthesizing: boolean;
  onSynthesize: () => void;
  /** In-memory only — never persisted across app restarts. */
  fullAccessMode: boolean;
  onFullAccessModeChange: (enabled: boolean) => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocked = busy || synthesizing;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, synthesizing]);

  const requestMode = (next: "normal" | "full") => {
    if (blocked) return;
    if (next === "full") {
      if (fullAccessMode) return;
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    if (fullAccessMode) onFullAccessModeChange(false);
  };

  const confirmFullAccess = () => {
    setConfirmOpen(false);
    onFullAccessModeChange(true);
  };

  return (
    <div
      className={
        fullAccessMode
          ? "orchestrator-chat orchestrator-chat-full-access"
          : "orchestrator-chat"
      }
    >
      <div className="orchestrator-transcript" role="log" aria-live="polite">
        {messages.length === 0 && !busy && !synthesizing && (
          <div className="orchestrator-empty muted">{t(locale, "orchestratorEmpty")}</div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "orchestrator-bubble orchestrator-bubble-user"
                : message.kind === "synthesis_error" ||
                    message.kind === "agent_full_access_error"
                  ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-error"
                  : message.kind === "agent_full_access"
                    ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-full-access"
                    : "orchestrator-bubble orchestrator-bubble-bot"
            }
          >
            <div className="orchestrator-bubble-label">
              {message.role === "user"
                ? t(locale, "orchestratorYou")
                : t(locale, "orchestrator")}
            </div>
            <pre className="orchestrator-bubble-text">
              {formatOrchestratorMessage(message, locale)}
            </pre>
          </div>
        ))}
        {busy && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">{t(locale, "orchestrator")}</div>
            <div className="muted">
              {fullAccessMode
                ? t(locale, "orchestratorFullAccessWaiting")
                : t(locale, "orchestratorWaiting")}
            </div>
          </div>
        )}
        {synthesizing && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">{t(locale, "orchestrator")}</div>
            <div className="muted">{t(locale, "orchestratorSynthesizing")}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="orchestrator-composer">
        <div
          className="orchestrator-mode-row"
          role="group"
          aria-label={t(locale, "orchestratorModeLabel")}
        >
          <span className="orchestrator-mode-label">
            {t(locale, "orchestratorModeLabel")}
          </span>
          <div className="orchestrator-mode-switch">
            <button
              type="button"
              className={
                !fullAccessMode
                  ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                  : "orchestrator-mode-btn"
              }
              onClick={() => requestMode("normal")}
              disabled={blocked}
            >
              {t(locale, "orchestratorModeNormal")}
            </button>
            <button
              type="button"
              className={
                fullAccessMode
                  ? "orchestrator-mode-btn orchestrator-mode-btn-danger orchestrator-mode-btn-active"
                  : "orchestrator-mode-btn orchestrator-mode-btn-danger"
              }
              onClick={() => requestMode("full")}
              disabled={blocked}
            >
              {t(locale, "orchestratorModeFullAccess")}
            </button>
          </div>
        </div>

        {fullAccessMode && (
          <div className="orchestrator-full-access-banner" role="status">
            {t(locale, "orchestratorFullAccessBanner")}
          </div>
        )}

        <textarea
          className="orchestrator-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t(locale, "promptPlaceholder")}
          disabled={blocked}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.metaKey || e.ctrlKey) &&
              !blocked &&
              draft.trim()
            ) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="orchestrator-composer-actions">
          {draft.length > 0 && (
            <button
              type="button"
              className="clear-prompt-btn orchestrator-clear"
              onClick={() => onDraftChange("")}
              disabled={blocked}
              title={t(locale, "clearPrompt")}
            >
              {t(locale, "clearPrompt")}
            </button>
          )}
          {canSynthesize && !fullAccessMode && (
            <button
              type="button"
              className="orchestrator-synthesize-btn"
              onClick={onSynthesize}
              disabled={blocked}
            >
              {synthesizing
                ? t(locale, "orchestratorSynthesizing")
                : t(locale, "orchestratorSynthesize")}
            </button>
          )}
          <button
            type="button"
            className={
              fullAccessMode ? "send-btn send-btn-full-access" : "send-btn"
            }
            onClick={onSend}
            disabled={blocked || !draft.trim()}
          >
            {busy
              ? fullAccessMode
                ? t(locale, "orchestratorFullAccessWaiting")
                : t(locale, "waitingAgents")
              : fullAccessMode
                ? t(locale, "orchestratorSendFullAccess")
                : t(locale, "send")}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="orchestrator-confirm-backdrop"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="orchestrator-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="orchestrator-full-access-title"
            aria-describedby="orchestrator-full-access-body"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="orchestrator-full-access-title">
              {t(locale, "orchestratorFullAccessWarningTitle")}
            </h2>
            <p id="orchestrator-full-access-body">
              {t(locale, "orchestratorFullAccessWarningBody")}
            </p>
            <div className="orchestrator-confirm-actions">
              <button
                type="button"
                className="orchestrator-confirm-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                {t(locale, "orchestratorFullAccessCancel")}
              </button>
              <button
                type="button"
                className="orchestrator-confirm-enable"
                onClick={confirmFullAccess}
              >
                {t(locale, "orchestratorFullAccessConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
