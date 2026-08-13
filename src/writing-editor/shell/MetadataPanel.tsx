import { useCallback, useEffect, useRef, useState } from "react";
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

  // Mirror content, kept current on every keystroke without re-triggering
  // effects — read by the flush-on-switch effect below so it always sends
  // the latest edit, not whatever was in scope when nodeId last changed.
  const synopsisRef = useRef(synopsis);
  const tagsTextRef = useRef(tagsText);
  const statusRef = useRef(status);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    synopsisRef.current = synopsis;
  }, [synopsis]);
  useEffect(() => {
    tagsTextRef.current = tagsText;
  }, [tagsText]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const persist = useCallback(
    async (
      targetNodeId: string,
      synopsisValue: string,
      tagsTextValue: string,
      statusValue: Status,
      targetProjectPath: string,
    ) => {
      const tags = tagsTextValue
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const updated = await invoke<{
        synopsis: string | null;
        tags: string[];
        status: string;
      }>("update_writing_node_metadata_command", {
        projectPath: targetProjectPath,
        nodeId: targetNodeId,
        synopsis: synopsisValue.trim() || null,
        tags,
        status: statusValue,
      });
      onMetadataUpdated(targetNodeId, {
        synopsis: updated.synopsis,
        tags: updated.tags,
        status: updated.status as Status,
      });
    },
    [onMetadataUpdated],
  );

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

  // Flush unsaved edits before switching to a different document (or
  // unmounting) instead of silently discarding them — same "save on doc
  // switch" pattern Editor.tsx uses for content via its own dirty/content
  // refs, applied here to this panel's synopsis/tags/status fields.
  useEffect(() => {
    const outgoingNodeId = nodeId;
    const outgoingProjectPath = projectPath;
    return () => {
      if (!outgoingNodeId || !dirtyRef.current) return;
      void persist(
        outgoingNodeId,
        synopsisRef.current,
        tagsTextRef.current,
        statusRef.current,
        outgoingProjectPath,
      ).catch((err) => onToast(String(err), "error"));
    };
  }, [nodeId, projectPath, persist, onToast]);

  const save = useCallback(async () => {
    if (!nodeId || busy) return;
    setBusy(true);
    try {
      await persist(nodeId, synopsis, tagsText, status, projectPath);
      setDirty(false);
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
    }
  }, [busy, nodeId, onToast, persist, projectPath, status, synopsis, tagsText]);

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
