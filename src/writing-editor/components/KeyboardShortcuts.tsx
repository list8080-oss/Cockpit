import { useEffect, useMemo, useRef } from "react";
import { useWeT } from "../LocaleContext";
import { mod } from "../utils/platform";

interface Shortcut {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  const t = useWeT();
  const backdropRef = useRef<HTMLDivElement>(null);

  const groups = useMemo<ShortcutGroup[]>(
    () => [
      {
        title: t("shortcutsGroupEditor"),
        shortcuts: [
          { keys: `${mod}+S`, label: t("shortcutSave") },
          { keys: `${mod}+Z`, label: t("shortcutUndo") },
          { keys: `${mod}+Shift+Z`, label: t("shortcutRedo") },
          { keys: `${mod}+B`, label: t("shortcutBold") },
          { keys: `${mod}+I`, label: t("shortcutItalic") },
          { keys: `${mod}+F`, label: t("shortcutFind") },
          { keys: `${mod}+/`, label: t("shortcutShortcuts") },
        ],
      },
      {
        title: t("shortcutsGroupModes"),
        shortcuts: [
          { keys: `${mod}+Shift+D`, label: t("shortcutDistractionFree") },
          { keys: `${mod}+Alt+T`, label: t("shortcutTypewriter") },
          { keys: `${mod}+Alt+F`, label: t("shortcutFocus") },
          { keys: `${mod}+Alt+W`, label: t("shortcutWrap") },
        ],
      },
    ],
    [t],
  );

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
          <span className="shortcuts-title">{t("shortcutsTitle")}</span>
          <button type="button" className="shortcuts-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="shortcuts-body">
          {groups.map((group) => (
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
