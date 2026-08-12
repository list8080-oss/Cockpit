// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrchestrator, type UseOrchestratorDeps } from "./useOrchestrator";
import { mockInvoke, resetOrchestratorStorage } from "../testSupport/tauriInvokeMock";

function baseDeps(): UseOrchestratorDeps {
  return {
    locale: "ru",
    claudeModel: "claude-model",
    claudeEffort: "medium",
    codexModel: "codex-model",
    codexEffort: "medium",
    cursorModel: "cursor-model",
    opencodeModel: "opencode-model",
    opencodeEffort: "medium",
    refreshCodexLimits: () => {},
    setWorkspaceMode: () => {},
    setView: () => {},
  };
}

beforeEach(() => {
  resetOrchestratorStorage();
  mockInvoke();
});

describe("useOrchestrator — изоляция между перемонтированиями", () => {
  it("не тащит старые разговоры после очистки localStorage и ремонта хука", async () => {
    mockInvoke({
      run_claude: () => ({ text: "первый ответ", sessionId: "s-claude-1" }),
      run_codex: () => ({ text: "первый ответ", sessionId: "s-codex-1" }),
      run_cursor: () => ({ text: "первый ответ", sessionId: "s-cursor-1" }),
      run_opencode: () => ({ text: "первый ответ", sessionId: "s-opencode-1" }),
    });

    const first = renderHook(() => useOrchestrator(baseDeps()));
    act(() => {
      first.result.current.setPrompt("первый чат");
    });
    act(() => {
      first.result.current.send();
    });
    await waitFor(() => expect(first.result.current.claude.status).toBe("done"));
    expect(first.result.current.conversations.length).toBe(1);
    first.unmount();

    resetOrchestratorStorage();

    const second = renderHook(() => useOrchestrator(baseDeps()));
    await waitFor(() => expect(second.result.current.orchestratorContext).toBe("free"));
    expect(second.result.current.conversations).toEqual([]);
    expect(second.result.current.activeConversationId).toBeNull();
    expect(second.result.current.orchestratorMessages).toEqual([]);
  });
});
