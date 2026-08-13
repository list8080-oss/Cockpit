import { useEffect, useRef } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import { BubbleCopyButton } from "../orchestrator/BubbleCopyButton";
import { EntityAvatar } from "./EntityAvatar";
import type { EntityDefinition } from "./entityDefinitions";
import type { EntityTurn } from "./types";

export function EntitiesPanel({
  locale,
  entities,
  history,
  draft,
  onDraftChange,
  busyEntityId,
  onSend,
  onRespondAs,
  onNewChat,
}: {
  locale: Locale;
  entities: EntityDefinition[];
  history: EntityTurn[];
  draft: string;
  onDraftChange: (value: string) => void;
  busyEntityId: string | null;
  onSend: () => void;
  onRespondAs: (entityId: "orchestrator" | "argus" | "vera") => void;
  onNewChat: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history, busyEntityId]);

  const canRespond = history.length > 0 && !busyEntityId;

  return (
    <div className="orchestrator-chat">
      <div className="orchestrator-transcript" role="log" aria-live="polite">
        {history.length === 0 && !busyEntityId && (
          <div className="orchestrator-empty muted">{t(locale, "entitiesEmpty")}</div>
        )}
        {history.map((turn, i) => {
          const entity =
            turn.role === "entity" ? entities.find((e) => e.id === turn.entityId) : null;
          return (
            <div
              key={i}
              className={
                turn.role === "user"
                  ? "orchestrator-bubble orchestrator-bubble-user"
                  : "orchestrator-bubble orchestrator-bubble-bot entity-bubble"
              }
            >
              <BubbleCopyButton text={turn.text} locale={locale} />
              <div className="orchestrator-bubble-label entity-bubble-label">
                {turn.role === "entity" && <EntityAvatar size={20} imageSrc={entity?.avatarSrc} />}
                <span>{turn.role === "user" ? t(locale, "orchestratorYou") : (entity?.name ?? "?")}</span>
              </div>
              <pre className="orchestrator-bubble-text">{turn.text}</pre>
            </div>
          );
        })}
        {busyEntityId && (
          <div className="orchestrator-bubble orchestrator-bubble-bot entity-bubble">
            <div className="orchestrator-bubble-label entity-bubble-label">
              <EntityAvatar size={20} imageSrc={entities.find((e) => e.id === busyEntityId)?.avatarSrc} />
              <span>{entities.find((e) => e.id === busyEntityId)?.name}</span>
            </div>
            <div className="muted">{t(locale, "entitiesWaiting")}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="entity-picker-row" role="group" aria-label={t(locale, "entitiesPickResponder")}>
        <span className="entity-picker-hint muted">{t(locale, "entitiesPickResponder")}</span>
        {entities.map((entity) => (
          <button
            key={entity.id}
            type="button"
            className="entity-picker-btn"
            disabled={!canRespond}
            title={entity.name}
            onClick={() => onRespondAs(entity.id)}
          >
            <EntityAvatar size={32} active={busyEntityId === entity.id} imageSrc={entity.avatarSrc} />
            <span>{entity.name}</span>
          </button>
        ))}
      </div>

      <div className="orchestrator-composer">
        <textarea
          className="orchestrator-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t(locale, "entitiesComposerPlaceholder")}
          disabled={!!busyEntityId}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !busyEntityId && draft.trim()) {
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
            disabled={!!busyEntityId}
          >
            {t(locale, "entitiesNewChat")}
          </button>
          <button
            type="button"
            className="send-btn"
            onClick={onSend}
            disabled={!!busyEntityId || !draft.trim()}
          >
            {t(locale, "entitiesSend")}
          </button>
        </div>
      </div>
    </div>
  );
}
