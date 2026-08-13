// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react";
import { MetadataPanel } from "./MetadataPanel";
import type { NodeMetadata } from "../types";
import { callsTo, clearTestStorage, mockInvoke } from "../../testSupport/tauriInvokeMock";

function metadata(overrides: Partial<NodeMetadata> = {}): NodeMetadata {
  return { synopsis: null, tags: [], status: "draft", ...overrides };
}

beforeEach(() => {
  clearTestStorage();
  mockInvoke({
    update_writing_node_metadata_command: (args) => ({
      synopsis: (args as { synopsis: string | null })?.synopsis ?? null,
      tags: (args as { tags: string[] })?.tags ?? [],
      status: (args as { status: string })?.status ?? "draft",
    }),
  });
});

describe("MetadataPanel — сохранение при переключении документа", () => {
  it("правка синопсиса без клика «Сохранить» + переключение узла — правка не теряется", async () => {
    const onMetadataUpdated = vi.fn();
    const onToast = vi.fn();
    const { container, rerender } = render(
      <MetadataPanel
        projectPath="/tmp/project"
        nodeId="doc-1"
        metadata={metadata()}
        onMetadataUpdated={onMetadataUpdated}
        onToast={onToast}
      />,
    );

    const synopsisField = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(synopsisField, { target: { value: "несохранённый синопсис" } });

    rerender(
      <MetadataPanel
        projectPath="/tmp/project"
        nodeId="doc-2"
        metadata={metadata({ synopsis: "уже сохранённое" })}
        onMetadataUpdated={onMetadataUpdated}
        onToast={onToast}
      />,
    );

    await waitFor(() => {
      expect(callsTo("update_writing_node_metadata_command")).toHaveLength(1);
    });
    expect(callsTo("update_writing_node_metadata_command")[0]).toMatchObject({
      nodeId: "doc-1",
      synopsis: "несохранённый синопсис",
    });
    expect(onMetadataUpdated).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ synopsis: "несохранённый синопсис" }),
    );
  });

  it("нет правок — переключение узла не вызывает сохранение", async () => {
    const onMetadataUpdated = vi.fn();
    const { rerender } = render(
      <MetadataPanel
        projectPath="/tmp/project"
        nodeId="doc-1"
        metadata={metadata()}
        onMetadataUpdated={onMetadataUpdated}
        onToast={vi.fn()}
      />,
    );

    rerender(
      <MetadataPanel
        projectPath="/tmp/project"
        nodeId="doc-2"
        metadata={metadata()}
        onMetadataUpdated={onMetadataUpdated}
        onToast={vi.fn()}
      />,
    );

    await Promise.resolve();
    expect(callsTo("update_writing_node_metadata_command")).toHaveLength(0);
  });
});
