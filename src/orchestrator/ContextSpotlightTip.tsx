import { useCallback, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type { OrchestratorContext } from "./runFanout";

/** Same spotlight-overlay technique as the writing editor's
 * `OnboardingTour` (backdrop + `box-shadow: 0 0 0 9999px` cutout + a
 * positioned card) — but not the same component or CSS classes. The editor
 * has its own CSS variable namespace (`--bg`, `--border`, …, see
 * `writing-editor/themes/`) and its own `weT` i18n dict, both independent of
 * this app's `--color-*` tokens and `t(locale, …)`. Sharing one component
 * across that boundary would mean either threading colors through props (as
 * much code as just restyling) or coupling the editor's theming to the main
 * app's — not worth it for a one-shot single-card tip vs. a 10-step
 * sequenced tour with very different navigation needs. */
export function ContextSpotlightTip({
  direction,
  targetRef,
  locale,
  onDismiss,
}: {
  direction: OrchestratorContext;
  targetRef: RefObject<HTMLElement | null>;
  locale: Locale;
  onDismiss: () => void;
}) {
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    setSpotlight(targetRef.current?.getBoundingClientRect() ?? null);
  }, [targetRef]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useLayoutEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  const cardStyle = spotlight
    ? cardPositionStyle(spotlight)
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const titleKey = direction === "project" ? "orchestratorContextTipProjectTitle" : "orchestratorContextTipFreeTitle";
  const bodyKey = direction === "project" ? "orchestratorContextTipProjectBody" : "orchestratorContextTipFreeBody";

  return (
    <div className="orchestrator-context-tip-root" role="presentation">
      <div className="orchestrator-context-tip-backdrop" />
      {spotlight && (
        <div
          className="orchestrator-context-tip-spotlight"
          style={{
            top: spotlight.top - 6,
            left: spotlight.left - 6,
            width: spotlight.width + 12,
            height: spotlight.height + 12,
          }}
        />
      )}
      <div
        className="orchestrator-context-tip-card"
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="orchestrator-context-tip-title"
      >
        <h3 id="orchestrator-context-tip-title">{t(locale, titleKey)}</h3>
        <p>{t(locale, bodyKey)}</p>
        <button type="button" className="send-btn" onClick={onDismiss}>
          {t(locale, "orchestratorContextTipDismiss")}
        </button>
      </div>
    </div>
  );
}

/** Same viewport-aware above/below flip as the editor's own
 * `cardPositionStyle` (OnboardingTour.tsx) — deliberately not imported from
 * there (see the module doc comment above): it's ~15 lines of pure
 * geometry, cheaper to keep independent than to add a cross-module import
 * between two otherwise-unrelated features. */
function cardPositionStyle(rect: DOMRect): CSSProperties {
  const margin = 12;
  const cardWidth = 320;
  const belowTop = rect.bottom + margin;
  const aboveTop = rect.top - margin - 140;
  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - cardWidth - margin);

  if (belowTop + 140 < window.innerHeight) {
    return { top: belowTop, left, transform: "none" };
  }
  if (aboveTop > margin) {
    return { top: aboveTop, left, transform: "none" };
  }
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}
