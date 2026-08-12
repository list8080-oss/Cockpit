/**
 * Shared test-only helpers for mocking `@tauri-apps/api/core`'s `invoke`.
 *
 * Usage in a test file:
 *
 *   vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
 *   import { mockInvoke, clearTestStorage } from "../testSupport/tauriInvokeMock";
 *
 *   beforeEach(() => {
 *     clearTestStorage();
 *     mockInvoke({ run_claude: () => ({ text: "hi", sessionId: "s1" }) });
 *   });
 *
 * `vi.mock` itself must stay in the test file (vitest hoists it statically —
 * it cannot be re-exported through a function call in this module).
 */
import type { Mock } from "vitest";
import { invoke } from "@tauri-apps/api/core";

export type InvokeArgs = Record<string, unknown> | undefined;
export type InvokeHandler = (args: InvokeArgs) => unknown;

/**
 * useOrchestrator fires these on every mount regardless of what a test
 * actually cares about (profile list/active id, then project path once a
 * profile resolves). Safe defaults so tests that aren't about profile
 * switching don't have to stub them individually.
 */
const MOUNT_DEFAULTS: Record<string, InvokeHandler> = {
  list_profiles: () => [{ id: "free_project" }],
  get_active_profile_id: () => "free_project",
  get_project_path: () => null,
  set_active_profile_id: () => null,
};

/**
 * (Re)configures the mocked `invoke`. Call in `beforeEach` (or inline in a
 * test) — each call replaces the previous implementation entirely, merged
 * over `MOUNT_DEFAULTS`. A command with no handler rejects loudly instead of
 * hanging a test indefinitely.
 */
export function mockInvoke(handlers: Record<string, InvokeHandler> = {}) {
  const merged = { ...MOUNT_DEFAULTS, ...handlers };
  const mocked = invoke as unknown as Mock;
  mocked.mockReset();
  mocked.mockImplementation((command: string, args?: InvokeArgs) => {
    const handler = merged[command];
    if (!handler) {
      return Promise.reject(new Error(`mockInvoke: no handler registered for "${command}"`));
    }
    try {
      return Promise.resolve(handler(args));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

/** All `[command, args]` pairs `invoke` was called with, in order. */
export function invokedCalls(): Array<[string, InvokeArgs]> {
  const mocked = invoke as unknown as Mock;
  return mocked.mock.calls as Array<[string, InvokeArgs]>;
}

/** `[command, args]` pairs for one specific command, in call order. */
export function callsTo(command: string): InvokeArgs[] {
  return invokedCalls()
    .filter(([c]) => c === command)
    .map(([, args]) => args);
}

/** Clears localStorage between tests — generic, used by any module. */
export function clearTestStorage() {
  localStorage.clear();
}

/**
 * Clears localStorage and forces the Orchestrator's "free" context, so tests
 * about send-mode mechanics don't also have to satisfy the
 * `orchestratorContext === "project" && !activeProfileProjectPath` gate.
 * The key string here must match `ORCHESTRATOR_CONTEXT_KEY` in
 * useOrchestrator.ts (not exported, so duplicated deliberately, not
 * imported around a private constant). Orchestrator-specific — other
 * modules' tests should use `clearTestStorage` instead.
 */
export function resetOrchestratorStorage() {
  clearTestStorage();
  localStorage.setItem("yar-cockpit.orchestratorContext", "free");
}
