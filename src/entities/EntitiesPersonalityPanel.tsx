import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, type Locale } from "../i18n";
import { EntityAvatar } from "./EntityAvatar";
import { ENTITY_DEFINITIONS } from "./entityDefinitions";

interface PersonalityStatus {
  /** False when local config.json has no entity_repos entry for this
   * entity — the download feature is dormant (normal for any copy of the
   * app other than the author's), not broken. */
  configured: boolean;
  downloaded: boolean;
  downloadedAt: string | null;
  commitSha: string | null;
  hasBootstrap: boolean;
}

type RowState = { state: "idle" } | { state: "downloading" } | { state: "error"; message: string };

/** `2026-08-13 15:22` — same convention as JournalPanel's timestamp format. */
function formatTimestamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/**
 * Settings → Сущности. Each entity's own portable identity, downloaded on
 * demand from its own repo (see CLAUDE.md's Entities section for why this
 * is separate from the automatic local memory.md file) — self-contained,
 * same pattern as JournalPanel: only needs `locale`, manages its own state.
 */
export function EntitiesPersonalityPanel({ locale }: { locale: Locale }) {
  const [statuses, setStatuses] = useState<Record<string, PersonalityStatus | null>>({});
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const loadStatus = (entityId: string) => {
    invoke<PersonalityStatus>("entity_personality_status", { entityId })
      .then((status) => setStatuses((prev) => ({ ...prev, [entityId]: status })))
      .catch(() => setStatuses((prev) => ({ ...prev, [entityId]: null })));
  };

  useEffect(() => {
    for (const entity of ENTITY_DEFINITIONS) {
      loadStatus(entity.id);
    }
  }, []);

  const handleDownload = (entityId: string) => {
    setRowState((prev) => ({ ...prev, [entityId]: { state: "downloading" } }));
    invoke("download_entity_personality", { entityId })
      .then(() => {
        setRowState((prev) => ({ ...prev, [entityId]: { state: "idle" } }));
        loadStatus(entityId);
      })
      .catch((e) => {
        setRowState((prev) => ({ ...prev, [entityId]: { state: "error", message: String(e) } }));
      });
  };

  return (
    <div className="auth-list">
      {ENTITY_DEFINITIONS.map((entity) => {
        const status = statuses[entity.id];
        const row = rowState[entity.id] ?? { state: "idle" };
        const busy = row.state === "downloading";
        return (
          <div className="settings-row auth-row" key={entity.id}>
            <div className="settings-row-text">
              <div className="settings-label-row">
                <EntityAvatar size={24} imageSrc={entity.avatarSrc} />
                <span className="settings-label">{entity.name}</span>
              </div>
              <div className="settings-hint">
                {status?.downloaded
                  ? t(locale, "entitiesPersonalityDownloaded", {
                      date: formatTimestamp(status.downloadedAt ?? ""),
                      sha: status.commitSha ? shortSha(status.commitSha) : "?",
                    })
                  : status && !status.configured
                    ? t(locale, "entitiesPersonalityNotConfigured")
                    : t(locale, "entitiesPersonalityNotDownloaded")}
                {status?.downloaded && !status.hasBootstrap && (
                  <>
                    {" "}
                    · <span className="muted">{t(locale, "entitiesPersonalityNoBootstrap")}</span>
                  </>
                )}
              </div>
              {row.state === "error" && <div className="error-text">{row.message}</div>}
            </div>
            <button
              type="button"
              className="auth-action-btn"
              disabled={busy || !status?.configured}
              onClick={() => handleDownload(entity.id)}
            >
              {busy
                ? t(locale, "entitiesPersonalityDownloading")
                : status?.downloaded
                  ? t(locale, "entitiesPersonalityUpdate")
                  : t(locale, "entitiesPersonalityDownload")}
            </button>
          </div>
        );
      })}
    </div>
  );
}
