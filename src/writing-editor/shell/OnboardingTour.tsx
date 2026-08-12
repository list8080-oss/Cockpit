import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from "react";
import { useWeT } from "../LocaleContext";

const STORAGE_KEY = "writing-editor-onboarding-v2";

export type TourStepId =
  | "welcome"
  | "sidebar"
  | "views"
  | "metadata"
  | "search"
  | "wikiLinks"
  | "writingModes"
  | "export"
  | "theme"
  | "shortcuts";

const STEP_ORDER: TourStepId[] = [
  "welcome",
  "sidebar",
  "views",
  "metadata",
  "search",
  "wikiLinks",
  "writingModes",
  "export",
  "theme",
  "shortcuts",
];

const STEP_TARGETS: Partial<Record<TourStepId, string>> = {
  sidebar: '[data-tour="sidebar"]',
  views: '[data-tour="view-toggle"]',
  metadata: '[data-tour="metadata"]',
  search: '[data-tour="search"]',
  wikiLinks: '[data-tour="wiki-links"]',
  writingModes: '[data-tour="writing-modes"]',
  export: '[data-tour="export"]',
  theme: '[data-tour="theme"]',
  shortcuts: '[data-tour="tour-replay"]',
};

const STEP_TITLE_KEYS = {
  welcome: "onboardingWelcomeTitle",
  sidebar: "onboardingSidebarTitle",
  views: "onboardingViewsTitle",
  metadata: "onboardingMetadataTitle",
  search: "onboardingSearchTitle",
  wikiLinks: "onboardingWikiLinksTitle",
  writingModes: "onboardingWritingModesTitle",
  export: "onboardingExportTitle",
  theme: "onboardingThemeTitle",
  shortcuts: "onboardingShortcutsTitle",
} as const;

const STEP_BODY_KEYS = {
  welcome: "onboardingWelcomeBody",
  sidebar: "onboardingSidebarBody",
  views: "onboardingViewsBody",
  metadata: "onboardingMetadataBody",
  search: "onboardingSearchBody",
  wikiLinks: "onboardingWikiLinksBody",
  writingModes: "onboardingWritingModesBody",
  export: "onboardingExportBody",
  theme: "onboardingThemeBody",
  shortcuts: "onboardingShortcutsBody",
} as const;

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function OnboardingTour({
  open,
  onClose,
  onPrepareStep,
}: {
  open: boolean;
  onClose: () => void;
  onPrepareStep?: (step: TourStepId) => void;
}) {
  const t = useWeT();
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);

  const step = STEP_ORDER[stepIndex];
  const isLast = stepIndex >= STEP_ORDER.length - 1;

  const targetSelector = useMemo(() => STEP_TARGETS[step], [step]);

  useEffect(() => {
    if (!open) return;
    onPrepareStep?.(step);
  }, [open, step, onPrepareStep]);

  const measureTarget = useCallback(() => {
    if (!targetSelector) {
      setSpotlight(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (!el) {
      setSpotlight(null);
      return;
    }
    setSpotlight(el.getBoundingClientRect());
  }, [targetSelector]);

  useLayoutEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(measureTarget, 0);
    return () => window.clearTimeout(timer);
  }, [open, step, measureTarget]);

  useEffect(() => {
    if (!open) return;
    const handler = () => measureTarget();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, measureTarget]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        markOnboardingComplete();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const finish = () => {
    markOnboardingComplete();
    onClose();
  };

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((index) => index + 1);
  };

  const goPrev = () => {
    setStepIndex((index) => Math.max(0, index - 1));
  };

  const cardStyle = spotlight
    ? cardPositionStyle(spotlight)
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="onboarding-root" role="presentation">
      <div className="onboarding-backdrop" />
      {spotlight && (
        <div
          className="onboarding-spotlight"
          style={{
            top: spotlight.top - 6,
            left: spotlight.left - 6,
            width: spotlight.width + 12,
            height: spotlight.height + 12,
          }}
        />
      )}
      <div className="onboarding-card" style={cardStyle} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p className="onboarding-step-label">
          {t("onboardingProgress", { current: stepIndex + 1, total: STEP_ORDER.length })}
        </p>
        <h3 id="onboarding-title">{t(STEP_TITLE_KEYS[step])}</h3>
        <p className="onboarding-body">{t(STEP_BODY_KEYS[step])}</p>
        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={finish}>
            {t("onboardingSkip")}
          </button>
          <div className="onboarding-nav">
            <button type="button" onClick={goPrev} disabled={stepIndex === 0}>
              {t("onboardingBack")}
            </button>
            <button type="button" onClick={goNext}>
              {isLast ? t("onboardingDone") : t("onboardingNext")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cardPositionStyle(rect: DOMRect): CSSProperties {
  const margin = 12;
  const cardWidth = 320;
  const belowTop = rect.bottom + margin;
  const aboveTop = rect.top - margin - 180;
  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - cardWidth - margin);

  if (belowTop + 180 < window.innerHeight) {
    return { top: belowTop, left, transform: "none" };
  }
  if (aboveTop > margin) {
    return { top: aboveTop, left, transform: "none" };
  }
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}
