// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrchestrator, type UseOrchestratorDeps } from "./useOrchestrator";
import { callsTo, mockInvoke, resetOrchestratorStorage } from "../testSupport/tauriInvokeMock";
import { CONVERSATIONS_STORAGE_KEY, type AgentConversation } from "../conversations";

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

function readPersistedConversations(): AgentConversation[] {
  const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  // conversations.ts wraps the array in a {version, conversations} envelope.
  return Array.isArray(parsed) ? parsed : parsed.conversations ?? [];
}

beforeEach(() => {
  resetOrchestratorStorage();
  mockInvoke();
});

describe("useOrchestrator — Полный доступ (sendFullAccess)", () => {
  it("вызывает run_orchestrator_agent с mode: full и сохраняет sessionId", async () => {
    mockInvoke({
      run_orchestrator_agent: () => ({
        text: "готово, файл изменён",
        sessionId: "full-session-1",
        delegatedCalls: [],
      }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setFullAccessModeSafe(true);
      result.current.setPrompt("исправь баг в X");
    });
    act(() => {
      result.current.sendFullAccess();
    });

    expect(result.current.orchestratorAgentBusy).toBe(true);

    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "agent_full_access"),
      ).toBe(true);
    });

    expect(result.current.orchestratorAgentSessionId).toBe("full-session-1");
    expect(result.current.orchestratorAgentBusy).toBe(false);

    const calls = callsTo("run_orchestrator_agent");
    expect(calls).toHaveLength(1);
    expect((calls[0] as { mode?: string })?.mode).toBe("full");
  });

  it("добавляет delegation-сообщения для каждого delegatedCall", async () => {
    mockInvoke({
      run_orchestrator_agent: () => ({
        text: "готово",
        sessionId: "full-session-2",
        delegatedCalls: [
          { agent: "codex", command: "codex exec ...", output: "ok", isError: false },
        ],
      }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setFullAccessModeSafe(true);
      result.current.setPrompt("делегируй codex-у");
    });
    act(() => {
      result.current.sendFullAccess();
    });

    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "agent_delegation"),
      ).toBe(true);
    });
  });

  it("отказ run_orchestrator_agent: busy снимается, сообщение не остаётся зависшим", async () => {
    mockInvoke({
      run_orchestrator_agent: () => Promise.reject(new Error("claude CLI crashed")),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setFullAccessModeSafe(true);
      result.current.setPrompt("сделай что-нибудь");
    });
    act(() => {
      result.current.sendFullAccess();
    });
    expect(result.current.orchestratorAgentBusy).toBe(true);

    await waitFor(() => {
      expect(result.current.orchestratorAgentBusy).toBe(false);
    });
    expect(
      result.current.orchestratorMessages.some(
        (m) => m.kind === "agent_full_access_error",
      ),
    ).toBe(true);
    // sessionId остаётся прежним (null) — неудачный вызов не выдаёт себя за resumable сессию.
    expect(result.current.orchestratorAgentSessionId).toBeNull();
  });
});

describe("useOrchestrator — персистентность истории разговора", () => {
  it("после успешного ответа разговор реально записан в localStorage", async () => {
    mockInvoke({
      run_orchestrator_agent: () => ({
        text: "готово",
        sessionId: "full-session-3",
        delegatedCalls: [],
      }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setFullAccessModeSafe(true);
      result.current.setPrompt("запомни это на диск");
    });
    act(() => {
      result.current.sendFullAccess();
    });

    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "agent_full_access"),
      ).toBe(true);
    });

    const persisted = readPersistedConversations();
    expect(persisted).toHaveLength(1);
    const messages = persisted[0].orchestrator?.messages ?? [];
    expect(messages.some((m) => m.kind === "agent_full_access")).toBe(true);
    expect(messages.some((m) => m.kind === "user" && m.text === "запомни это на диск")).toBe(
      true,
    );
  });
});
