import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWeT } from "../LocaleContext";
import { STATUS_VALUES, type NodeMetadata, type Status } from "../types";
import { statusLabelKey } from "../utils/statusLabels";

export function MetadataPanel({
  projectPath,
  nodeId,
  metadata,
  onMetadataUpdated,
  onToast,
  hidden,
}: {
  projectPath: string;
  nodeId: string | null;
  metadata: NodeMetadata | null;
  onMetadataUpdated: (nodeId: string, meta: NodeMetadata) => void;
  onToast: (message: string, type: "success" | "error") => void;
  hidden?: boolean;
}) {
  const t = useWeT();
  const [synopsis, setSynopsis] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!metadata) {
      setSynopsis("");
      setTagsText("");
      setStatus("draft");
      setDirty(false);
      return;
    }
    setSynopsis(metadata.synopsis ?? "");
    setTagsText(metadata.tags.join(", "));
    setStatus(metadata.status);
    setDirty(false);
  }, [nodeId, metadata]);

  const save = useCallback(async () => {
    if (!nodeId || busy) return;
    setBusy(true);
    try {
      const tags = tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const updated = await invoke<{
        synopsis: string | null;
        tags: string[];
        status: string;
      }>("update_writing_node_metadata_command", {
        projectPath,
        nodeId,
        synopsis: synopsis.trim() || null,
        tags,
        status,
      });
      onMetadataUpdated(nodeId, {
        synopsis: updated.synopsis,
        tags: updated.tags,
        status: updated.status as Status,
      });
      setDirty(false);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  }, [busy, nodeId, onMetadataUpdated, onToast, projectPath, status, synopsis, tagsText]);

  if (hidden) return null;

  return (
    <section className="we-metadata-panel" aria-busy={busy} data-tour="metadata">
      <h3 className="we-metadata-title">{t("metadataPanelTitle")}</h3>

      {!nodeId ? (
        <p className="we-metadata-empty">{t("metadataSelectDocument")}</p>
      ) : (
        <>
      <label className="we-sidebar-field">
        {t("metadataStatus")}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status);
            setDirty(true);
          }}
        >
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(statusLabelKey(value))}
            </option>
          ))}
        </select>
      </label>

      <label className="we-sidebar-field">
        {t("metadataTags")}
        <input
          value={tagsText}
          placeholder={t("metadataTagsPlaceholder")}
          onChange={(e) => {
            setTagsText(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <label className="we-sidebar-field">
        {t("metadataSynopsis")}
        <textarea
          rows={3}
          value={synopsis}
          placeholder={t("metadataSynopsisPlaceholder")}
          onChange={(e) => {
            setSynopsis(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <div className="we-metadata-actions">
        <button type="button" disabled={!dirty || busy} onClick={() => void save()}>
          {t("save")}
        </button>
      </div>
        </>
      )}
    </section>
  );
}
