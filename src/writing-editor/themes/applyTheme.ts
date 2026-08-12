import type { ThemeDefinition } from "./themeTypes";
import { THEME_COLOR_KEYS } from "./themeTypes";

const WE_PREFIX: Record<string, string> = {
  bg: "--we-bg",
  "bg-2": "--we-bg-2",
  "bg-3": "--we-bg-3",
  border: "--we-border",
  text: "--we-text",
  "text-dim": "--we-text-dim",
  accent: "--we-accent",
  "accent-h": "--we-accent-h",
  "drop-line": "--we-drop-line",
  danger: "--we-danger",
  radius: "--we-radius",
};

/** Apply a built-in theme to the writing-editor root element. */
export function applyWritingEditorTheme(element: HTMLElement, theme: ThemeDefinition): void {
  for (const key of THEME_COLOR_KEYS) {
    const cssVar = WE_PREFIX[key];
    if (cssVar) {
      element.style.setProperty(cssVar, theme.colors[key]);
    }
  }
  element.dataset.editorTheme = theme.id;
  element.dataset.editorAppearance = theme.appearance;
}
