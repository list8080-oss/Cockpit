import { t, type Locale, type MessageKey } from "./i18n";

/** Built-in project profile from `list_profiles` (Rust) — id only; label via i18n. */
export interface ProjectProfile {
  id: string;
}

const PROFILE_LABEL_KEYS: Record<string, MessageKey> = {
  manuscript: "profileManuscript",
  development: "profileDevelopment",
  free_project: "profileFreeProject",
};

export function profileLabel(locale: Locale, id: string): string {
  const key = PROFILE_LABEL_KEYS[id];
  return key ? t(locale, key) : id;
}
