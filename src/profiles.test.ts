import { describe, expect, it } from "vitest";
import { profileLabel } from "./profiles";
import type { Locale } from "./i18n";

describe("profileLabel", () => {
  it("localizes the manuscript profile on all locales", () => {
    const expected: Record<Locale, string> = {
      en: "Manuscript",
      ru: "Рукопись",
      uk: "Рукопис",
      cs: "Rukopis",
    };
    for (const locale of Object.keys(expected) as Locale[]) {
      expect(profileLabel(locale, "manuscript")).toBe(expected[locale]);
    }
  });

  it("returns unknown ids as-is", () => {
    expect(profileLabel("en", "future-profile")).toBe("future-profile");
  });
});
