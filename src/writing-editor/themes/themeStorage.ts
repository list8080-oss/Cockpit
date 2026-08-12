import { BUILTIN_THEMES } from "./builtinThemes";

const STORAGE_KEY = "writing-editor-theme-id";

export type AppThemeHint = "normal" | "night" | "book";

export function defaultThemeIdFromApp(themeId?: AppThemeHint): string {
  if (themeId === "night") return "dark";
  if (themeId === "book") return "sepia-study";
  return "light";
}

export function loadEditorThemeId(themeId?: AppThemeHint): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in BUILTIN_THEMES) return stored;
  } catch {
    /* ignore */
  }
  return defaultThemeIdFromApp(themeId);
}

export function saveEditorThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function isEditorThemeId(id: string): id is keyof typeof BUILTIN_THEMES {
  return id in BUILTIN_THEMES;
}
