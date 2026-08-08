import { useState, useEffect, useRef } from "react";
import { useWeT } from "../LocaleContext";

// ── ImagePreviewCard ─────────────────────────────────────────────────────────

export interface ActiveImage {
  relativePath: string;
  alt: string;
  width?: number;
  height?: number;
  rect: DOMRect;
}

export function ImagePreviewCard({
  dataUrl,
  image,
  onResize,
  onClose,
}: {
  dataUrl: string | undefined;
  image: ActiveImage;
  onResize: (width: number | undefined, height: number | undefined) => void;
  onClose: () => void;
}) {
  const t = useWeT();
  const cardRef = useRef<HTMLDivElement>(null);
  const [widthInput, setWidthInput] = useState(image.width?.toString() ?? "");
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  // Close on click outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Positioning: clamp to viewport bounds
  const cardWidth = 500;
  const cardHeight = 340;
  const left = Math.max(8, Math.min(image.rect.left, window.innerWidth - cardWidth - 16));
  const belowSpace = window.innerHeight - image.rect.bottom;
  const top = belowSpace > cardHeight
    ? image.rect.bottom + 6
    : Math.max(8, Math.min(image.rect.top - cardHeight, window.innerHeight - cardHeight - 8));

  const handleNaturalSize = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const applyWidth = (w: number | undefined) => {
    if (!w || !naturalSize || naturalSize.w === 0) {
      onResize(undefined, undefined);
      setWidthInput("");
      return;
    }
    const aspect = naturalSize.h / naturalSize.w;
    const h = Math.round(w * aspect);
    onResize(w, h);
    setWidthInput(w.toString());
  };

  const handleWidthSubmit = () => {
    const val = parseInt(widthInput);
    if (!val || val < 10) {
      applyWidth(undefined);
    } else {
      applyWidth(val);
    }
  };

  const displayWidth = image.width ?? naturalSize?.w;
  const displayHeight = image.height ?? naturalSize?.h;

  return (
    <div className="image-preview-card" ref={cardRef} style={{ position: "fixed", top, left }}>
      {dataUrl ? (
        <img
          className="ipc-image"
          src={dataUrl}
          alt={image.alt || t("preview")}
          onLoad={handleNaturalSize}
        />
      ) : (
        <div className="ipc-loading">{t("loadingImage")}</div>
      )}

      {image.alt && <div className="ipc-alt">{image.alt}</div>}

      <div className="ipc-info">
        {displayWidth && displayHeight && (
          <span>
            {displayWidth} × {displayHeight}px
          </span>
        )}
        {naturalSize && (
          <span>{t("originalSize", { w: naturalSize.w, h: naturalSize.h })}</span>
        )}
      </div>

      <div className="ipc-resize-row">
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{t("width")}:</span>
        <input
          className="ipc-size-input"
          type="number"
          min={10}
          value={widthInput}
          placeholder={t("autoSize")}
          onChange={(e) => setWidthInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleWidthSubmit();
          }}
          onBlur={handleWidthSubmit}
        />
        <div className="ipc-size-presets">
          <button type="button" className="ipc-size-btn" onClick={() => applyWidth(200)}>
            S
          </button>
          <button type="button" className="ipc-size-btn" onClick={() => applyWidth(400)}>
            M
          </button>
          <button type="button" className="ipc-size-btn" onClick={() => applyWidth(800)}>
            L
          </button>
          <button type="button" className="ipc-size-btn" onClick={() => applyWidth(undefined)}>
            {t("autoSize")}
          </button>
        </div>
      </div>
    </div>
  );
}
