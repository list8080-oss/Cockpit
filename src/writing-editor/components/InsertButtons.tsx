import { useState, useEffect, useRef, useMemo } from "react";
import { ImagePlus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { EditorView } from "@codemirror/view";
import type { ProjectManifest } from "../types";
import { useWeT } from "../LocaleContext";
import { keepFocus, type ViewGetter } from "./toolbarHelpers";

// ── Link Picker ──────────────────────────────────────────────────────────────

export interface LinkPickerButtonProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  manifest?: ProjectManifest;
}

export function LinkPickerButton({ viewRef, manifest }: LinkPickerButtonProps) {
  const t = useWeT();
  const view: ViewGetter = () => viewRef.current;
  const linkPickerRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkRange, setLinkRange] = useState<{ start: number; end: number } | null>(null);
  const [linkActiveIdx, setLinkActiveIdx] = useState(0);

  const internalLinkItems = useMemo(() => {
    if (!manifest) return [];
    const items: { title: string; docType?: string }[] = [];
    for (const node of Object.values(manifest.nodes)) {
      const title = node.title?.trim();
      if (title) items.push({ title, docType: node.doc_type });
    }
    // Deduplicate by title, keep first occurrence
    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.title)) return false;
        seen.add(item.title);
        return true;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [manifest]);

  const totalMatches = useMemo(() => {
    const query = linkQuery.trim().toLowerCase();
    return query
      ? internalLinkItems.filter((item) => item.title.toLowerCase().includes(query)).length
      : internalLinkItems.length;
  }, [internalLinkItems, linkQuery]);

  const filteredLinkItems = useMemo(() => {
    const query = linkQuery.trim().toLowerCase();
    const base = query
      ? internalLinkItems.filter((item) => item.title.toLowerCase().includes(query))
      : internalLinkItems;
    return base.slice(0, 20);
  }, [internalLinkItems, linkQuery]);

  // Keep backward-compatible title array for keyboard handling
  const filteredLinkTitles = useMemo(
    () => filteredLinkItems.map((item) => item.title),
    [filteredLinkItems],
  );

  useEffect(() => {
    if (!showLinkPicker) return;
    const onWindowMouseDown = (event: MouseEvent) => {
      if (!linkPickerRef.current?.contains(event.target as Node)) {
        setShowLinkPicker(false);
      }
    };
    window.addEventListener("mousedown", onWindowMouseDown);
    return () => window.removeEventListener("mousedown", onWindowMouseDown);
  }, [showLinkPicker]);

  useEffect(() => {
    if (!showLinkPicker) return;
    const id = window.setTimeout(() => linkInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [showLinkPicker]);

  const applyInternalLink = (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return;

    const v = view();
    if (!v) return;
    v.focus();

    const start = linkRange?.start ?? v.state.selection.main.from;
    const end = linkRange?.end ?? v.state.selection.main.to;
    const replacement = `[[${title}]]`;
    v.dispatch({
      changes: { from: start, to: end, insert: replacement },
      selection: { anchor: start + 2, head: start + 2 + title.length },
    });
    setShowLinkPicker(false);
    setLinkRange(null);
  };

  const openLinkPicker = () => {
    const v = view();
    if (!v) return;
    v.focus();

    const doc = v.state.doc.toString();
    const { from, to } = v.state.selection.main;
    let range = { start: from, end: to };
    let query = v.state.sliceDoc(from, to);

    if (from === to) {
      const left = doc.lastIndexOf("[[", from);
      const right = doc.indexOf("]]", from);
      if (left !== -1 && right !== -1 && left < from && right >= from) {
        range = { start: left, end: right + 2 };
        query = doc.slice(left + 2, right);
      }
    } else {
      const selected = v.state.sliceDoc(from, to);
      const match = selected.match(/^\[\[([^\]]+)\]\]$/);
      if (match) query = match[1];
    }

    setLinkRange(range);
    setLinkQuery(query);
    setLinkActiveIdx(0);
    setShowLinkPicker(true);
  };

  return (
    <div className="toolbar-link-picker" ref={linkPickerRef} data-tour="wiki-links">
      <button
        type="button"
        className="toolbar-btn"
        data-tooltip={t("insertLink")}
        onMouseDown={keepFocus}
        onClick={openLinkPicker}
      >
        <span className="toolbar-label">{t("linkLabel")}</span>
      </button>

      {showLinkPicker && (
        <div className="link-picker-popover">
          <input
            ref={linkInputRef}
            className="link-picker-input"
            placeholder={t("linkPlaceholder")}
            value={linkQuery}
            onChange={(e) => {
              setLinkQuery(e.target.value);
              setLinkActiveIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setShowLinkPicker(false);
                view()?.focus();
                return;
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!filteredLinkTitles.length) return;
                setLinkActiveIdx((idx) => (idx + 1) % filteredLinkTitles.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!filteredLinkTitles.length) return;
                setLinkActiveIdx(
                  (idx) => (idx - 1 + filteredLinkTitles.length) % filteredLinkTitles.length,
                );
                return;
              }
              if (e.key === "Tab" && filteredLinkTitles.length) {
                e.preventDefault();
                setLinkQuery(filteredLinkTitles[linkActiveIdx] ?? filteredLinkTitles[0]);
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const choice =
                  filteredLinkTitles[linkActiveIdx] ?? filteredLinkTitles[0] ?? linkQuery;
                applyInternalLink(choice);
              }
            }}
          />
          <div className="link-picker-list">
            {filteredLinkItems.map((item, idx) => (
              <button
                key={item.title}
                className={`link-picker-item${idx === linkActiveIdx ? " active" : ""}`}
                onMouseDown={keepFocus}
                onMouseEnter={() => setLinkActiveIdx(idx)}
                onClick={() => applyInternalLink(item.title)}
              >
                <span className="link-picker-item-title">{item.title}</span>
                {item.docType && (
                  <span className="link-picker-item-type">{item.docType}</span>
                )}
              </button>
            ))}
            {!filteredLinkItems.length && (
              <div className="link-picker-empty">{t("linkNoMatches")}</div>
            )}
            {totalMatches > filteredLinkItems.length && (
              <div className="link-picker-count">
                {t("showingOf", {
                  shown: filteredLinkItems.length,
                  total: totalMatches,
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image Insert Button ──────────────────────────────────────────────────────

export interface ImageInsertButtonProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  projectPath: string;
}

export function ImageInsertButton({ viewRef, projectPath }: ImageInsertButtonProps) {
  const t = useWeT();
  const view: ViewGetter = () => viewRef.current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = (relativePath: string) => {
    const v = view();
    if (!v) return;
    v.focus();
    const doc = v.state.doc.toString();
    const pos = v.state.selection.main.head;
    const before = doc.slice(0, pos);
    const after = doc.slice(pos);
    const needNewlineBefore = before.length > 0 && !before.endsWith("\n");
    const needNewlineAfter = after.length > 0 && !after.startsWith("\n");
    const insertion = `${needNewlineBefore ? "\n" : ""}![](${relativePath})${needNewlineAfter ? "\n" : ""}`;
    const cursorPos =
      pos + insertion.length - (needNewlineAfter ? 1 : 0) + (needNewlineBefore ? 1 : 0);
    v.dispatch({
      changes: { from: pos, insert: insertion },
      selection: { anchor: cursorPos },
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const relativePath = await invoke<string>("import_image_bytes", {
        projectPath,
        fileName: file.name,
        bytes: Array.from(new Uint8Array(buffer)),
      });
      insertAtCursor(relativePath);
    } catch (err) {
      console.warn("Image insert failed", err);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/bmp,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp"
        style={{ display: "none" }}
        onChange={(e) => void handleFileChange(e)}
      />
      <button
        type="button"
        className="toolbar-btn"
        data-tooltip={t("insertImage")}
        onMouseDown={keepFocus}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus size={14} />
        <span className="toolbar-label">{t("imageLabel")}</span>
      </button>
    </>
  );
}
