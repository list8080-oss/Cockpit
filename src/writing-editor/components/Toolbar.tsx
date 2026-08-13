import { Undo2, Redo2, Scissors, Copy, Clipboard, TextSelect, Search } from "lucide-react";
import type { EditorView } from "@codemirror/view";
import { selectAll } from "@codemirror/commands";
import type { ProjectManifest } from "../types";
import { useWeT } from "../LocaleContext";
import { keepFocus } from "./toolbarHelpers";
import { FormattingButtons } from "./FormattingButtons";
import { LinkPickerButton, ImageInsertButton } from "./InsertButtons";
import { mod } from "../utils/platform";

export interface ToolbarProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  canUndo: boolean;
  canRedo: boolean;
  manifest?: ProjectManifest;
  projectPath?: string;
  onToast?: (message: string, type: "success" | "error") => void;
  onUndo: () => void;
  onRedo: () => void;
  showFind: boolean;
  onToggleFind: () => void;
  softWrap: boolean;
  showOutline: boolean;
  outlineCount: number;
  typewriterMode: boolean;
  focusMode: boolean;
  distractionFree: boolean;
  spellCheck: boolean;
  manuscriptMode: boolean;
  onToggleSoftWrap: () => void;
  onToggleOutline: () => void;
  onToggleTypewriter: () => void;
  onToggleFocusMode: () => void;
  onToggleDistractionFree: () => void;
  onToggleSpellCheck: () => void;
  onToggleManuscriptMode: () => void;
}

export function Toolbar({
  viewRef,
  canUndo,
  canRedo,
  manifest,
  projectPath,
  onToast,
  onUndo,
  onRedo,
  showFind,
  onToggleFind,
  softWrap,
  showOutline,
  outlineCount,
  typewriterMode,
  focusMode,
  distractionFree,
  spellCheck,
  manuscriptMode,
  onToggleSoftWrap,
  onToggleOutline,
  onToggleTypewriter,
  onToggleFocusMode,
  onToggleDistractionFree,
  onToggleSpellCheck,
  onToggleManuscriptMode,
}: ToolbarProps) {
  const t = useWeT();
  const view = () => viewRef.current;

  const handleCopy = async () => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    if (from === to) return;
    const text = v.state.sliceDoc(from, to);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn("Clipboard write failed", err);
    }
  };

  const handleCut = async () => {
    const v = view();
    if (!v) return;
    const { from, to } = v.state.selection.main;
    if (from === to) return;
    const text = v.state.sliceDoc(from, to);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn("Clipboard write failed", err);
      return;
    }
    v.dispatch({
      changes: { from, to, insert: "" },
      selection: { anchor: from },
    });
  };

  const handlePaste = async () => {
    const v = view();
    if (!v) return;
    try {
      const text = await navigator.clipboard.readText();
      const { from, to } = v.state.selection.main;
      v.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
    } catch (err) {
      console.warn("Clipboard read failed", err);
    }
  };

  const handleSelectAll = () => {
    const v = view();
    if (!v) return;
    v.focus();
    selectAll(v);
  };

  return (
    <div className="editor-toolbar" data-tour="writing-modes">
      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("undo")}
          data-tooltip={`${t("undo")} (${mod}+Z)`}
          disabled={!canUndo}
          onMouseDown={keepFocus}
          onClick={onUndo}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("redo")}
          data-tooltip={`${t("redo")} (${mod}+Shift+Z)`}
          disabled={!canRedo}
          onMouseDown={keepFocus}
          onClick={onRedo}
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className="toolbar-sep" />

      <FormattingButtons
        viewRef={viewRef}
        inlineExtra={<LinkPickerButton viewRef={viewRef} manifest={manifest} />}
        blockExtra={
          projectPath ? (
            <ImageInsertButton viewRef={viewRef} projectPath={projectPath} onToast={onToast} />
          ) : undefined
        }
      />

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("cut")}
          data-tooltip={`${t("cut")} (${mod}+X)`}
          onMouseDown={keepFocus}
          onClick={() => void handleCut()}
        >
          <Scissors size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("copy")}
          data-tooltip={`${t("copy")} (${mod}+C)`}
          onMouseDown={keepFocus}
          onClick={() => void handleCopy()}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("paste")}
          data-tooltip={`${t("paste")} (${mod}+V)`}
          onMouseDown={keepFocus}
          onClick={() => void handlePaste()}
        >
          <Clipboard size={14} />
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          type="button"
          className="toolbar-btn"
          aria-label={t("selectAll")}
          data-tooltip={`${t("selectAll")} (${mod}+A)`}
          onMouseDown={keepFocus}
          onClick={handleSelectAll}
        >
          <TextSelect size={14} />
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn${showFind ? " active" : ""}`}
          data-tooltip={`${t("findReplace")} (${mod}+F)`}
          onMouseDown={keepFocus}
          onClick={onToggleFind}
        >
          <Search size={14} />
          <span className="toolbar-label">{t("find")}</span>
        </button>
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-group">
        <button
          type="button"
          className={`toolbar-btn${showOutline ? " active" : ""}`}
          data-tooltip={`${t("outlineTooltip")} (${mod}+Shift+O)`}
          onMouseDown={keepFocus}
          onClick={onToggleOutline}
        >
          <span className="toolbar-label">{t("outline")}</span>
          <span className="toolbar-count">{outlineCount}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${typewriterMode ? " active" : ""}`}
          data-tooltip={`${t("typewriterTooltip")} (${mod}+Alt+T)`}
          onMouseDown={keepFocus}
          onClick={onToggleTypewriter}
        >
          <span className="toolbar-label">{t("typewriter")}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${focusMode ? " active" : ""}`}
          data-tooltip={`${t("focusTooltip")} (${mod}+Alt+F)`}
          onMouseDown={keepFocus}
          onClick={onToggleFocusMode}
        >
          <span className="toolbar-label">{t("focus")}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${distractionFree ? " active" : ""}`}
          data-tooltip={`${t("distractionFreeTooltip")} (${mod}+Shift+D)`}
          onMouseDown={keepFocus}
          onClick={onToggleDistractionFree}
        >
          <span className="toolbar-label">{t("distractionFree")}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${softWrap ? " active" : ""}`}
          data-tooltip={`${t("wrapTooltip")} (${mod}+Alt+W)`}
          onMouseDown={keepFocus}
          onClick={onToggleSoftWrap}
        >
          <span className="toolbar-label">{t("wrap")}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${manuscriptMode ? " active" : ""}`}
          data-tooltip={t("manuscriptTooltip")}
          onMouseDown={keepFocus}
          onClick={onToggleManuscriptMode}
        >
          <span className="toolbar-label">{t("manuscript")}</span>
        </button>
        <button
          type="button"
          className={`toolbar-btn${spellCheck ? " active" : ""}`}
          data-tooltip={t("spellTooltip")}
          onMouseDown={keepFocus}
          onClick={onToggleSpellCheck}
        >
          <span className="toolbar-label">{t("spell")}</span>
        </button>
      </div>
    </div>
  );
}
