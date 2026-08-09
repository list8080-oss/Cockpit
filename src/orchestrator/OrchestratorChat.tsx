import { useEffect, useRef } from "react";
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
}: {
  locale: Locale;
  messages: OrchestratorMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  return (
    <div className="orchestrator-chat">
      <div className="orchestrator-chat-head">
        <h2 className="orchestrator-title">{t(locale, "orchestrator")}</h2>
        <p className="orchestrator-subtitle muted">{t(locale, "orchestratorHint")}</p>
      </div>

      <div className="orchestrator-transcript" role="log" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="orchestrator-empty muted">{t(locale, "orchestratorEmpty")}</div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "orchestrator-bubble orchestrator-bubble-user"
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
            <div className="muted">{t(locale, "orchestratorWaiting")}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="orchestrator-composer">
        <textarea
          className="orchestrator-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t(locale, "promptPlaceholder")}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy && draft.trim()) {
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
              disabled={busy}
              title={t(locale, "clearPrompt")}
            >
              {t(locale, "clearPrompt")}
            </button>
          )}
          <button
            type="button"
            className="send-btn"
            onClick={onSend}
            disabled={busy || !draft.trim()}
          >
            {busy ? t(locale, "waitingAgents") : t(locale, "send")}
          </button>
        </div>
      </div>
    </div>
  );
}
