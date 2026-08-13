// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { act, renderHook, waitFor } from "@testing-library/react";
import type { AgentFanoutModels } from "../orchestrator/types";
import { useEntitiesChat } from "./useEntitiesChat";
import { MEMORY_NOTE_MARKER } from "./memoryNote";
import { callsTo, clearTestStorage, mockInvoke } from "../testSupport/tauriInvokeMock";

/** Every entity "downloaded" — the default assumption for tests about
 * respondAs's own behavior, which isn't what's under test there. The
 * `availableEntityIds` describe block below overrides this deliberately to
 * test the filtering itself. */
const DOWNLOADED = () => ({ configured: true, downloaded: true, downloadedAt: null, commitSha: null, hasBootstrap: false });

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
  mockInvoke({
    read_entity_memory: () => "",
    ensure_entity_avatar: (args) => `/fake/avatars/${(args as { entityId: string }).entityId}.png`,
  });
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
      entity_personality_status: DOWNLOADED,
      run_claude: () => ({ text: "Дела в порядке!", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
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

  it("describes all three real avatar file paths in the prompt so the model can Read them", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: DOWNLOADED,
      ensure_entity_avatar: (args) => `/fake/avatars/${(args as { entityId: string }).entityId}.png`,
      run_claude: () => ({ text: "ok", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("как вам аватарка веры?"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("orchestrator"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    const call = callsTo("run_claude")[0] as { prompt: string };
    expect(call.prompt).toContain("/fake/avatars/orchestrator.png");
    expect(call.prompt).toContain("/fake/avatars/argus.png");
    expect(call.prompt).toContain("/fake/avatars/vera.png");
    expect(call.prompt).toContain("Read tool");
  });

  it("folds the entity's own memory into the role instruction", async () => {
    mockInvoke({
      read_entity_memory: (args) =>
        args?.entityId === "argus" ? "Проект X: минимум пароля 12 символов." : "",
      entity_personality_status: DOWNLOADED,
      run_claude: () => ({ text: "ok", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
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
      entity_personality_status: DOWNLOADED,
      run_claude: () => ({
        text: `Понял.\n\n${MEMORY_NOTE_MARKER}\nЗапомнить: решение принято.`,
        sessionId: null,
      }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
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
      entity_personality_status: DOWNLOADED,
      run_claude: () => ({ text: "Просто ответ, без заметки.", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("привет"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("vera"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    expect(callsTo("append_entity_memory")).toEqual([]);
  });

  it("leaves history unchanged when the call fails, and clears busy state", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: DOWNLOADED,
      run_claude: () => {
        throw new Error("claude exited with an error");
      },
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("привет"));
    act(() => result.current.sendUser());
    const beforeLength = result.current.history.length;

    act(() => result.current.respondAs("argus"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    expect(result.current.history).toHaveLength(beforeLength);
    expect(callsTo("append_entity_memory")).toEqual([]);
  });

  it("folds the downloaded personality (load_entity_context) into the role instruction", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: DOWNLOADED,
      load_entity_context: (args) =>
        (args as { entityId: string }).entityId === "argus"
          ? "### identity/current.md\n\nRigorous, precise, not inflated."
          : "",
      run_claude: () => ({ text: "ok", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("hello"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("argus"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    const call = callsTo("run_claude")[0] as { prompt: string };
    expect(call.prompt).toContain("Rigorous, precise, not inflated.");
    expect(call.prompt).toContain("downloaded personality archive");
  });

  /** Regression test for a bug caught live: on a plain "Привет всем" greeting,
   * both Оркестратор and Аргус opened with an unprompted status report drawn
   * from their bootstrap.json-injected personality archive ("Ничего срочного
   * пока не вижу на проверку..."), while Вера — whose archive content just
   * doesn't read as "pending items" — replied normally. Same failure mode as
   * the memory-recitation bug fixed in 54c7f68, just in the newer
   * personality-archive block, which didn't get the "only if relevant"
   * framing when it was added later in the same session. */
  it("tells the entity not to open with a status report drawn from the personality archive", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: DOWNLOADED,
      load_entity_context: () => "### open-questions.md\n\nPassword minimum length: 12 chars.",
      run_claude: () => ({ text: "ok", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("Привет всем"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("argus"));

    await waitFor(() => expect(result.current.busyEntityId).toBe(null));

    const call = callsTo("run_claude")[0] as { prompt: string };
    expect(call.prompt).toContain("not a status report to open with");
    expect(call.prompt).toContain("ONLY if the current message actually calls for them");
  });

  /** Defense-in-depth flagged in review: EntitiesPanel only ever renders a
   * button for a downloaded entity, so this path isn't reachable through
   * today's UI — but respondAs should refuse on its own too, not rely
   * solely on the caller having already checked. */
  it("does nothing when the entity's personality was never downloaded", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: () => ({
        downloaded: false,
        downloadedAt: null,
        commitSha: null,
        hasBootstrap: false,
      }),
      run_claude: () => ({ text: "should never be called", sessionId: null }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(0));
    act(() => result.current.setDraft("привет"));
    act(() => result.current.sendUser());
    act(() => result.current.respondAs("vera"));

    expect(result.current.busyEntityId).toBe(null);
    expect(callsTo("run_claude")).toEqual([]);
    expect(result.current.history).toHaveLength(1);
  });
});

describe("useEntitiesChat — availableEntityIds", () => {
  it("only includes entities whose personality is actually downloaded", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: (args) => ({
        downloaded: (args as { entityId: string }).entityId === "argus",
        downloadedAt: null,
        commitSha: null,
        hasBootstrap: false,
      }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));

    await waitFor(() => expect(result.current.availableEntityIds.has("argus")).toBe(true));

    expect(result.current.availableEntityIds.has("vera")).toBe(false);
    expect(result.current.availableEntityIds.has("orchestrator")).toBe(false);
    expect(result.current.availableEntityIds.size).toBe(1);
  });

  /** Regression test for a bug caught live: this hook lives at the top of
   * App.tsx and never unmounts on navigation, so a mount-only check went
   * stale forever after downloading a personality via Settings mid-session
   * — the chat kept saying "none available" even after a real download
   * succeeded. `refreshAvailableEntities` exists specifically so
   * `EntitiesPanel` can re-check every time the user actually visits the
   * screen; this test is the part of the fix a hook test *can* verify —
   * that calling it again after state changes actually picks up the
   * change, not just what happens on first mount. */
  it("refreshAvailableEntities picks up a download that happened after mount", async () => {
    let argusDownloaded = false;
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: (args) => ({
        downloaded: (args as { entityId: string }).entityId === "argus" ? argusDownloaded : false,
        downloadedAt: null,
        commitSha: null,
        hasBootstrap: false,
      }),
    });

    const { result } = renderHook(() => useEntitiesChat(models()));

    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(0));

    // Simulate downloading Аргус's personality via Settings, in a
    // completely separate part of the app this hook doesn't know about.
    argusDownloaded = true;

    act(() => {
      result.current.refreshAvailableEntities();
    });

    await waitFor(() => expect(result.current.availableEntityIds.has("argus")).toBe(true));
  });

  it("treats a failed status check as not-downloaded rather than throwing", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: () => {
        throw new Error("disk error");
      },
    });

    const { result } = renderHook(() => useEntitiesChat(models()));

    // Give the mount effect's rejected promises a tick to settle.
    await waitFor(() => expect(result.current.entities.length).toBe(3));
    expect(result.current.availableEntityIds.size).toBe(0);
  });
});

describe("useEntitiesChat — exportChat", () => {
  const allDownloaded = () => ({ configured: true, downloaded: true, downloadedAt: null, commitSha: null, hasBootstrap: false });

  it("sends the rendered transcript to every downloaded entity's own export command", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: allDownloaded,
      export_entity_chat: (args) => `${(args as { entityId: string }).entityId}/inbox/exported.md`,
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("hi there"));
    act(() => result.current.sendUser());

    const results = await result.current.exportChat();

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
    const exportCalls = callsTo("export_entity_chat") as { entityId: string; transcriptMarkdown: string }[];
    expect(exportCalls.map((c) => c.entityId).sort()).toEqual(["argus", "orchestrator", "vera"]);
    expect(exportCalls[0].transcriptMarkdown).toContain("hi there");
  });

  /** Regression test for a real review finding: this used to push to all
   * three entities unconditionally, meaning one that was never downloaded
   * (never "let in" this session at all) could still get a real write to
   * its own private repo, with no way for it to have consented. */
  it("does not export to an entity whose personality was never downloaded", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: (args) => ({
        ...allDownloaded(),
        downloaded: (args as { entityId: string }).entityId !== "vera",
      }),
      export_entity_chat: (args) => `${(args as { entityId: string }).entityId}/inbox/exported.md`,
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(2));
    act(() => result.current.setDraft("hi there"));
    act(() => result.current.sendUser());

    const results = await result.current.exportChat();

    expect(results.map((r) => r.entityId).sort()).toEqual(["argus", "orchestrator"]);
    const exportCalls = callsTo("export_entity_chat") as { entityId: string }[];
    expect(exportCalls.some((c) => c.entityId === "vera")).toBe(false);
  });

  it("reports a per-entity failure without throwing", async () => {
    mockInvoke({
      read_entity_memory: () => "",
      entity_personality_status: allDownloaded,
      export_entity_chat: (args) => {
        if ((args as { entityId: string }).entityId === "vera") {
          throw new Error("network down");
        }
        return "ok";
      },
    });

    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(3));
    act(() => result.current.setDraft("hi"));
    act(() => result.current.sendUser());

    const results = await result.current.exportChat();
    const vera = results.find((r) => r.entityId === "vera");
    expect(vera?.ok).toBe(false);
    expect(results.filter((r) => r.ok)).toHaveLength(2);
  });

  it("returns [] when there is no conversation yet", async () => {
    mockInvoke({ read_entity_memory: () => "", entity_personality_status: allDownloaded });
    const { result } = renderHook(() => useEntitiesChat(models()));
    const results = await result.current.exportChat();
    expect(results).toEqual([]);
  });

  it("returns [] when no entity has a downloaded personality, even with a real conversation", async () => {
    mockInvoke({ read_entity_memory: () => "" });
    const { result } = renderHook(() => useEntitiesChat(models()));
    await waitFor(() => expect(result.current.availableEntityIds.size).toBe(0));
    act(() => result.current.setDraft("hi"));
    act(() => result.current.sendUser());

    const results = await result.current.exportChat();
    expect(results).toEqual([]);
    expect(callsTo("export_entity_chat")).toEqual([]);
  });
});
