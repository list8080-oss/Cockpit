import { useEffect, useRef, useState } from "react";
import { useWeT } from "../LocaleContext";
import type { TemplateId } from "../types";
import { TEMPLATE_IDS } from "../types";

const TEMPLATE_LABEL_KEYS = {
  blank: "templateBlankLabel",
  novel: "templateNovelLabel",
  "short-story": "templateShortStoryLabel",
  "game-narrative": "templateGameNarrativeLabel",
  screenplay: "templateScreenplayLabel",
} as const;

const TEMPLATE_DESC_KEYS = {
  blank: "templateBlankDesc",
  novel: "templateNovelDesc",
  "short-story": "templateShortStoryDesc",
  "game-narrative": "templateGameNarrativeDesc",
  screenplay: "templateScreenplayDesc",
} as const;

export function TemplatePickerDialog({
  onClose,
  onConfirm,
  busy,
}: {
  onClose: () => void;
  onConfirm: (templateId: TemplateId) => void;
  busy: boolean;
}) {
  const t = useWeT();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<TemplateId>("blank");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, onClose]);

  return (
    <div
      ref={backdropRef}
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (!busy && e.target === backdropRef.current) onClose();
      }}
    >
      <div className="dialog template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-dialog-title">
        <h3 id="template-dialog-title">{t("templatePickerTitle")}</h3>
        <p className="template-description">{t("templatePickerDescription")}</p>

        <div className="template-options">
          {TEMPLATE_IDS.map((id) => (
            <label key={id} className={`template-option${selected === id ? " selected" : ""}`}>
              <input
                type="radio"
                name="project-template"
                value={id}
                checked={selected === id}
                disabled={busy}
                onChange={() => setSelected(id)}
              />
              <span>
                <span className="template-option-label">{t(TEMPLATE_LABEL_KEYS[id])}</span>
                <span className="template-option-desc">{t(TEMPLATE_DESC_KEYS[id])}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="dialog-actions">
          <button type="button" onClick={onClose} disabled={busy}>
            {t("cancel")}
          </button>
          <button type="button" onClick={() => onConfirm(selected)} disabled={busy}>
            {t("templatePickerCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
