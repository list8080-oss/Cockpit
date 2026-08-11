import { describe, expect, it } from "vitest";
import { agentPanelLamp, agentPanelStatusKey } from "./panelStatus";
import type { AgentAuthSnapshot } from "./types";

const readyAuth: AgentAuthSnapshot = {
  id: "claude",
  installed: true,
  loggedIn: true,
  account: "user",
};

describe("agentPanelLamp / agentPanelStatusKey", () => {
  it("marks missing CLI as offline / unavailable", () => {
    const auth = { ...readyAuth, installed: false, loggedIn: false };
    expect(agentPanelLamp(auth, { status: "idle" }, false)).toBe("offline");
    expect(agentPanelStatusKey(auth, { status: "idle" }, false)).toBe(
      "orchestratorStatusUnavailable",
    );
    expect(agentPanelLamp(undefined, { status: "idle" }, false)).toBe("offline");
  });

  it("marks installed but signed-out as attention / needs auth", () => {
    const auth = { ...readyAuth, loggedIn: false, account: null };
    expect(agentPanelLamp(auth, { status: "idle" }, false)).toBe("attention");
    expect(agentPanelStatusKey(auth, { status: "idle" }, false)).toBe(
      "orchestratorStatusNeedsAuth",
    );
  });

  it("marks signed-in idle/done as ready (done status key when done)", () => {
    expect(agentPanelLamp(readyAuth, { status: "idle" }, false)).toBe("ready");
    expect(agentPanelStatusKey(readyAuth, { status: "idle" }, false)).toBe(
      "orchestratorStatusReady",
    );
    expect(agentPanelLamp(readyAuth, { status: "done" }, false)).toBe("ready");
    expect(agentPanelStatusKey(readyAuth, { status: "done" }, false)).toBe(
      "orchestratorStatusDone",
    );
  });

  it("marks running as running", () => {
    expect(agentPanelLamp(readyAuth, { status: "running" }, false)).toBe("running");
    expect(agentPanelStatusKey(readyAuth, { status: "running" }, false)).toBe(
      "orchestratorStatusRunning",
    );
  });

  it("marks error as error", () => {
    const state = { status: "error" as const, message: "fail" };
    expect(agentPanelLamp(readyAuth, state, false)).toBe("error");
    expect(agentPanelStatusKey(readyAuth, state, false)).toBe(
      "orchestratorStatusError",
    );
  });

  it("treats authLoading as offline / checking", () => {
    expect(agentPanelLamp(readyAuth, { status: "idle" }, true)).toBe("offline");
    expect(agentPanelStatusKey(readyAuth, { status: "idle" }, true)).toBe(
      "authChecking",
    );
  });
});
