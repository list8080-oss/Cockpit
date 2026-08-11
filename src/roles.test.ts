import { describe, expect, it } from "vitest";
import {
  roleInstruction,
  roleLabel,
  rolesForProfile,
} from "./roles";

const MANUSCRIPT_ROLE_IDS = [
  "scene-author",
  "style-editor",
  "canon-checker",
  "psychology-checker",
  "historical-accuracy-checker",
  "continuity-editor",
  "final-literary-editor",
] as const;

describe("rolesForProfile", () => {
  it("returns seven manuscript roles with expected ids", () => {
    const roles = rolesForProfile("manuscript");
    expect(roles.map((r) => r.id)).toEqual([...MANUSCRIPT_ROLE_IDS]);
    expect(roles).toHaveLength(7);
  });

  it("returns empty for unknown profile", () => {
    expect(rolesForProfile("unknown-profile")).toEqual([]);
  });

  it("returns empty for null profile", () => {
    expect(rolesForProfile(null)).toEqual([]);
  });
});

describe("roleLabel", () => {
  it("returns a non-empty localized label for a known role in all locales", () => {
    for (const locale of ["en", "ru", "uk", "cs"] as const) {
      const label = roleLabel(locale, "manuscript", "canon-checker");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  it("returns null for an unknown role id", () => {
    expect(roleLabel("en", "manuscript", "no-such-role")).toBeNull();
  });
});

describe("roleInstruction", () => {
  it("returns a non-empty instruction for a known role", () => {
    const text = roleInstruction("manuscript", "style-editor");
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  it("returns null for null role id", () => {
    expect(roleInstruction("manuscript", null)).toBeNull();
  });

  it("returns null for an unknown role id", () => {
    expect(roleInstruction("manuscript", "no-such-role")).toBeNull();
  });
});
