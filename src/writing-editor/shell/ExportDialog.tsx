import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { useWeT } from "../LocaleContext";
import type { ExportFormat, ExportResult } from "../types";

export function ExportDialog({
  projectPath,
  onClose,
  onToast,
}: {
  projectPath: string;
  onClose: () => void;
  onToast: (message: string, type: "success" | "error") => void;
}) {
  const t = useWeT();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<ExportFormat>("html");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, onClose]);

  useEffect(() => {
    if (!busy || startedAt == null) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy, startedAt]);

  const runExport = async () => {
    const defaultName = format === "pdf" ? "manuscript.pdf" : "manuscript.html";
    const selected = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: format === "pdf" ? "PDF" : "HTML",
          extensions: [format],
        },
      ],
    });
    if (!selected) return;

    setBusy(true);
    setStartedAt(Date.now());
    setElapsed(0);
    try {
      const result = await invoke<ExportResult>("export_writing_project_command", {
        projectPath,
        format,
        outputPath: selected,
      });
      onToast(
        t("exportSuccess", {
          words: result.word_count,
          sections: result.section_count,
        }),
        "success",
      );
      onClose();
    } catch (err) {
      onToast(String(err), "error");
    } finally {
      setBusy(false);
      setStartedAt(null);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (!busy && e.target === backdropRef.current) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
        <h3 id="export-dialog-title">{t("exportTitle")}</h3>
        <p className="export-dialog-desc">{t("exportDescription")}</p>

        <div className="export-format-options">
          <label className={`export-format-option${format === "html" ? " selected" : ""}`}>
            <input
              type="radio"
              name="export-format"
              value="html"
              checked={format === "html"}
              disabled={busy}
              onChange={() => setFormat("html")}
            />
            <span>
              <span className="export-format-label">{t("exportFormatHtml")}</span>
              <span className="export-format-desc">{t("exportFormatHtmlDesc")}</span>
            </span>
          </label>
          <label className={`export-format-option${format === "pdf" ? " selected" : ""}`}>
            <input
              type="radio"
              name="export-format"
              value="pdf"
              checked={format === "pdf"}
              disabled={busy}
              onChange={() => setFormat("pdf")}
            />
            <span>
              <span className="export-format-label">{t("exportFormatPdf")}</span>
              <span className="export-format-desc">{t("exportFormatPdfDesc")}</span>
            </span>
          </label>
        </div>

        <div className="dialog-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </button>
          <button type="button" onClick={() => void runExport()} disabled={busy}>
            {t("exportAction")}
          </button>
        </div>
      </div>

      {busy && (
        <div className="export-loading" aria-live="polite">
          <div className="export-spinner" />
          <span>{t("exportInProgress")}</span>
          <span className="export-elapsed">{elapsed}s</span>
        </div>
      )}
    </div>
  );
}
