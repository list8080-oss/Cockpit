/** Shared auth / Codex limit shapes from the Tauri backend. */

export interface AuthStatus {
  id: string;
  label: string;
  installed: boolean;
  loggedIn: boolean;
  account: string | null;
  detail: string | null;
}

export type CodexLimitWindow = {
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: number | null;
};

export type CodexLimits = {
  available: boolean;
  fiveHour: CodexLimitWindow | null;
  weekly: CodexLimitWindow | null;
  planType: string | null;
  detail: string | null;
};
