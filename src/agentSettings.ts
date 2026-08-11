export interface AgentOption {
  value: string;
  label: string;
}

export const AGENT_SETTING_KEYS = {
  claudeModel: "yar-cockpit.claudeModel",
  claudeEffort: "yar-cockpit.claudeEffort",
  codexModel: "yar-cockpit.codexModel",
  codexEffort: "yar-cockpit.codexEffort",
  cursorModel: "yar-cockpit.cursorModel",
  opencodeModel: "yar-cockpit.opencodeModel",
  opencodeEffort: "yar-cockpit.opencodeEffort",
} as const;

export function loadAgentSetting(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function persistAgentSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function toAgentOptions(values: string[]): AgentOption[] {
  return values.map((v) => ({ value: v, label: v }));
}

// `claude --model` accepts an alias for "the latest" of each family (per
// `claude --help`), not a dated snapshot id — real, documented, and never
// goes stale, unlike hardcoding e.g. "claude-opus-5".
export const CLAUDE_MODEL_OPTIONS: AgentOption[] = [
  { value: "sonnet", label: "Sonnet" },
  { value: "opus", label: "Opus" },
  { value: "haiku", label: "Haiku" },
  { value: "fable", label: "Fable" },
];
export const CLAUDE_EFFORT_OPTIONS = toAgentOptions(["low", "medium", "high", "xhigh", "max"]);
// `codex` has no `--list-models` of its own; these five ids are the real,
// currently-used Codex model catalog (sourced from AIOS's own working
// chat-model list, not invented here).
export const CODEX_MODEL_OPTIONS: AgentOption[] = [
  { value: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
  { value: "gpt-5.6-terra", label: "GPT-5.6 Terra" },
  { value: "gpt-5.6-luna", label: "GPT-5.6 Luna" },
  { value: "gpt-5.3-codex-spark", label: "Spark" },
  { value: "gpt-5.5", label: "GPT-5.5" },
];
export const CODEX_EFFORT_OPTIONS = toAgentOptions(["low", "medium", "high"]);
// `opencode run --help` documents `--variant` as "provider-specific
// reasoning effort, e.g., high, max, minimal" — exactly these three, not a
// guessed superset.
export const OPENCODE_EFFORT_OPTIONS = toAgentOptions(["minimal", "high", "max"]);
