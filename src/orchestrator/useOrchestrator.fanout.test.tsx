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

describe("useOrchestrator — обычный фан-аут (send)", () => {
  it("рассылает всем движкам и собирает ответы", async () => {
    mockInvoke({
      run_claude: () => ({ text: "ответ claude", sessionId: "s-claude" }),
      run_codex: () => ({ text: "ответ codex", sessionId: "s-codex" }),
      run_cursor: () => ({ text: "ответ cursor", sessionId: "s-cursor" }),
      run_opencode: () => ({ text: "ответ opencode", sessionId: "s-opencode" }),
    });

    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setPrompt("привет всем");
    });
    act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.claude.status).toBe("done");
      expect(result.current.codex.status).toBe("done");
      expect(result.current.cursor.status).toBe("done");
      expect(result.current.opencode.status).toBe("done");
    });

    expect(result.current.claudeHistory[result.current.claudeHistory.length - 1]?.text).toBe("ответ claude");
    expect(result.current.codexHistory[result.current.codexHistory.length - 1]?.text).toBe("ответ codex");
    expect(result.current.cursorHistory[result.current.cursorHistory.length - 1]?.text).toBe("ответ cursor");
    expect(result.current.opencodeHistory[result.current.opencodeHistory.length - 1]?.text).toBe("ответ opencode");
    expect(result.current.claudeSessionId).toBe("s-claude");

    // Сообщение "выполнено" должно появиться в ленте Оркестратора.
    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "completed"),
      ).toBe(true);
    });
  });

  it("ошибка одного движка не роняет остальные", async () => {
    mockInvoke({
      run_claude: () => ({ text: "ответ claude", sessionId: "s-claude" }),
      run_codex: () => Promise.reject(new Error("codex CLI not installed")),
      run_cursor: () => ({ text: "ответ cursor", sessionId: "s-cursor" }),
      run_opencode: () => ({ text: "ответ opencode", sessionId: "s-opencode" }),
    });

    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setPrompt("привет всем");
    });
    act(() => {
      result.current.send();
    });

    await waitFor(() => {
      expect(result.current.claude.status).toBe("done");
      expect(result.current.cursor.status).toBe("done");
      expect(result.current.opencode.status).toBe("done");
      expect(result.current.codex.status).toBe("error");
    });

    expect(result.current.codex.status === "error" && result.current.codex.message).toContain(
      "codex CLI not installed",
    );
    // Успешные движки не откатились и не потеряли ответ из-за соседа.
    expect(result.current.claudeHistory[result.current.claudeHistory.length - 1]?.text).toBe("ответ claude");
  });

  it("не отправляет пустой prompt", async () => {
    mockInvoke({
      run_claude: () => ({ text: "не должно вызваться", sessionId: null }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.send();
    });

    // Дать микрозадачам шанс — если бы send() всё-таки пошёл, run_claude был бы вызван.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.claude.status).toBe("idle");
  });
});
