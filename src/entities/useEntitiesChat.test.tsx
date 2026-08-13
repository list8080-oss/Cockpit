// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import type { AgentFanoutModels } from "../orchestrator/types";
import { useEntitiesChat } from "./useEntitiesChat";
import { MEMORY_NOTE_MARKER } from "./memoryNote";
import { callsTo, clearTestStorage, mockInvoke } from "../testSupport/tauriInvokeMock";

function models(): AgentFanoutModels {
  return {
    claudeModel: "claude-model",
    claudeEffort: "medium",
    codexModel: "codex-model",
    codexEffort: "medium",
    cursorModel: "cursor-model",
    opencodeModel: "opencode-model",
    opencodeEffort: "medium",
  };
}

beforeEach(() => {
  clearTestStorage();
  mockInvoke({ read_entity_memory: () => "" });
});

describe("useEntitiesChat — sendUser", () => {
  it("appends only a user turn — nothing answers on its own", () => {
    const { result } = renderHook(() => useEntitiesChat(models()));

    act(() => {
      result.current.setDraft("привет всем");
    });
    act(() => {
      result.current.sendUser();
    });

    expect(result.current.history).toEqual([
      expect.objectContaining({ role: "user", text: "привет всем" }),
    ]);
    expect(result.current.draft).toBe("");
    expect(result.current.busyEntityId).toBe(null);
  });
});

describe("useEntitiesChat — respondAs", () => {
  it("does nothing when the conversation has no messages yet", () => {
    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => {
      result.current.respondAs("vera");
    });
    expect(result.current.history).toEqual([]);
  });

  it("sends the full rendered history + role instruction, and appends the reply tagged with the right entity", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      run_claude: () => ({ text: "Дела в порядке!", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => result.current.setDraft("вера как твои дела?"));
    act(() => result.current.sendUser());

    act(() => {
      result.current.respondAs("vera");
    });

    await waitFor(() => {
      expect(result.current.busyEntityId).toBe(null);
    });

    expect(result.current.history).toEqual([
      expect.objectContaining({ role: "user", text: "вера как твои дела?" }),
      expect.objectContaining({ role: "entity", entityId: "vera", text: "Дела в порядке!" }),
    ]);

    const claudeCalls = callsTo("run_claude");
    expect(claudeCalls).toHaveLength(1);
    const call = claudeCalls[0] as { prompt: string; context: string };
    expect(call.context).toBe("free");
    expect(call.prompt).toContain("Вера (Vera)");
    expect(call.prompt).toContain("Пользователь: вера как твои дела?");
  });

  it("folds the entity's own memory into the role instruction", async () => {
    mockInvoke({
      read_entity_memory: (args) =>
        args?.entityId === "argus" ? "Проект X: минимум пароля 12 символов." : "",
      run_claude: () => ({ text: "ok", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => result.current.setDraft("напомни про пароли"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("argus"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    const call = callsTo("run_claude")[0] as { prompt: string };
    expect(call.prompt).toContain("Проект X: минимум пароля 12 символов.");
  });

  it("only writes to memory when the reply carries a memory-note marker", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      run_claude: () => ({
        text: `Понял.\n\n${MEMORY_NOTE_MARKER}\nЗапомнить: решение принято.`,
        sessionId: null,
      }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => result.current.setDraft("финальное решение"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("orchestrator"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    // The marker itself never reaches the visible transcript.
    expect(result.current.history[result.current.history.length - 1]?.text).toBe("Понял.");

    const memoryCalls = callsTo("append_entity_memory");
    expect(memoryCalls).toEqual([{ entityId: "orchestrator", note: "Запомнить: решение принято." }]);
  });

  it("does not call append_entity_memory when there is no marker", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      run_claude: () => ({ text: "Просто ответ, без заметки.", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => result.current.setDraft("привет"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("vera"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    expect(callsTo("append_entity_memory")).toEqual([]);
  });

  it("leaves history unchanged when the call fails, and clears busy state", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      run_claude: () => {
        throw new Error("claude exited with an error");
      },
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    act(() => result.current.setDraft("привет"));
    act(() => result.current.sendUser());
    const beforeLength = result.current.history.length;

    act(() => result.current.respondAs("argus"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    expect(result.current.history).toHaveLength(beforeLength);
    expect(callsTo("append_entity_memory")).toEqual([]);
  });
});
