import { useEffect, useRef, useState } from "react";
import { BUILTIN_THEME_LIST, BUILTIN_THEMES } from "../themes/builtinThemes";
import { saveEditorThemeId } from "../themes/themeStorage";
import { useWeT } from "../LocaleContext";

const BUILTIN_THEME_NAME_KEYS = {
  dark: "themeNameDark",
  light: "themeNameLight",
  "midnight-jazz": "themeNameMidnightJazz",
  "forest-canopy": "themeNameForestCanopy",
  "sunset-drift": "themeNameSunsetDrift",
  "arctic-fog": "themeNameArcticFog",
  "sepia-study": "themeNameSepiaStudy",
} as const;

export function ThemePicker({
  activeThemeId,
  onSelect,
}: {
  activeThemeId: string;
  onSelect: (themeId: string) => void;
}) {
  const t = useWeT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const activeTheme = BUILTIN_THEMES[activeThemeId] ?? BUILTIN_THEMES.light;

  return (
    <div className="we-theme-picker-wrap" ref={rootRef} data-tour="theme">
      <button
        type="button"
        className="we-theme-picker-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className="theme-picker-dot"
          style={{ background: activeTheme.colors.accent }}
          aria-hidden
        />
        {t("themePickerAction")}
      </button>

      {open && (
        <div className="theme-picker" role="listbox" aria-label={t("themePickerTitle")}>
          <div className="theme-picker-section-label">{t("themePickerBuiltin")}</div>
          <div className="theme-picker-list">
            {BUILTIN_THEME_LIST.map((meta) => {
              const theme = BUILTIN_THEMES[meta.id];
              const active = meta.id === activeThemeId;
              return (
                <button
                  key={meta.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`theme-picker-item${active ? " active" : ""}`}
                  onClick={() => {
                    saveEditorThemeId(meta.id);
                    onSelect(meta.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="theme-picker-dot"
                    style={{ background: theme?.colors.accent ?? meta.id }}
                    aria-hidden
                  />
                  <span className="theme-picker-name">{t(BUILTIN_THEME_NAME_KEYS[meta.id as keyof typeof BUILTIN_THEME_NAME_KEYS])}</span>
                  <span className="theme-picker-appearance">
                    {meta.appearance === "dark" ? t("themeAppearanceDark") : t("themeAppearanceLight")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
