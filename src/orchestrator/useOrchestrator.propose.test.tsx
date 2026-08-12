// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrchestrator, type UseOrchestratorDeps } from "./useOrchestrator";
import { callsTo, mockInvoke, resetOrchestratorStorage } from "../testSupport/tauriInvokeMock";
import type { FileDiff } from "../conversations";

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

const CHANGES: FileDiff[] = [
  {
    path: "src/a.ts",
    oldContent: "old a",
    newContent: "new a",
    diff: "--- a/src/a.ts\n+++ b/src/a.ts\n-old a\n+new a",
  },
  {
    path: "src/b.ts",
    oldContent: "old b",
    newContent: "new b",
    diff: "--- a/src/b.ts\n+++ b/src/b.ts\n-old b\n+new b",
  },
];

beforeEach(() => {
  resetOrchestratorStorage();
  mockInvoke();
});

/** Sends one Propose-changes turn and returns the resulting message id. */
async function sendProposal(
  result: { current: ReturnType<typeof useOrchestrator> },
): Promise<string> {
  act(() => {
    result.current.setProposeModeSafe(true);
    result.current.setPrompt("вынеси хелпер");
  });
  act(() => {
    result.current.sendPropose();
  });
  await waitFor(() => {
    expect(
      result.current.orchestratorMessages.some((m) => m.kind === "agent_proposal"),
    ).toBe(true);
  });
  return result.current.orchestratorMessages.find((m) => m.kind === "agent_proposal")!
    .id;
}

describe("useOrchestrator — Предложение изменений (sendPropose + apply/rollback)", () => {
  it("получает diff по файлам от run_orchestrator_propose", async () => {
    mockInvoke({
      run_orchestrator_propose: () => ({
        summary: "вынес общую логику",
        changes: CHANGES,
        sessionId: "propose-session-1",
        delegatedCalls: [],
      }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));

    const messageId = await sendProposal(result);
    const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
    expect(message.proposalChanges).toHaveLength(2);
    expect(message.proposalChanges?.map((c) => c.path)).toEqual(["src/a.ts", "src/b.ts"]);
    expect(result.current.orchestratorProposeSessionId).toBe("propose-session-1");
  });

  it("apply одного файла обновляет только его статус, второй файл не трогает", async () => {
    mockInvoke({
      run_orchestrator_propose: () => ({
        summary: "вынес общую логику",
        changes: CHANGES,
        sessionId: "propose-session-1",
        delegatedCalls: [],
      }),
      apply_orchestrator_change: () => ({ journalId: "journal-a-1" }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));
    const messageId = await sendProposal(result);

    act(() => {
      result.current.applyProposalChange(messageId, "src/a.ts");
    });

    await waitFor(() => {
      const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
      expect(message.proposalChangeStatus?.["src/a.ts"]?.state).toBe("applied");
    });

    const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
    expect(message.proposalChangeStatus?.["src/a.ts"]).toEqual({
      state: "applied",
      journalId: "journal-a-1",
    });
    // Файл b.ts не участвовал в apply — его статус не должен появиться.
    expect(message.proposalChangeStatus?.["src/b.ts"]).toBeUndefined();

    const calls = callsTo("apply_orchestrator_change");
    expect(calls).toHaveLength(1);
    expect(
      (calls[0] as { request?: { path?: string } })?.request?.path,
    ).toBe("src/a.ts");
  });

  it("apply-ошибка одного файла не мешает применить другой", async () => {
    mockInvoke({
      run_orchestrator_propose: () => ({
        summary: "вынес общую логику",
        changes: CHANGES,
        sessionId: "propose-session-1",
        delegatedCalls: [],
      }),
      apply_orchestrator_change: (args) => {
        const path = (args as { request?: { path?: string } })?.request?.path;
        if (path === "src/a.ts") return Promise.reject(new Error("file changed on disk"));
        return { journalId: "journal-b-1" };
      },
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));
    const messageId = await sendProposal(result);

    act(() => {
      result.current.applyProposalChange(messageId, "src/a.ts");
      result.current.applyProposalChange(messageId, "src/b.ts");
    });

    await waitFor(() => {
      const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
      expect(message.proposalChangeStatus?.["src/a.ts"]?.state).toBe("applyError");
      expect(message.proposalChangeStatus?.["src/b.ts"]?.state).toBe("applied");
    });
  });

  it("rollback после apply восстанавливает статус rolledBack", async () => {
    mockInvoke({
      run_orchestrator_propose: () => ({
        summary: "вынес общую логику",
        changes: CHANGES,
        sessionId: "propose-session-1",
        delegatedCalls: [],
      }),
      apply_orchestrator_change: () => ({ journalId: "journal-a-1" }),
      rollback_orchestrator_change: () => null,
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));
    const messageId = await sendProposal(result);

    act(() => {
      result.current.applyProposalChange(messageId, "src/a.ts");
    });
    await waitFor(() => {
      const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
      expect(message.proposalChangeStatus?.["src/a.ts"]?.state).toBe("applied");
    });

    act(() => {
      result.current.rollbackProposalChange(messageId, "src/a.ts");
    });

    await waitFor(() => {
      const message = result.current.orchestratorMessages.find((m) => m.id === messageId)!;
      expect(message.proposalChangeStatus?.["src/a.ts"]?.state).toBe("rolledBack");
    });

    const rollbackCalls = callsTo("rollback_orchestrator_change");
    expect(rollbackCalls).toHaveLength(1);
    expect((rollbackCalls[0] as { journalId?: string })?.journalId).toBe("journal-a-1");
  });

  it("rollback без предварительного apply — no-op, invoke не вызывается", async () => {
    mockInvoke({
      run_orchestrator_propose: () => ({
        summary: "вынес общую логику",
        changes: CHANGES,
        sessionId: "propose-session-1",
        delegatedCalls: [],
      }),
    });
    const { result } = renderHook(() => useOrchestrator(baseDeps()));
    const messageId = await sendProposal(result);

    act(() => {
      result.current.rollbackProposalChange(messageId, "src/a.ts");
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(callsTo("rollback_orchestrator_change")).toHaveLength(0);
  });
});
