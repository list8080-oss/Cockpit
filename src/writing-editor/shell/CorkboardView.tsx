import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocTypeIcon } from "../components/DocTypeIcon";
import { useWeT } from "../LocaleContext";
import type { CorkboardCard, CorkboardView, ProjectManifest } from "../types";
import {
  adjustIndexForSameColumnMove,
  clampDropIndex,
  columnParentId,
} from "../utils/corkboardLayout";
import { statusLabelKey } from "../utils/statusLabels";

type DragState = {
  cardId: string;
  fromColumnId: string;
  fromIndex: number;
};

function findCardColumn(view: CorkboardView, cardId: string): { columnId: string; index: number } | null {
  for (const column of view.columns) {
    const index = column.cards.indexOf(cardId);
    if (index >= 0) return { columnId: column.id, index };
  }
  return null;
}

function CorkboardCardView({
  card,
  active,
  dragging,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  card: CorkboardCard;
  active: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const t = useWeT();

  return (
    <article
      className={`we-corkboard-card${active ? " we-corkboard-card-active" : ""}${dragging ? " we-corkboard-card-dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="we-corkboard-card-header">
        <span className={`we-corkboard-card-status we-corkboard-card-status-${card.status}`} />
        <DocTypeIcon docType={card.doc_type} size={14} />
        <span className="we-corkboard-card-title">{card.title}</span>
      </header>
      {card.synopsis ? (
        <p className="we-corkboard-card-synopsis">{card.synopsis}</p>
      ) : (
        <p className="we-corkboard-card-synopsis we-corkboard-card-synopsis-empty">
          {t("corkboardNoSynopsis")}
        </p>
      )}
      <footer className="we-corkboard-card-footer">
        <span>{t("corkboardWordCount", { n: card.word_count })}</span>
        <span>{t(statusLabelKey(card.status))}</span>
      </footer>
      {card.tags.length > 0 && (
        <div className="we-corkboard-card-tags">
          {card.tags.map((tag) => (
            <span key={tag} className="we-corkboard-card-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function DropSlot({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`we-corkboard-drop-slot${active ? " we-corkboard-drop-slot-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    />
  );
}

export function CorkboardView({
  projectPath,
  manifest,
  activeNodeId,
  onSelectNode,
  onManifestUpdated,
  onToast,
}: {
  projectPath: string;
  manifest: ProjectManifest;
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
  onManifestUpdated: (manifest: ProjectManifest) => void;
  onToast: (message: string, type: "success" | "error") => void;
}) {
  const t = useWeT();
  const [view, setView] = useState<CorkboardView | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ columnId: string; index: number } | null>(null);

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const data = await invoke<CorkboardView>("get_writing_corkboard_command", { projectPath });
      setView(data);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  }, [onToast, projectPath]);

  useEffect(() => {
    void reload();
  }, [manifest, reload]);

  const runMove = async (cardId: string, targetColumnId: string, targetIndex: number) => {
    if (!view) return;
    const from = findCardColumn(view, cardId);
    if (!from) return;

    let index = clampDropIndex(targetIndex, view.columns.find((c) => c.id === targetColumnId)?.cards.length ?? 0);
    index = adjustIndexForSameColumnMove(from.index, index, from.columnId === targetColumnId);

    setBusy(true);
    try {
      const updated = await invoke<ProjectManifest>("move_writing_node_command", {
        projectPath,
        nodeId: cardId,
        newParentId: columnParentId(targetColumnId),
        section: "manuscript",
        index,
      });
      onManifestUpdated(updated);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
      setDrag(null);
      setDropTarget(null);
    }
  };

  if (!view) {
    return (
      <div className="we-corkboard we-corkboard-empty">
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (view.columns.length === 0) {
    return (
      <div className="we-corkboard we-corkboard-empty">
        <p>{t("corkboardEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="we-corkboard" aria-busy={busy}>
      <div className="we-corkboard-toolbar">
        <span>{t("corkboardHint")}</span>
        <button type="button" onClick={() => void reload()} disabled={busy}>
          {t("corkboardRefresh")}
        </button>
      </div>
      <div className="we-corkboard-columns">
        {view.columns.map((column) => (
          <section key={column.id} className="we-corkboard-column">
            <header className="we-corkboard-column-header">
              <DocTypeIcon docType={column.doc_type} size={16} />
              <span>{column.title}</span>
              <span className="we-corkboard-column-count">{column.cards.length}</span>
            </header>
            <div className="we-corkboard-cards">
              {column.cards.map((cardId, index) => {
                const card = view.cards[cardId];
                if (!card) return null;
                const slotActive =
                  dropTarget?.columnId === column.id && dropTarget.index === index;
                return (
                  <div key={cardId} className="we-corkboard-card-wrap">
                    <DropSlot
                      active={slotActive}
                      onDragOver={() => setDropTarget({ columnId: column.id, index })}
                      onDrop={() => {
                        if (drag) void runMove(drag.cardId, column.id, index);
                      }}
                    />
                    <CorkboardCardView
                      card={card}
                      active={activeNodeId === cardId}
                      dragging={drag?.cardId === cardId}
                      onSelect={() => onSelectNode(cardId)}
                      onDragStart={() =>
                        setDrag({ cardId, fromColumnId: column.id, fromIndex: index })
                      }
                      onDragEnd={() => {
                        setDrag(null);
                        setDropTarget(null);
                      }}
                    />
                  </div>
                );
              })}
              <DropSlot
                active={
                  dropTarget?.columnId === column.id &&
                  dropTarget.index === column.cards.length
                }
                onDragOver={() =>
                  setDropTarget({ columnId: column.id, index: column.cards.length })
                }
                onDrop={() => {
                  if (drag) void runMove(drag.cardId, column.id, column.cards.length);
                }}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
