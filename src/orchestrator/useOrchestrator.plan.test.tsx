// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrchestrator, type UseOrchestratorDeps } from "./useOrchestrator";
import { callsTo, mockInvoke, resetOrchestratorStorage } from "../testSupport/tauriInvokeMock";

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

describe("useOrchestrator — режим План (sendPlan)", () => {
  it("вызывает run_orchestrator_agent с mode: plan и добавляет agent_plan сообщение", async () => {
    mockInvoke({
      run_orchestrator_agent: () => ({
        text: "вот план из трёх шагов",
        sessionId: "plan-session-1",
        delegatedCalls: [],
      }),
    });

    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setPlanModeSafe(true);
      result.current.setPrompt("составь план рефакторинга");
    });
    act(() => {
      result.current.sendPlan();
    });

    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "agent_plan"),
      ).toBe(true);
    });

    const planMessage = result.current.orchestratorMessages.find(
      (m) => m.kind === "agent_plan",
    );
    expect(planMessage && "text" in planMessage ? planMessage.text : null).toBe(
      "вот план из трёх шагов",
    );
    expect(result.current.orchestratorPlanSessionId).toBe("plan-session-1");

    const calls = callsTo("run_orchestrator_agent");
    expect(calls).toHaveLength(1);
    expect((calls[0] as { mode?: string })?.mode).toBe("plan");

    // План — read-only режим: apply/rollback-команды не должны вызываться.
    expect(callsTo("apply_orchestrator_change")).toHaveLength(0);
  });

  it("при ошибке добавляет agent_plan_error и снимает orchestratorAgentBusy", async () => {
    mockInvoke({
      run_orchestrator_agent: () => Promise.reject(new Error("claude timeout")),
    });

    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    act(() => {
      result.current.setPlanModeSafe(true);
      result.current.setPrompt("составь план");
    });
    act(() => {
      result.current.sendPlan();
    });

    await waitFor(() => {
      expect(
        result.current.orchestratorMessages.some((m) => m.kind === "agent_plan_error"),
      ).toBe(true);
    });
    expect(result.current.orchestratorAgentBusy).toBe(false);
    expect(result.current.orchestratorPlanSessionId).toBeNull();
  });
});
