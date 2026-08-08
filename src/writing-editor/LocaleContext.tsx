import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "../i18n";
import { weT, type WeMessageKey } from "./i18n";

const LocaleContext = createContext<Locale>("ru");

export function WritingEditorLocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useWeLocale(): Locale {
  return useContext(LocaleContext);
}

export function useWeT() {
  const locale = useWeLocale();
  return (key: WeMessageKey, vars?: Record<string, string | number>) => weT(locale, key, vars);
}
