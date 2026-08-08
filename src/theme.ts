export type Theme = "normal" | "night" | "book";

export const THEME_STORAGE_KEY = "yar-cockpit.theme";

export const THEMES: Theme[] = ["normal", "night", "book"];

export function isTheme(value: string): value is Theme {
  return THEMES.includes(value as Theme);
}

export function detectTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && isTheme(saved)) return saved;
  } catch {
    /* ignore */
  }
  return "normal";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme =
    theme === "night" ? "dark" : "light";
}
