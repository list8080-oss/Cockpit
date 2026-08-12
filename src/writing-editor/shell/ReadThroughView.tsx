import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWeT } from "../LocaleContext";
import type { ReadThroughData } from "../types";

function headingTag(level: number): ElementType {
  const clamped = Math.min(6, Math.max(1, level));
  return `h${clamped}` as ElementType;
}

export function ReadThroughView({
  projectPath,
  activeNodeId,
  onSelectNode,
  onClose,
}: {
  projectPath: string;
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
  onClose: () => void;
}) {
  const t = useWeT();
  const [data, setData] = useState<ReadThroughData | null>(null);
  const [busy, setBusy] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void invoke<ReadThroughData>("get_writing_readthrough_command", { projectPath })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setData({ sections: [], total_words: 0 });
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const sections = data?.sections ?? [];

  useEffect(() => {
    if (!activeNodeId || sections.length === 0) return;
    const index = sections.findIndex((section) => section.id === activeNodeId);
    if (index >= 0) setFocusIndex(index);
  }, [activeNodeId, sections]);

  useEffect(() => {
    sectionRefs.current[focusIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusIndex]);

  const goPrev = useCallback(() => {
    setFocusIndex((index) => Math.max(0, index - 1));
  }, []);

  const goNext = useCallback(() => {
    setFocusIndex((index) => Math.min(sections.length - 1, index + 1));
  }, [sections.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  const current = sections[focusIndex];
  const progress = useMemo(() => {
    if (sections.length === 0) return 0;
    return Math.round(((focusIndex + 1) / sections.length) * 100);
  }, [focusIndex, sections.length]);

  if (busy) {
    return (
      <div className="we-readthrough we-readthrough-empty">
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="we-readthrough we-readthrough-empty">
        <p>{t("readThroughEmpty")}</p>
        <button type="button" onClick={onClose}>
          {t("readThroughBackToEditor")}
        </button>
      </div>
    );
  }

  return (
    <div className="we-readthrough">
      <header className="we-readthrough-toolbar">
        <div className="we-readthrough-nav">
          <button type="button" onClick={goPrev} disabled={focusIndex <= 0}>
            {t("readThroughPrev")}
          </button>
          <span className="we-readthrough-progress">
            {t("readThroughProgress", {
              current: focusIndex + 1,
              total: sections.length,
              percent: progress,
            })}
          </span>
          <button type="button" onClick={goNext} disabled={focusIndex >= sections.length - 1}>
            {t("readThroughNext")}
          </button>
        </div>
        <div className="we-readthrough-meta">
          <span>{t("words", { n: data?.total_words ?? 0 })}</span>
          <button type="button" onClick={onClose}>
            {t("readThroughBackToEditor")}
          </button>
        </div>
      </header>

      <article className="we-readthrough-content">
        {sections.map((section, index) => {
          const Heading = headingTag(section.heading_level);
          const active = index === focusIndex;
          return (
            <section
              key={section.id}
              ref={(el) => {
                sectionRefs.current[index] = el;
              }}
              className={`we-readthrough-section${active ? " we-readthrough-section-active" : ""}`}
            >
              <Heading>
                <button
                  type="button"
                  className="we-readthrough-section-link"
                  onClick={() => {
                    setFocusIndex(index);
                    onSelectNode(section.id);
                  }}
                >
                  {section.title}
                </button>
              </Heading>
              {section.body_html ? (
                <div
                  className="we-readthrough-body"
                  dangerouslySetInnerHTML={{ __html: section.body_html }}
                />
              ) : (
                <p className="we-readthrough-body-empty">{t("readThroughSectionEmpty")}</p>
              )}
            </section>
          );
        })}
      </article>

      {current && (
        <footer className="we-readthrough-footer">
          <span>{current.title}</span>
          <span>{t("words", { n: current.word_count })}</span>
        </footer>
      )}
    </div>
  );
}
