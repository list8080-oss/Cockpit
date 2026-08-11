import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import { ORCHESTRATOR_AGENT_IDS, type ConversationTurn } from "../conversations";
import { agentDisplayName } from "../orchestrator/messages";
import type { SimpleChatEngineId } from "./types";

export function SimpleChat({
  locale,
  engine,
  history,
  draft,
  onDraftChange,
  busy,
  onPickEngine,
  onNewChat,
  onSend,
  modelMenu,
}: {
  locale: Locale;
  engine: SimpleChatEngineId | null;
  history: ConversationTurn[];
  draft: string;
  onDraftChange: (value: string) => void;
  busy: boolean;
  onPickEngine: (id: SimpleChatEngineId) => void;
  onNewChat: () => void;
  onSend: () => void;
  /** Model/effort picker for the active engine — built by the caller, since
   * each engine's real options (static lists for Claude/Codex, live-fetched
   * for Cursor/OpenCode) already live at the App.tsx level, shared with the
   * Orchestrator's own per-agent pickers. */
  modelMenu: ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history, busy]);

  if (!engine) {
    return (
      <div className="simple-chat-picker">
        <p className="simple-chat-picker-title">{t(locale, "simpleChatPickEngine")}</p>
        <div className="simple-chat-engine-grid">
          {ORCHESTRATOR_AGENT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="simple-chat-engine-btn"
              onClick={() => onPickEngine(id)}
            >
              {agentDisplayName(id)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="orchestrator-chat">
      <div className="orchestrator-transcript" role="log" aria-live="polite">
        {history.length === 0 && !busy && (
          <div className="orchestrator-empty muted">{t(locale, "simpleChatEmpty")}</div>
        )}
        {history.map((turn, i) => (
          <div
            key={i}
            className={
              turn.role === "user"
                ? "orchestrator-bubble orchestrator-bubble-user"
                : "orchestrator-bubble orchestrator-bubble-bot"
            }
          >
            <div className="orchestrator-bubble-label">
              {turn.role === "user" ? t(locale, "orchestratorYou") : agentDisplayName(engine)}
            </div>
            <pre className="orchestrator-bubble-text">{turn.text}</pre>
          </div>
        ))}
        {busy && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">{agentDisplayName(engine)}</div>
            <div className="muted">{t(locale, "simpleChatWaiting")}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="orchestrator-composer">
        <textarea
          className="orchestrator-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t(locale, "simpleChatComposerPlaceholder")}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busy && draft.trim()) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="orchestrator-composer-actions">
          <button
            type="button"
            className="clear-prompt-btn orchestrator-clear"
            onClick={onNewChat}
            disabled={busy}
          >
            {t(locale, "simpleChatSwitchAgent")}
          </button>
          {modelMenu}
          <button
            type="button"
            className="send-btn"
            onClick={onSend}
            disabled={busy || !draft.trim()}
          >
            {busy ? t(locale, "simpleChatWaiting") : t(locale, "simpleChatSend")}
          </button>
        </div>
      </div>
    </div>
  );
}
