import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, type Locale } from "../i18n";
import { profileLabel, type ProjectProfile } from "../profiles";
import {
  deriveJournalRows,
  filterJournalRows,
  type JournalEntry,
  type JournalFilter,
  type JournalRow,
} from "./journal";

type RowStatus = { state: "idle" } | { state: "rollingBack" } | { state: "error"; message: string };

/** `2026-08-11 14:02` — same convention the Markdown transcript archive
 * uses, so times read consistently across the app; sortable, locale-neutral. */
function formatTimestamp(iso: string): string {
  return iso.slice(0, 16).replace("T", " ");
}

export function JournalPanel({
  locale,
  availableProfiles,
}: {
  locale: Locale;
  availableProfiles: ProjectProfile[];
}) {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JournalFilter>({ kind: "all" });
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});

  const load = () => {
    setLoading(true);
    invoke<JournalEntry[]>("list_orchestrator_journal")
      .then((entries) => setRows(deriveJournalRows(entries)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRollback = (row: JournalRow) => {
    setRowStatus((prev) => ({ ...prev, [row.id]: { state: "rollingBack" } }));
    invoke("rollback_orchestrator_change", { journalId: row.id })
      .then(() => load())
      .catch((e) => {
        setRowStatus((prev) => ({ ...prev, [row.id]: { state: "error", message: String(e) } }));
      });
  };

  const filtered = filterJournalRows(rows, filter);

  return (
    <>
      <div className="journal-filters">
        <button
          type="button"
          className={
            filter.kind === "all" ? "journal-filter-chip journal-filter-chip-active" : "journal-filter-chip"
          }
          onClick={() => setFilter({ kind: "all" })}
        >
          {t(locale, "journalFilterAll")}
        </button>
        {availableProfiles.map((profile) => {
          const active = filter.kind === "project" && filter.profileId === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              className={active ? "journal-filter-chip journal-filter-chip-active" : "journal-filter-chip"}
              onClick={() => setFilter({ kind: "project", profileId: profile.id })}
            >
              {profileLabel(locale, profile.id)}
            </button>
          );
        })}
        <button
          type="button"
          className={
            filter.kind === "free" ? "journal-filter-chip journal-filter-chip-active" : "journal-filter-chip"
          }
          onClick={() => setFilter({ kind: "free" })}
        >
          {t(locale, "journalFilterFree")}
        </button>
      </div>

      {loading ? (
        <p className="muted">…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">{t(locale, "journalEmpty")}</p>
      ) : (
        <div className="auth-list">
          {filtered.map((row) => {
            const status = rowStatus[row.id] ?? { state: "idle" };
            const contextLabel =
              row.context === "free"
                ? t(locale, "journalFilterFree")
                : row.profileId
                  ? profileLabel(locale, row.profileId)
                  : "—";
            return (
              <div className="settings-row auth-row" key={row.id}>
                <div className="settings-row-text">
                  <div className="settings-label-row">
                    <span
                      className={row.rolledBack ? "engine-lamp engine-lamp-miss" : "engine-lamp engine-lamp-on"}
                      aria-hidden="true"
                    />
                    <span className="settings-label">{row.path}</span>
                  </div>
                  <div className="settings-hint">
                    {contextLabel} · {formatTimestamp(row.timestamp)}
                  </div>
                  {status.state === "error" && (
                    <div className="error-text">
                      {t(locale, "orchestratorProposalRollbackError", { error: status.message })}
                    </div>
                  )}
                </div>
                {row.rolledBack ? (
                  <span className="muted">{t(locale, "orchestratorProposalRolledBack")}</span>
                ) : status.state === "rollingBack" ? (
                  <button type="button" className="auth-action-btn" disabled>
                    {t(locale, "orchestratorProposalRollingBack")}
                  </button>
                ) : (
                  <button type="button" className="auth-action-btn" onClick={() => handleRollback(row)}>
                    {t(locale, "orchestratorProposalRollback")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
