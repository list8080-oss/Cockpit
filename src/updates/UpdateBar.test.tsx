// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { checkMock } = vi.hoisted(() => ({ checkMock: vi.fn() }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: checkMock }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: vi.fn() }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: vi.fn().mockResolvedValue("0.4.9") }));

import { act, renderHook } from "@testing-library/react";
import { useAppUpdate } from "./UpdateBar";

beforeEach(() => {
  checkMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** run() awaits a real setTimeout between retries — advance fake timers
 * inside the same `act` so React sees every state update it produces. */
async function runAndFlush(run: () => Promise<void>) {
  const pending = run();
  await act(async () => {
    await vi.runAllTimersAsync();
    await pending;
  });
}

describe("useAppUpdate — retry on transient check failure", () => {
  it("retries the check up to 5 times and succeeds once the flakiness clears", async () => {
    checkMock
      .mockRejectedValueOnce(new Error("error sending request for url (...)"))
      .mockRejectedValueOnce(new Error("error sending request for url (...)"))
      .mockRejectedValueOnce(new Error("error sending request for url (...)"))
      .mockRejectedValueOnce(new Error("error sending request for url (...)"))
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAppUpdate("en"));
    await runAndFlush(result.current.run);

    expect(checkMock).toHaveBeenCalledTimes(5);
    expect(result.current.isError).toBe(false);
  });

  it("surfaces the error only after every retry attempt fails", async () => {
    checkMock.mockRejectedValue(new Error("error sending request for url (...)"));

    const { result } = renderHook(() => useAppUpdate("en"));
    await runAndFlush(result.current.run);

    expect(checkMock).toHaveBeenCalledTimes(5);
    expect(result.current.isError).toBe(true);
  });

  it("no retry needed — a clean first check doesn't call check() again", async () => {
    checkMock.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAppUpdate("en"));
    await runAndFlush(result.current.run);

    expect(checkMock).toHaveBeenCalledTimes(1);
    expect(result.current.isError).toBe(false);
  });
});
