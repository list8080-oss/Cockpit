import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import { BubbleCopyButton } from "../orchestrator/BubbleCopyButton";
import { EntityAvatar } from "./EntityAvatar";
import type { EntityDefinition } from "./entityDefinitions";
import type { EntityTurn } from "./types";

type ExportState = { state: "idle" } | { state: "sending" } | { state: "sent" } | { state: "error" };

export function EntitiesPanel({
  locale,
  entities,
  availableEntityIds,
  history,
  draft,
  onDraftChange,
  busyEntityId,
  onSend,
  onRespondAs,
  onNewChat,
  onExportChat,
  onRefreshAvailability,
}: {
  locale: Locale;
  entities: EntityDefinition[];
  availableEntityIds: Set<string>;
  history: EntityTurn[];
  draft: string;
  onDraftChange: (value: string) => void;
  busyEntityId: string | null;
  onSend: () => void;
  onRespondAs: (entityId: "orchestrator" | "argus" | "vera") => void;
  onNewChat: () => void;
  onExportChat: () => Promise<{ entityId: string; ok: boolean; error?: string }[]>;
  onRefreshAvailability: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [exportState, setExportState] = useState<ExportState>({ state: "idle" });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [history, busyEntityId]);

  // A "sent"/"error" label describes the transcript as it was at that
  // moment — once the conversation moves on (or the user switches to
  // another one), fall back to the plain "send a copy" invitation instead
  // of keeping a stale status on the button forever. The functional update
  // returns the same object when already idle: `history` is a fresh `[]`
  // reference on every render while no conversation is active, so an
  // unconditional set here would loop render → effect → set → render.
  useEffect(() => {
    setExportState((prev) => (prev.state === "idle" ? prev : { state: "idle" }));
  }, [history]);

  // Re-check on every visit to this screen — this component (unlike the
  // hook that owns the data) genuinely does mount fresh each time the user
  // navigates here, so this is the right place to catch a personality that
  // was downloaded via Settings since the last visit.
  useEffect(() => {
    onRefreshAvailability();
    // Deliberately mount-only: `onRefreshAvailability` is recreated on every
    // parent (App.tsx) re-render since it isn't wrapped in useCallback —
    // depending on it here would refire this on nearly every keystroke
    // elsewhere in the app, not just on navigating to this screen.
  }, []);

  const canRespond = history.length > 0 && !busyEntityId;
  const respondableEntities = entities.filter((e) => availableEntityIds.has(e.id));

  const handleExport = () => {
    const names = respondableEntities.map((e) => e.name).join(", ");
    if (!names || !window.confirm(t(locale, "entitiesExportConfirm", { names }))) return;
    setExportState({ state: "sending" });
    void onExportChat().then((results) => {
      setExportState(results.some((r) => !r.ok) ? { state: "error" } : { state: "sent" });
    });
  };

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
        {respondableEntities.length === 0 ? (
          <span className="entity-picker-hint muted">{t(locale, "entitiesNoneAvailable")}</span>
        ) : (
          respondableEntities.map((entity) => (
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
          ))
        )}
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
            className="clear-prompt-btn orchestrator-export"
            onClick={handleExport}
            disabled={
              history.length === 0 || respondableEntities.length === 0 || exportState.state === "sending"
            }
            title={t(locale, "entitiesExportHint")}
          >
            {exportState.state === "sending"
              ? t(locale, "entitiesExporting")
              : exportState.state === "sent"
                ? t(locale, "entitiesExported")
                : exportState.state === "error"
                  ? t(locale, "entitiesExportError")
                  : t(locale, "entitiesExport")}
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
