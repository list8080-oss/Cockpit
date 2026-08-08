import type { EditorView } from "@codemirror/view";
import { useWeT } from "../LocaleContext";
import {
  keepFocus,
  wrapInline,
  applyTransform,
  transformSelectedLines,
  type ViewGetter,
} from "./toolbarHelpers";

export interface FormattingButtonsProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  /** Rendered after inline code button (inside the inline toolbar-group) */
  inlineExtra?: React.ReactNode;
  /** Rendered after code block button (inside the block toolbar-group) */
  blockExtra?: React.ReactNode;
}

export function FormattingButtons({ viewRef, inlineExtra, blockExtra }: FormattingButtonsProps) {
  const t = useWeT();
  const view: ViewGetter = () => viewRef.current;

  const setHeadingLevel = (level: 1 | 2 | 3) => {
    const headingRe = new RegExp(`^\\s*#{${level}}\\s+`);
    transformSelectedLines(view, (lines) => {
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      const allSameHeading = nonEmpty.length > 0 && nonEmpty.every((l) => headingRe.test(l));

      return lines.map((line) => {
        if (!line.trim()) return line;
        const withoutHeading = line.replace(/^(\s*)#{1,6}\s+/, "$1");
        if (allSameHeading) return withoutHeading;
        const indent = withoutHeading.match(/^(\s*)/)?.[1] ?? "";
        return `${indent}${"#".repeat(level)} ${withoutHeading.trimStart()}`;
      });
    });
  };

  const toggleBulletedList = () => {
    transformSelectedLines(view, (lines) => {
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      const allBulleted = nonEmpty.length > 0 && nonEmpty.every((l) => /^\s*[-*]\s+/.test(l));

      return lines.map((line) => {
        if (!line.trim()) return line;
        if (allBulleted) return line.replace(/^(\s*)[-*]\s+/, "$1");
        return line.replace(/^(\s*)/, "$1- ");
      });
    });
  };

  const toggleNumberedList = () => {
    transformSelectedLines(view, (lines) => {
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      const allNumbered = nonEmpty.length > 0 && nonEmpty.every((l) => /^\s*\d+\.\s+/.test(l));

      let n = 1;
      return lines.map((line) => {
        if (!line.trim()) return line;
        if (allNumbered) return line.replace(/^(\s*)\d+\.\s+/, "$1");
        const indent = line.match(/^(\s*)/)?.[1] ?? "";
        return `${indent}${n++}. ${line.trimStart()}`;
      });
    });
  };

  const toggleBlockquote = () => {
    transformSelectedLines(view, (lines) => {
      const nonEmpty = lines.filter((l) => l.trim().length > 0);
      const allQuoted = nonEmpty.length > 0 && nonEmpty.every((l) => /^\s*>\s?/.test(l));

      return lines.map((line) => {
        if (!line.trim()) return line;
        if (allQuoted) return line.replace(/^(\s*)>\s?/, "$1");
        return line.replace(/^(\s*)/, "$1> ");
      });
    });
  };

  const insertCodeBlock = () => {
    applyTransform(view, ({ from, to, selected }) => {
      if (from === to) {
        const insertion = "```\n\n```";
        const cursor = from + 4;
        return { replacement: insertion, selectFrom: cursor, selectTo: cursor };
      }

      const fenced = `\`\`\`\n${selected}\n\`\`\``;
      return { replacement: fenced, selectFrom: from + 4, selectTo: from + 4 + selected.length };
    });
  };

  return (
    <>
      {/* Markdown inline */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("bold")}
          onMouseDown={keepFocus}
          onClick={() => wrapInline(view, "**", "**", "bold")}
        >
          <span className="toolbar-label">
            <strong>B</strong>
          </span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("italic")}
          onMouseDown={keepFocus}
          onClick={() => wrapInline(view, "_", "_", "italic")}
        >
          <span className="toolbar-label">
            <em>I</em>
          </span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("inlineCode")}
          onMouseDown={keepFocus}
          onClick={() => wrapInline(view, "`", "`", "code")}
        >
          <span className="toolbar-label">`code`</span>
        </button>

        {inlineExtra}
      </div>

      <div className="toolbar-sep" />

      {/* Markdown block */}
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("heading1")}
          onMouseDown={keepFocus}
          onClick={() => setHeadingLevel(1)}
        >
          <span className="toolbar-label">H1</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("heading2")}
          onMouseDown={keepFocus}
          onClick={() => setHeadingLevel(2)}
        >
          <span className="toolbar-label">H2</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("heading3")}
          onMouseDown={keepFocus}
          onClick={() => setHeadingLevel(3)}
        >
          <span className="toolbar-label">H3</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("bulletedList")}
          onMouseDown={keepFocus}
          onClick={toggleBulletedList}
        >
          <span className="toolbar-label">{t("listBulletLabel")}</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("numberedList")}
          onMouseDown={keepFocus}
          onClick={toggleNumberedList}
        >
          <span className="toolbar-label">{t("listNumberLabel")}</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("blockquote")}
          onMouseDown={keepFocus}
          onClick={toggleBlockquote}
        >
          <span className="toolbar-label">{t("quoteLabel")}</span>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          data-tooltip={t("codeBlock")}
          onMouseDown={keepFocus}
          onClick={insertCodeBlock}
        >
          <span className="toolbar-label">{t("codeBlockLabel")}</span>
        </button>
        {blockExtra}
      </div>
    </>
  );
}
