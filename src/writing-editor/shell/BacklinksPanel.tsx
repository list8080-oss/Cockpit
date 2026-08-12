import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocTypeIcon } from "../components/DocTypeIcon";
import { useWeT } from "../LocaleContext";
import type { BacklinkResult } from "../types";

export function BacklinksPanel({
  projectPath,
  nodeId,
  onSelectNode,
}: {
  projectPath: string;
  nodeId: string | null;
  onSelectNode: (id: string) => void;
}) {
  const t = useWeT();
  const [backlinks, setBacklinks] = useState<BacklinkResult[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!nodeId) {
      setBacklinks([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void invoke<BacklinkResult[]>("get_writing_backlinks_command", {
      projectPath,
      nodeId,
    })
      .then((items) => {
        if (!cancelled) setBacklinks(items);
      })
      .catch(() => {
        if (!cancelled) setBacklinks([]);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nodeId, projectPath]);

  if (!nodeId) return null;

  return (
    <section className="we-backlinks-panel" aria-busy={busy}>
      <h3 className="we-metadata-title">{t("backlinksTitle")}</h3>
      {backlinks.length === 0 && !busy && (
        <p className="we-backlinks-empty">{t("backlinksEmpty")}</p>
      )}
      <ul className="we-backlinks-list">
        {backlinks.map((item) => (
          <li key={item.id}>
            <button type="button" className="we-backlinks-item" onClick={() => onSelectNode(item.id)}>
              <span className="we-backlinks-item-title">
                <DocTypeIcon docType={item.doc_type} size={14} />
                {item.title}
              </span>
              {item.snippet && <span className="we-backlinks-snippet">{item.snippet}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
