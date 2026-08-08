import { useEffect, useRef } from "react";
import { mod } from "../utils/platform";

interface Shortcut {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

/** Editor-only shortcuts (Loomdraft shell/tree/corkboard omitted). */
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Editor",
    shortcuts: [
      { keys: `${mod}+S`, label: "Save" },
      { keys: `${mod}+Z`, label: "Undo" },
      { keys: `${mod}+Shift+Z`, label: "Redo" },
      { keys: `${mod}+B`, label: "Bold" },
      { keys: `${mod}+I`, label: "Italic" },
      { keys: `${mod}+F`, label: "Find in document" },
      { keys: `${mod}+/`, label: "Keyboard shortcuts" },
    ],
  },
  {
    title: "Writing Modes",
    shortcuts: [
      { keys: `${mod}+Shift+D`, label: "Distraction-free mode" },
      { keys: `${mod}+Alt+T`, label: "Typewriter mode" },
      { keys: `${mod}+Alt+F`, label: "Focus mode" },
      { keys: `${mod}+Alt+W`, label: "Soft wrap" },
    ],
  },
];

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="shortcuts-panel">
        <div className="shortcuts-header">
          <span className="shortcuts-title">Keyboard Shortcuts</span>
          <button type="button" className="shortcuts-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="shortcuts-body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcuts-group">
              <div className="shortcuts-group-title">{group.title}</div>
              {group.shortcuts.map((s) => (
                <div key={s.keys} className="shortcut-row">
                  <kbd>{s.keys}</kbd>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
