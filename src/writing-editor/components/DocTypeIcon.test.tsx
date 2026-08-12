// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocTypeIcon } from "./DocTypeIcon";

describe("DocTypeIcon (jsdom + RTL pipeline smoke test)", () => {
  it("renders the first letter of docType, uppercased", () => {
    render(<DocTypeIcon docType="chapter" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("falls back to '?' when docType is missing", () => {
    render(<DocTypeIcon />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});
