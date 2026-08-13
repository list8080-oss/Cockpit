import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { History, RotateCcw } from "lucide-react";
import type { BackupEntry, DocumentContent, SnapshotEntry } from "../types";
import { useWeT } from "../LocaleContext";

interface VersionHistoryProps {
  projectPath: string;
  nodeId: string;
  docTitle?: string;
  docType?: string;
  onRestore: (doc: DocumentContent) => void;
  onClose: () => void;
}

function formatTimestamp(ts: string): string {
  const ms = Number(ts);
  if (!Number.isFinite(ms)) return ts;
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Version history persisted on disk under the project's own
 * `.inprincipio/history/` folder — travels with the manuscript instead of
 * living only in the WebView's localStorage. */
export function VersionHistory({
  projectPath,
  nodeId,
  docTitle,
  docType,
  onRestore,
  onClose,
}: VersionHistoryProps) {
  const t = useWeT();
  const title = docTitle ?? t("draftTitle");
  const resolvedDocType = docType ?? "chapter";
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinNamingFor, setPinNamingFor] = useState<string | null>(null);
  const [pinNameDraft, setPinNameDraft] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, s] = await Promise.all([
        invoke<BackupEntry[]>("list_document_backups", { projectPath, nodeId }),
        invoke<SnapshotEntry[]>("list_document_snapshots", { projectPath, nodeId }),
      ]);
      setBackups(b);
      setSnapshots(s);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [projectPath, nodeId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRestore = useCallback(
    async (timestamp: string) => {
      setRestoring(timestamp);
      setError(null);
      try {
        const content = await invoke<string>("restore_backup", { projectPath, nodeId, timestamp });
        onRestore({ id: nodeId, title, doc_type: resolvedDocType, content, file: nodeId });
      } catch (err) {
        setError(String(err));
      } finally {
        setRestoring(null);
      }
    },
    [projectPath, nodeId, title, resolvedDocType, onRestore],
  );

  const handlePin = useCallback(
    async (timestamp: string, name: string) => {
      try {
        const entry = await invoke<SnapshotEntry>("pin_snapshot", { projectPath, nodeId, timestamp, name });
        setSnapshots((prev) => [entry, ...prev]);
        setPinNamingFor(null);
        setPinNameDraft("");
      } catch (err) {
        setError(String(err));
      }
    },
    [projectPath, nodeId],
  );

  const handleUnpin = useCallback(
    async (snapshot: SnapshotEntry) => {
      try {
        await invoke("unpin_snapshot", { projectPath, nodeId, timestamp: snapshot.timestamp });
        setSnapshots((prev) => prev.filter((s) => s.timestamp !== snapshot.timestamp));
      } catch (err) {
        setError(String(err));
      }
    },
    [projectPath, nodeId],
  );

  const handleRestoreSnapshot = useCallback(
    async (snapshot: SnapshotEntry) => {
      setRestoring(snapshot.timestamp);
      try {
        const content = await invoke<string>("restore_snapshot", {
          projectPath,
          nodeId,
          timestamp: snapshot.timestamp,
        });
        onRestore({ id: nodeId, title, doc_type: resolvedDocType, content, file: nodeId });
      } catch (err) {
        setError(String(err));
      } finally {
        setRestoring(null);
      }
    },
    [projectPath, nodeId, title, resolvedDocType, onRestore],
  );

  return (
    <div className="version-history">
      <div className="vh-header">
        <span className="vh-title">
          <History size={14} /> {t("versionHistory")}
        </span>
        <button type="button" className="vh-close" aria-label={t("close")} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="vh-list">
        {loading && <div className="vh-empty">{t("loading")}</div>}
        {error && <div className="vh-error">{error}</div>}
        {!loading && snapshots.length > 0 && (
          <>
            <div className="vh-section-label">{t("pinned")}</div>
            {snapshots.map((s) => (
              <div key={s.timestamp} className="vh-entry vh-entry--snapshot">
                <div className="vh-entry-main">
                  <div className="vh-entry-time">{s.name || formatTimestamp(s.timestamp)}</div>
                  <div className="vh-entry-meta">{formatSize(s.size_bytes)}</div>
                  {s.preview && <div className="vh-entry-preview">{s.preview}</div>}
                </div>
                <div className="vh-entry-actions">
                  <button
                    type="button"
                    className="vh-action"
                    disabled={restoring === s.timestamp}
                    onClick={() => void handleRestoreSnapshot(s)}
                    title={t("restore")}
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    className="vh-action"
                    onClick={() => void handleUnpin(s)}
                    title={t("unpin")}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && backups.length > 0 && (
          <>
            <div className="vh-section-label">{t("autosaves")}</div>
            {backups.map((b) => (
              <div key={b.timestamp} className="vh-entry">
                <div className="vh-entry-main">
                  <div className="vh-entry-time">{formatTimestamp(b.timestamp)}</div>
                  <div className="vh-entry-meta">{formatSize(b.size_bytes)}</div>
                  {b.preview && <div className="vh-entry-preview">{b.preview}</div>}
                </div>
                <div className="vh-entry-actions">
                  <button
                    type="button"
                    className="vh-action"
                    disabled={restoring === b.timestamp}
                    onClick={() => void handleRestore(b.timestamp)}
                    title={t("restore")}
                  >
                    <RotateCcw size={12} />
                  </button>
                  {pinNamingFor === b.timestamp ? (
                    <form
                      className="vh-pin-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handlePin(
                          b.timestamp,
                          pinNameDraft.trim() || t("pinnedDefaultName"),
                        );
                      }}
                    >
                      <input
                        value={pinNameDraft}
                        onChange={(e) => setPinNameDraft(e.target.value)}
                        placeholder={t("pinNamePlaceholder")}
                        autoFocus
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="vh-action"
                      onClick={() => setPinNamingFor(b.timestamp)}
                      title={t("pin")}
                    >
                      ♥
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && !error && backups.length === 0 && snapshots.length === 0 && (
          <div className="vh-empty">{t("noVersions")}</div>
        )}
      </div>
    </div>
  );
}
