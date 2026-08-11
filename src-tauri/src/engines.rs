//! One-shot calls to the `claude`, `codex`, and `cursor-agent` CLIs, run with
//! cwd = the manuscript repo so all three pick up its `AGENTS.md`/`CLAUDE.md`/
//! skill automatically — same as the shared-shelf setup already used from a
//! terminal. Each call is a single non-interactive turn; optionally it can
//! resume a prior turn's session/thread id (returned alongside the reply) so
//! a follow-up stays in that engine's own context instead of starting cold.

use crate::bin_paths::{claude_bin, codex_bin, cursor_bin, opencode_bin};
use crate::manuscript::agent_workdir;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::path::{Component, Path, PathBuf};
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::process::Command;

/// Orchestrator context from the frontend: `project` (manuscript) or `free`
/// (app-data sandbox). Anything else falls back to project.
fn resolve_cwd(context: &str) -> Result<PathBuf, String> {
    agent_workdir(context)
}

/// A completed engine reply plus the session/thread id (if any) that a
/// follow-up call can pass back in to continue the same conversation.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineReply {
    pub text: String,
    pub session_id: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct ModelOption {
    pub id: String,
    pub label: String,
}

/// Cursor's actual model catalog, straight from the CLI (`--list-models`),
/// not a hand-picked subset — it changes often and this stays accurate
/// without needing to be updated here every time it does. Output is plain
/// text, one `<id> - <label>` pair per line, with a header and a trailing
/// "Tip: ..." line to skip.
#[tauri::command]
pub async fn list_cursor_models() -> Result<Vec<ModelOption>, String> {
    let output = Command::new(cursor_bin())
        .arg("--list-models")
        .output()
        .await
        .map_err(|e| format!("failed to run cursor-agent: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("cursor-agent exited with {}: {}", output.status, stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let models: Vec<ModelOption> = stdout
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with("Tip:") || line.starts_with("Available models") {
                return None;
            }
            let (id, label) = line.split_once(" - ")?;
            Some(ModelOption { id: id.trim().to_string(), label: label.trim().to_string() })
        })
        .collect();

    if models.is_empty() {
        return Err(format!("no models parsed from cursor-agent output:\n{}", stdout.trim()));
    }
    Ok(models)
}

/// Both `claude -p` and `cursor-agent` occasionally report `is_error: false`
/// with an empty `result` and zero output tokens — a silent failure on the
/// CLI's end, not a real (if terse) answer. Surface it as an error so the UI
/// shows "try again" instead of a copy button with nothing to copy.
fn require_nonempty(result: String, engine: &str) -> Result<String, String> {
    if result.trim().is_empty() {
        Err(format!("{engine} returned an empty response — try again"))
    } else {
        Ok(result)
    }
}

#[tauri::command]
pub async fn run_claude(
    prompt: String,
    session_id: Option<String>,
    model: String,
    effort: String,
    context: Option<String>,
) -> Result<EngineReply, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let mut cmd = Command::new(claude_bin());
    cmd.current_dir(&cwd).stdin(Stdio::null()).arg("-p");
    if let Some(sid) = &session_id {
        cmd.arg("-r").arg(sid);
    }
    if !model.is_empty() {
        cmd.arg("--model").arg(&model);
    }
    if !effort.is_empty() {
        cmd.arg("--effort").arg(&effort);
    }
    let output = cmd
        .arg(&prompt)
        // Unlike the other three engines, `claude -p` has full tool access
        // (including Write/Edit/Bash) by default with no confirmation prompt
        // in headless mode — verified empirically, it will write files
        // unprompted if asked to. `--disallowedTools` denies write-capable
        // tools while leaving Read/Grep/Glob available, matching the
        // read-only guarantee `run_codex`'s `-s read-only` and `run_cursor`'s
        // `--mode plan` already give. Deliberately not `--permission-mode
        // plan`: that also shifts the model into "present a plan" framing
        // (used on purpose in `run_orchestrator_plan`), which would be a
        // regression for ordinary chat/fan-out replies here.
        //
        // MUST come after `.arg(&prompt)`, not before: `--disallowedTools`
        // is a variadic Commander.js option (`<tools...>`) that greedily
        // consumes every following bare (non-`--flag`) argv token — placed
        // before the prompt, it silently swallows the prompt text itself
        // into the tools list, leaving `-p` with no prompt at all ("Input
        // must be provided either through stdin or as a prompt argument").
        // Confirmed empirically; regressed exactly this way once already.
        .arg("--disallowedTools")
        .arg("Bash,Write,Edit,NotebookEdit")
        .arg("--output-format")
        .arg("json")
        .output()
        .await
        .map_err(|e| format!("failed to run claude: {e}"))?;

    // `claude -p` exits non-zero for ordinary turn failures too (usage
    // limits, model errors) — same lesson already learned from `codex exec`
    // below: parse stdout's JSON first regardless of exit status, since it
    // has the real, human-readable reason (e.g. "You're out of usage
    // credits"); only fall back to the bare exit status when stdout has
    // nothing parseable at all.
    let stdout = String::from_utf8_lossy(&output.stdout);
    if let Ok(json) = serde_json::from_str::<Value>(stdout.trim()) {
        let is_error = json.get("is_error").and_then(Value::as_bool).unwrap_or(false);
        if let Some(result) = json.get("result").and_then(Value::as_str) {
            if is_error {
                return Err(result.to_string());
            }
            let text = require_nonempty(result.to_string(), "claude")?;
            let new_session_id = json.get("session_id").and_then(Value::as_str).map(str::to_string);
            return Ok(EngineReply { text, session_id: new_session_id });
        }
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!("claude exited with {}: {}", output.status, stderr.trim()))
}

/// Orchestrator agent modes ("Full access" / "Plan") — the intentional
/// exceptions to this project's read-only engine policy for the Orchestrator
/// column, allowed to write files and run mutating shell commands (unlike
/// `run_claude` above and the other three engines, all explicitly restricted
/// to read-only tool access):
///
/// - `"full"` (default): `--dangerously-skip-permissions` so headless `-p`
///   turns can write files and run shell commands without a TTY prompt.
/// - `"plan"`: `--permission-mode plan` — free Read/Bash investigation
///   (including sibling-CLI delegation), but no writes or mutating commands.
///
/// Flag names verified empirically against the installed CLI (`claude --help`
/// / `claude -p --help`, @anthropic-ai/claude-code 2.1.226):
/// `--dangerously-skip-permissions` ("Bypass all permission checks");
/// `--permission-mode plan` (one of acceptEdits/auto/bypassPermissions/manual/
/// dontAsk/plan). Resume uses the same `-r` / `--resume` as `run_claude`.
/// Do not reuse this for the Claude column or for Orchestrator synthesis —
/// those stay read-only.
///
/// Without extra framing, the model has no idea it's running with real tool
/// access rather than as a chat-only assistant — observed asking the user to
/// go run another engine manually instead of just invoking it itself via
/// Bash. `--append-system-prompt` corrects that (verified: `--help` lists it
/// as additive to the default system prompt, not a replacement).
///
/// `context` is `project` (manuscript cwd) or `free` (app-data sandbox).
///
/// The delegation paragraph (shared by all variants below) was added after
/// the model, even once it knew the sibling CLIs existed, still defaulted to
/// asking the user permission/clarification before actually running one —
/// it needs telling explicitly that deciding *and* delegating are its job,
/// not just knowing the binaries are there.
const ORCHESTRATOR_DELEGATION_PROMPT: &str = " You can act as a real coordinator, not just a single assistant: when a request is better served by splitting it across agents (one drafts, another reviews, another checks a specific angle), decide that yourself and actually run each agent's CLI in turn instead of asking the user which agent to use first. Each of these CLIs is itself a full agent, not a read-only question box — you can give them real subtasks, not only questions. Figure out each one's non-interactive flags yourself the way you'd learn any new CLI (read --help, try it, adjust on error) rather than assuming one will just work. Keep delegation proportionate — don't spin up all four agents for something one can answer directly.";

const ORCHESTRATOR_AGENT_SYSTEM_PROMPT_PROJECT: &str = "You are running as InPrincipio's Orchestrator in \"Full access\" mode: a real Claude Code agent session with full tool access (Read/Write/Edit/Bash/etc.) in the connected project/manuscript directory, not a restricted or read-only assistant. Stay focused on that project directory as your working context. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful, e.g. to test, compare, or delegate to them: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

const ORCHESTRATOR_AGENT_SYSTEM_PROMPT_FREE: &str = "You are running as InPrincipio's Orchestrator in \"Full access\" mode for free conversation (no manuscript project required): a real Claude Code agent session with full tool access (Read/Write/Edit/Bash/etc.) in InPrincipio's dedicated free-chat working directory — not the user's manuscript folder. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful, e.g. to test, compare, or delegate to them: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

const ORCHESTRATOR_PLAN_SYSTEM_PROMPT_PROJECT: &str = "You are running as InPrincipio's Orchestrator in \"Plan\" mode: you can freely read files and investigate via Bash (including delegating to sibling CLIs, same as in Full access) in the connected project/manuscript directory, but you cannot write, edit, or run mutating commands in this mode. End with a concrete, actionable plan for the user to review — don't just describe what you would need permission for. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful for investigation: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

const ORCHESTRATOR_PLAN_SYSTEM_PROMPT_FREE: &str = "You are running as InPrincipio's Orchestrator in \"Plan\" mode for free conversation (no manuscript project required): you can freely read files and investigate via Bash (including delegating to sibling CLIs, same as in Full access) in InPrincipio's dedicated free-chat working directory — not the user's manuscript folder — but you cannot write, edit, or run mutating commands in this mode. End with a concrete, actionable plan for the user to review — don't just describe what you would need permission for. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful for investigation: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

/// One real call the full-access agent made to a sibling CLI while working
/// on this turn — extracted from its own Bash tool calls so the user can see
/// exactly what was asked and what came back, not just a paraphrase.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DelegatedCall {
    /// Binary name as invoked (`codex`, `cursor-agent`, `opencode`, `claude`).
    pub agent: String,
    pub command: String,
    pub output: String,
    pub is_error: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrchestratorAgentReply {
    pub text: String,
    pub session_id: Option<String>,
    pub delegated_calls: Vec<DelegatedCall>,
}

const SIBLING_CLI_BINARIES: [&str; 4] = ["codex", "cursor-agent", "opencode", "claude"];
/// Cap on a single delegated call's captured output — the full-access agent
/// already read the whole thing to answer; the chat only needs enough to be
/// legible, not a second full dump of e.g. a huge `codex` transcript.
const DELEGATED_OUTPUT_LIMIT: usize = 4000;

/// The first whitespace-separated token of a Bash command, path-stripped —
/// used to recognize `codex ...`, `~/.local/bin/cursor-agent ...`, etc. as
/// calls to a sibling engine (rather than e.g. a passing mention of the word
/// in an argument, which `.contains()` alone would also match).
fn command_binary_name(command: &str) -> Option<&str> {
    let first = command.split_whitespace().next()?;
    Some(first.rsplit('/').next().unwrap_or(first))
}

fn truncate_for_chat(s: &str) -> String {
    if s.chars().count() <= DELEGATED_OUTPUT_LIMIT {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(DELEGATED_OUTPUT_LIMIT).collect();
        format!("{truncated}\n… (truncated)")
    }
}

/// Shared NDJSON walk for `--output-format stream-json --verbose`, used by
/// both `run_orchestrator_agent` and `run_orchestrator_propose`: tracks each
/// Bash `tool_use` against its later `tool_result` and, for calls to a
/// sibling CLI, records it as a `DelegatedCall`. `"result"` event lines are
/// handed back to the caller unparsed, since each mode's final-reply shape
/// differs (plain text vs. proposal JSON schema) — only the delegated-call
/// bookkeeping was actually identical between the two.
fn extract_delegated_calls(stdout: &str) -> (Vec<DelegatedCall>, Vec<Value>) {
    let mut pending_bash: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    let mut delegated_calls: Vec<DelegatedCall> = Vec::new();
    let mut result_events: Vec<Value> = Vec::new();

    for line in stdout.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else { continue };
        match event.get("type").and_then(Value::as_str) {
            Some("assistant") => {
                if let Some(blocks) = event.pointer("/message/content").and_then(Value::as_array) {
                    for block in blocks {
                        if block.get("type").and_then(Value::as_str) == Some("tool_use")
                            && block.get("name").and_then(Value::as_str) == Some("Bash")
                        {
                            if let (Some(id), Some(command)) = (
                                block.get("id").and_then(Value::as_str),
                                block.pointer("/input/command").and_then(Value::as_str),
                            ) {
                                pending_bash.insert(id.to_string(), command.to_string());
                            }
                        }
                    }
                }
            }
            Some("user") => {
                if let Some(blocks) = event.pointer("/message/content").and_then(Value::as_array) {
                    for block in blocks {
                        if block.get("type").and_then(Value::as_str) != Some("tool_result") {
                            continue;
                        }
                        let Some(tool_use_id) = block.get("tool_use_id").and_then(Value::as_str) else {
                            continue;
                        };
                        let Some(command) = pending_bash.remove(tool_use_id) else { continue };
                        let Some(bin) = command_binary_name(&command) else { continue };
                        if !SIBLING_CLI_BINARIES.contains(&bin) {
                            continue;
                        }
                        let output_text = match block.get("content") {
                            Some(Value::String(s)) => s.clone(),
                            Some(other) => other.to_string(),
                            None => String::new(),
                        };
                        let is_error = block.get("is_error").and_then(Value::as_bool).unwrap_or(false);
                        delegated_calls.push(DelegatedCall {
                            agent: bin.to_string(),
                            command,
                            output: truncate_for_chat(&output_text),
                            is_error,
                        });
                    }
                }
            }
            Some("result") => result_events.push(event),
            _ => {}
        }
    }

    (delegated_calls, result_events)
}

#[tauri::command]
pub async fn run_orchestrator_agent(
    prompt: String,
    session_id: Option<String>,
    model: String,
    effort: String,
    context: Option<String>,
    mode: Option<String>,
) -> Result<OrchestratorAgentReply, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let agent_mode = mode.unwrap_or_else(|| "full".into());
    let is_plan = agent_mode == "plan";
    let cwd = resolve_cwd(&ctx)?;
    // GUI-launched processes don't inherit the user's login-shell PATH, so a
    // bare `codex`/`cursor-agent`/`opencode` can report "command not found"
    // even though it's installed — the exact issue `resolve_bin`/`cursor_bin`
    // already work around for InPrincipio's own calls to these engines (see
    // above). The model's own Bash tool has the same PATH problem, so it
    // gets the same resolved, known-good paths instead of rediscovering them
    // by trial and error (observed failing outright on a bare `codex` call).
    let known_paths = format!(
        " On this Mac, GUI apps (including your own Bash tool) don't inherit the normal shell PATH — a bare command name can wrongly report \"command not found\" even though it's installed. If that happens, use these confirmed paths instead: claude -> {}, codex -> {}, cursor-agent -> {}, opencode -> {}.",
        claude_bin(),
        codex_bin(),
        cursor_bin(),
        opencode_bin(),
    );
    let system_prompt = if is_plan {
        if ctx == "free" {
            ORCHESTRATOR_PLAN_SYSTEM_PROMPT_FREE
        } else {
            ORCHESTRATOR_PLAN_SYSTEM_PROMPT_PROJECT
        }
    } else if ctx == "free" {
        ORCHESTRATOR_AGENT_SYSTEM_PROMPT_FREE
    } else {
        ORCHESTRATOR_AGENT_SYSTEM_PROMPT_PROJECT
    }
    .to_string()
        + ORCHESTRATOR_DELEGATION_PROMPT
        + &known_paths;
    let mut cmd = Command::new(claude_bin());
    cmd.current_dir(&cwd)
        .stdin(Stdio::null())
        .arg("-p");
    if is_plan {
        cmd.arg("--permission-mode").arg("plan");
    } else {
        cmd.arg("--dangerously-skip-permissions");
    }
    cmd.arg("--append-system-prompt").arg(&system_prompt);
    if let Some(sid) = &session_id {
        cmd.arg("-r").arg(sid);
    }
    if !model.is_empty() {
        cmd.arg("--model").arg(&model);
    }
    if !effort.is_empty() {
        cmd.arg("--effort").arg(&effort);
    }
    // `stream-json` (plus the `--verbose` it requires in `-p` mode) exposes
    // every tool_use/tool_result pair as its own NDJSON line, instead of
    // collapsing the whole turn into one final `result` string like plain
    // `json` does — that's what lets calls to sibling CLIs be pulled out
    // below and shown to the user as their own messages, not folded into
    // the agent's own summary of what it did.
    let output = cmd
        .arg(&prompt)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose")
        .output()
        .await
        .map_err(|e| format!("failed to run claude (orchestrator agent): {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let (delegated_calls, result_events) = extract_delegated_calls(&stdout);
    let mut final_result: Option<(bool, String, Option<String>)> = None; // (is_error, text, session_id)
    for event in &result_events {
        let is_error = event.get("is_error").and_then(Value::as_bool).unwrap_or(false);
        if let Some(result) = event.get("result").and_then(Value::as_str) {
            let sid = event.get("session_id").and_then(Value::as_str).map(str::to_string);
            final_result = Some((is_error, result.to_string(), sid));
        }
    }

    if let Some((is_error, text, sid)) = final_result {
        if is_error {
            return Err(text);
        }
        let text = require_nonempty(text, "claude (orchestrator agent)")?;
        return Ok(OrchestratorAgentReply { text, session_id: sid, delegated_calls });
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!(
        "claude (orchestrator agent) exited with {}: {}",
        output.status,
        stderr.trim()
    ))
}

/// JSON Schema passed to `claude -p --json-schema` for Propose-changes mode.
/// Verified empirically: works together with `--output-format stream-json
/// --verbose` and yields `structured_output` on the final `result` event
/// without writing files (`--permission-mode plan`).
const ORCHESTRATOR_PROPOSE_JSON_SCHEMA: &str = r#"{"type":"object","properties":{"summary":{"type":"string"},"changes":{"type":"array","items":{"type":"object","properties":{"path":{"type":"string"},"newContent":{"type":"string"}},"required":["path","newContent"]}}},"required":["summary","changes"]}"#;

const ORCHESTRATOR_PROPOSE_SYSTEM_PROMPT_PROJECT: &str = "You are running as InPrincipio's Orchestrator in \"Propose changes\" mode: you can freely read files and investigate via Bash (including delegating to sibling CLIs, same as in Plan mode) in the connected project/manuscript directory, but you cannot write, edit, or run mutating commands — the CLI enforces that via permission-mode plan. Instead of writing files yourself, return a structured proposal: `summary` is a short explanation of what and why; `changes` is a list of files, each with `path` (relative to your working directory only — no `..`, no leading `/`) and `newContent` (the FULL new file contents, not a patch or diff — InPrincipio computes the diff against the current file). Proposing a brand-new file is fine: same `path`/`newContent` fields. If nothing should change, return `changes: []` and explain why in `summary`. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful for investigation: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

const ORCHESTRATOR_PROPOSE_SYSTEM_PROMPT_FREE: &str = "You are running as InPrincipio's Orchestrator in \"Propose changes\" mode for free conversation (no manuscript project required): you can freely read files and investigate via Bash (including delegating to sibling CLIs, same as in Plan mode) in InPrincipio's dedicated free-chat working directory — not the user's manuscript folder — but you cannot write, edit, or run mutating commands — the CLI enforces that via permission-mode plan. Instead of writing files yourself, return a structured proposal: `summary` is a short explanation of what and why; `changes` is a list of files, each with `path` (relative to your working directory only — no `..`, no leading `/`) and `newContent` (the FULL new file contents, not a patch or diff — InPrincipio computes the diff against the current file). Proposing a brand-new file is fine: same `path`/`newContent` fields. If nothing should change, return `changes: []` and explain why in `summary`. This machine also has other CLI coding agents installed that you can invoke yourself directly via Bash whenever it's useful for investigation: `claude`, `codex`, `cursor-agent`, `opencode`. Don't tell the user to go run these manually or claim you lack access to them — just invoke the relevant binary via Bash and report the real result.";

#[derive(Deserialize)]
struct ProposedFileChange {
    path: String,
    #[serde(rename = "newContent")]
    new_content: String,
}

#[derive(Deserialize)]
struct ProposalStructuredOutput {
    summary: String,
    changes: Vec<ProposedFileChange>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub path: String,
    /// `None` if the file does not exist yet (agent proposes a new file).
    pub old_content: Option<String>,
    pub new_content: String,
    /// Unified diff, ready to display as-is.
    pub diff: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrchestratorProposal {
    pub summary: String,
    pub changes: Vec<FileDiff>,
    pub session_id: Option<String>,
    pub delegated_calls: Vec<DelegatedCall>,
}

/// Join `relative` onto `cwd` only if it cannot escape `cwd`: reject empty,
/// absolute, and any path containing `..` components. Nested relatives like
/// `src/foo.rs` are allowed. The target file need not exist (new-file proposals).
fn resolve_orchestrator_relative_path(cwd: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.is_empty() {
        return Err("orchestrator propose: empty path".into());
    }
    let path = Path::new(relative);
    if path.is_absolute() {
        return Err(format!(
            "orchestrator propose: absolute path rejected: {relative}"
        ));
    }
    for component in path.components() {
        if matches!(component, Component::ParentDir) {
            return Err(format!(
                "orchestrator propose: path escapes cwd (..): {relative}"
            ));
        }
    }
    Ok(cwd.join(path))
}

fn unified_diff_for(path: &str, old: &str, new: &str) -> String {
    let diff = similar::TextDiff::from_lines(old, new);
    let mut udiff = diff.unified_diff();
    udiff.header(path, path);
    udiff.to_string()
}

fn file_diff_from_proposal(cwd: &Path, change: ProposedFileChange) -> Result<FileDiff, String> {
    let resolved = resolve_orchestrator_relative_path(cwd, &change.path)?;
    let old_content = match std::fs::read_to_string(&resolved) {
        Ok(s) => Some(s),
        Err(_) => None,
    };
    let old = old_content.as_deref().unwrap_or("");
    let diff = unified_diff_for(&change.path, old, &change.new_content);
    Ok(FileDiff {
        path: change.path,
        old_content,
        new_content: change.new_content,
        diff,
    })
}

/// Orchestrator "Propose changes" — same investigation posture as Plan
/// (`--permission-mode plan`, no writes), but asks Claude for structured
/// `summary` + `changes` via `--json-schema` and returns file diffs for the
/// UI. Does **not** write any proposed paths (read-only for diff baselines).
#[tauri::command]
pub async fn run_orchestrator_propose(
    prompt: String,
    session_id: Option<String>,
    model: String,
    effort: String,
    context: Option<String>,
) -> Result<OrchestratorProposal, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let known_paths = format!(
        " On this Mac, GUI apps (including your own Bash tool) don't inherit the normal shell PATH — a bare command name can wrongly report \"command not found\" even though it's installed. If that happens, use these confirmed paths instead: claude -> {}, codex -> {}, cursor-agent -> {}, opencode -> {}.",
        claude_bin(),
        codex_bin(),
        cursor_bin(),
        opencode_bin(),
    );
    let system_prompt = if ctx == "free" {
        ORCHESTRATOR_PROPOSE_SYSTEM_PROMPT_FREE
    } else {
        ORCHESTRATOR_PROPOSE_SYSTEM_PROMPT_PROJECT
    }
    .to_string()
        + ORCHESTRATOR_DELEGATION_PROMPT
        + &known_paths;

    let mut cmd = Command::new(claude_bin());
    cmd.current_dir(&cwd)
        .stdin(Stdio::null())
        .arg("-p")
        .arg("--permission-mode")
        .arg("plan")
        .arg("--json-schema")
        .arg(ORCHESTRATOR_PROPOSE_JSON_SCHEMA)
        .arg("--append-system-prompt")
        .arg(&system_prompt);
    if let Some(sid) = &session_id {
        cmd.arg("-r").arg(sid);
    }
    if !model.is_empty() {
        cmd.arg("--model").arg(&model);
    }
    if !effort.is_empty() {
        cmd.arg("--effort").arg(&effort);
    }
    let output = cmd
        .arg(&prompt)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose")
        .output()
        .await
        .map_err(|e| format!("failed to run claude (orchestrator propose): {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let (delegated_calls, result_events) = extract_delegated_calls(&stdout);
    let mut final_error: Option<(String, Option<String>)> = None;
    let mut final_ok: Option<(ProposalStructuredOutput, Option<String>)> = None;
    for event in &result_events {
        let is_error = event
            .get("is_error")
            .and_then(Value::as_bool)
            .unwrap_or(false);
        let sid = event
            .get("session_id")
            .and_then(Value::as_str)
            .map(str::to_string);
        if is_error {
            let text = event
                .get("result")
                .and_then(Value::as_str)
                .unwrap_or("orchestrator propose failed")
                .to_string();
            final_error = Some((text, sid));
            continue;
        }
        let Some(so_value) = event.get("structured_output") else {
            return Err("orchestrator propose: missing/invalid structured_output".into());
        };
        match serde_json::from_value::<ProposalStructuredOutput>(so_value.clone()) {
            Ok(parsed) => final_ok = Some((parsed, sid)),
            Err(_) => {
                return Err("orchestrator propose: missing/invalid structured_output".into());
            }
        }
    }

    if let Some((text, _)) = final_error {
        return Err(text);
    }

    let Some((parsed, sid)) = final_ok else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "claude (orchestrator propose) exited with {}: {}",
            output.status,
            stderr.trim()
        ));
    };

    let mut changes = Vec::with_capacity(parsed.changes.len());
    for change in parsed.changes {
        changes.push(file_diff_from_proposal(&cwd, change)?);
    }

    Ok(OrchestratorProposal {
        summary: parsed.summary,
        changes,
        session_id: sid,
        delegated_calls,
    })
}

// --- Propose apply / rollback + append-only journal (stage 4b) -------------

static JOURNAL_SEQ: AtomicU64 = AtomicU64::new(0);

fn next_journal_id() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let seq = JOURNAL_SEQ.fetch_add(1, Ordering::Relaxed);
    format!("{millis}-{seq}")
}

fn utc_timestamp_now() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Compact UTC approximation without an extra time crate (sortable, unique enough).
    let days = secs / 86_400;
    let time = secs % 86_400;
    let hour = time / 3600;
    let min = (time % 3600) / 60;
    let sec = time % 60;
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days as i64 + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{y:04}-{m:02}-{d:02}T{hour:02}:{min:02}:{sec:02}Z")
}

/// App-data directory for Orchestrator journal (and siblings). Overridable via
/// `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` so unit tests never touch the real
/// Application Support tree.
fn orchestrator_data_dir() -> Result<PathBuf, String> {
    if let Ok(override_dir) = std::env::var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR") {
        let dir = PathBuf::from(override_dir);
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("cannot create orchestrator data directory: {e}"))?;
        return Ok(dir);
    }
    let base = dirs::data_dir().ok_or("data directory unavailable")?;
    let dir = base.join("yar-cockpit");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("cannot create orchestrator data directory: {e}"))?;
    Ok(dir)
}

fn journal_file_path() -> Result<PathBuf, String> {
    Ok(orchestrator_data_dir()?.join("orchestrator-journal.jsonl"))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub id: String,
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
    /// Active profile id at apply time (`"manuscript"`/`"development"`/
    /// `"free_project"`) — only set for `context == "project"` entries.
    /// `context == "free"` has no profile; older entries written before this
    /// field existed simply won't have it (`#[serde(default)]`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub profile_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub old_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub new_content: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rolled_back_id: Option<String>,
    pub timestamp: String,
}

fn read_journal_entries(journal: &Path) -> Result<Vec<JournalEntry>, String> {
    if !journal.exists() {
        return Ok(Vec::new());
    }
    let file = std::fs::File::open(journal)
        .map_err(|e| format!("failed to open orchestrator journal: {e}"))?;
    let mut out = Vec::new();
    for line in BufReader::new(file).lines() {
        let line = line.map_err(|e| format!("failed to read orchestrator journal: {e}"))?;
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let entry: JournalEntry = serde_json::from_str(trimmed)
            .map_err(|e| format!("corrupt orchestrator journal line: {e}"))?;
        out.push(entry);
    }
    Ok(out)
}

fn append_journal_entry(journal: &Path, entry: &JournalEntry) -> Result<(), String> {
    if let Some(parent) = journal.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("cannot create journal directory: {e}"))?;
    }
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(journal)
        .map_err(|e| format!("failed to open orchestrator journal for append: {e}"))?;
    let line = serde_json::to_string(entry)
        .map_err(|e| format!("failed to serialize journal entry: {e}"))?;
    writeln!(file, "{line}").map_err(|e| format!("failed to write journal entry: {e}"))?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyChangeRequest {
    pub context: Option<String>,
    pub path: String,
    pub old_content: Option<String>,
    pub new_content: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppliedChange {
    pub journal_id: String,
}

fn check_apply_freshness(
    resolved: &Path,
    old_content: &Option<String>,
) -> Result<(), String> {
    match old_content {
        Some(expected) => match std::fs::read_to_string(resolved) {
            Err(_) => Err(
                "file no longer exists — the proposal is stale, ask again".into(),
            ),
            Ok(actual) if actual == *expected => Ok(()),
            Ok(_) => Err(
                "file changed on disk since the proposal was generated — ask again before applying"
                    .into(),
            ),
        },
        None => {
            if resolved.exists() {
                Err("file already exists — the proposal is stale, ask again".into())
            } else {
                Ok(())
            }
        }
    }
}

fn apply_change_with_journal(
    request: ApplyChangeRequest,
    journal: &Path,
) -> Result<AppliedChange, String> {
    let ctx = request.context.clone().unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let resolved = resolve_orchestrator_relative_path(&cwd, &request.path)?;
    check_apply_freshness(&resolved, &request.old_content)?;
    if let Some(parent) = resolved.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("failed to create parent directories: {e}"))?;
        }
    }
    std::fs::write(&resolved, &request.new_content)
        .map_err(|e| format!("failed to write {}: {e}", resolved.display()))?;

    let journal_id = next_journal_id();
    let profile_id = if ctx == "project" { Some(crate::profiles::active_profile_id()) } else { None };
    let entry = JournalEntry {
        id: journal_id.clone(),
        kind: "apply".into(),
        context: Some(ctx),
        profile_id,
        path: Some(request.path),
        old_content: request.old_content,
        new_content: Some(request.new_content),
        rolled_back_id: None,
        timestamp: utc_timestamp_now(),
    };
    append_journal_entry(journal, &entry)?;
    Ok(AppliedChange { journal_id })
}

#[tauri::command]
pub async fn apply_orchestrator_change(
    request: ApplyChangeRequest,
) -> Result<AppliedChange, String> {
    let journal = journal_file_path()?;
    apply_change_with_journal(request, &journal)
}

fn rollback_change_with_journal(journal_id: &str, journal: &Path) -> Result<(), String> {
    let entries = read_journal_entries(journal)?;
    let apply_entry = entries
        .iter()
        .find(|e| e.kind == "apply" && e.id == journal_id)
        .cloned()
        .ok_or_else(|| "unknown journal entry".to_string())?;

    if entries.iter().any(|e| {
        e.kind == "rollback" && e.rolled_back_id.as_deref() == Some(journal_id)
    }) {
        return Err("already rolled back".into());
    }

    let ctx = apply_entry
        .context
        .as_deref()
        .unwrap_or("project");
    let path = apply_entry
        .path
        .as_deref()
        .ok_or_else(|| "journal apply entry missing path".to_string())?;
    let new_content = apply_entry
        .new_content
        .as_deref()
        .ok_or_else(|| "journal apply entry missing newContent".to_string())?;

    let cwd = resolve_cwd(ctx)?;
    let resolved = resolve_orchestrator_relative_path(&cwd, path)?;

    match std::fs::read_to_string(&resolved) {
        Ok(actual) if actual == new_content => {}
        Ok(_) => {
            return Err(
                "file changed since it was applied — refusing to roll back automatically".into(),
            );
        }
        Err(_) => {
            // File missing while we expected the applied content — treat as drift.
            return Err(
                "file changed since it was applied — refusing to roll back automatically".into(),
            );
        }
    }

    match &apply_entry.old_content {
        None => {
            std::fs::remove_file(&resolved)
                .map_err(|e| format!("failed to remove {}: {e}", resolved.display()))?;
        }
        Some(old) => {
            std::fs::write(&resolved, old)
                .map_err(|e| format!("failed to restore {}: {e}", resolved.display()))?;
        }
    }

    let entry = JournalEntry {
        id: next_journal_id(),
        kind: "rollback".into(),
        context: None,
        profile_id: None,
        path: None,
        old_content: None,
        new_content: None,
        rolled_back_id: Some(journal_id.to_string()),
        timestamp: utc_timestamp_now(),
    };
    append_journal_entry(journal, &entry)?;
    Ok(())
}

#[tauri::command]
pub async fn rollback_orchestrator_change(journal_id: String) -> Result<(), String> {
    let journal = journal_file_path()?;
    rollback_change_with_journal(&journal_id, &journal)
}

/// Every apply/rollback entry ever recorded, across every conversation and
/// profile — the frontend derives display rows (pairing each apply with its
/// rollback, if any) and filters by profile itself; this just hands back the
/// raw log. Not paginated: a single user's realistic lifetime volume of
/// applied changes is small enough that this isn't worth the complexity yet.
#[tauri::command]
pub fn list_orchestrator_journal() -> Result<Vec<JournalEntry>, String> {
    let journal = journal_file_path()?;
    read_journal_entries(&journal)
}

/// `--mode plan` is Cursor's read-only planning mode (analyze, propose a
/// plan, no edits, no shell) — same safety posture as `ask` but with more
/// room to reason before answering, matching the other two engines here,
/// which are only ever asked to transform pasted text, not to touch the
/// manuscript files. A follow-up (`session_id` set) uses `--resume` instead —
/// the mode is fixed by the session it's resuming, so `--mode` is dropped.
#[tauri::command]
pub async fn run_cursor(
    prompt: String,
    session_id: Option<String>,
    model: String,
    context: Option<String>,
) -> Result<EngineReply, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let mut cmd = Command::new(cursor_bin());
    cmd.current_dir(&cwd).stdin(Stdio::null()).arg("--print");
    if let Some(sid) = &session_id {
        cmd.arg("--resume").arg(sid);
    } else {
        cmd.arg("--mode").arg("plan");
    }
    if !model.is_empty() {
        cmd.arg("--model").arg(&model);
    }
    let output = cmd
        .arg("--trust")
        .arg("--output-format")
        .arg("json")
        .arg(&prompt)
        .output()
        .await
        .map_err(|e| format!("failed to run cursor-agent: {e}"))?;

    // Same lesson as claude/codex: a non-zero exit can still carry a real,
    // human-readable reason in stdout's JSON — parse that first.
    let stdout = String::from_utf8_lossy(&output.stdout);
    if let Ok(json) = serde_json::from_str::<Value>(stdout.trim()) {
        let is_error = json.get("is_error").and_then(Value::as_bool).unwrap_or(false);
        if let Some(result) = json.get("result").and_then(Value::as_str) {
            if is_error {
                return Err(result.to_string());
            }
            let text = require_nonempty(result.to_string(), "cursor-agent")?;
            let new_session_id = json.get("session_id").and_then(Value::as_str).map(str::to_string);
            return Ok(EngineReply { text, session_id: new_session_id });
        }
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(format!("cursor-agent exited with {}: {}", output.status, stderr.trim()))
}

/// A follow-up (`session_id` set) uses the `exec resume` subcommand, which
/// only takes a `-c sandbox_mode=read-only` config override — it has no
/// `-s`/`--sandbox` flag of its own — to keep the same read-only guarantee
/// as a fresh `exec -s read-only` call.
#[tauri::command]
pub async fn run_codex(
    prompt: String,
    session_id: Option<String>,
    model: String,
    effort: String,
    context: Option<String>,
) -> Result<EngineReply, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let model = if model.is_empty() { "gpt-5.6-sol".to_string() } else { model };
    let mut cmd = Command::new(codex_bin());
    cmd.current_dir(&cwd).stdin(Stdio::null());
    if let Some(sid) = &session_id {
        cmd.arg("exec").arg("resume").arg("--json").arg("-c").arg("sandbox_mode=read-only");
        if !effort.is_empty() {
            cmd.arg("-c").arg(format!("model_reasoning_effort={effort}"));
        }
        cmd.arg("--skip-git-repo-check")
            .arg("--ignore-user-config")
            .arg("-m")
            .arg(&model)
            .arg(sid)
            .arg(&prompt);
    } else {
        cmd.arg("exec").arg("--json").arg("-s").arg("read-only");
        if !effort.is_empty() {
            cmd.arg("-c").arg(format!("model_reasoning_effort={effort}"));
        }
        // Skips `~/.codex/config.toml` (marketplaces/plugins/MCP servers) —
        // those expect a local app-server that isn't running in headless
        // one-shot calls and otherwise crash the turn with a transport error.
        // Auth still comes from CODEX_HOME, so login is unaffected.
        cmd.arg("--skip-git-repo-check")
            .arg("--ignore-user-config")
            .arg("-m")
            .arg(&model)
            .arg(&prompt);
    }
    let output = cmd.output().await.map_err(|e| format!("failed to run codex: {e}"))?;

    // `codex exec` exits with status 1 for ordinary turn failures (rate
    // limits, refusals, etc.), not just crashes — the real explanation is a
    // structured event on stdout, so that's parsed first regardless of exit
    // status. Exit status + stderr are only the fallback when stdout has
    // nothing recognizable at all (an actual crash, e.g. binary not found).
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut messages = Vec::new();
    let mut thread_id: Option<String> = None;
    for line in stdout.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else { continue };
        match event.get("type").and_then(Value::as_str) {
            Some("thread.started") => {
                thread_id = event.get("thread_id").and_then(Value::as_str).map(str::to_string);
            }
            Some("item.completed") => {
                let item = event.get("item");
                if item.and_then(|i| i.get("type")).and_then(Value::as_str) == Some("agent_message") {
                    if let Some(text) = item.and_then(|i| i.get("text")).and_then(Value::as_str) {
                        messages.push(text.to_string());
                    }
                }
            }
            Some("turn.failed") | Some("error") => {
                let msg = event
                    .get("message")
                    .or_else(|| event.get("error").and_then(|e| e.get("message")))
                    .and_then(Value::as_str)
                    .unwrap_or("codex turn failed");
                return Err(msg.to_string());
            }
            _ => {}
        }
    }

    if !messages.is_empty() {
        return Ok(EngineReply { text: messages.join("\n\n"), session_id: thread_id });
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("codex exited with {}: {}", output.status, stderr.trim()));
    }

    Err(format!("no reply from codex:\n{}", stdout.trim()))
}

/// A real, confirmed-working free model (used when `model` is empty) —
/// letting OpenCode fall back to its own default silently would hit a paid
/// one instead (verified: an unset model tried billed OpenCode Zen usage
/// and failed with "Insufficient balance").
const OPENCODE_DEFAULT_FREE_MODEL: &str = "opencode/deepseek-v4-flash-free";

/// OpenCode's model catalog, from `opencode models` — like Cursor, this
/// changes often on their end, so it's fetched live rather than hand-picked.
/// Filtered to only `-free`-suffixed ids: OpenCode Zen's non-free models are
/// billed against the user's own account balance, and the whole point of
/// this list (per the author's request) is that picking from it can never
/// accidentally trigger a charge.
#[tauri::command]
pub async fn list_opencode_models() -> Result<Vec<ModelOption>, String> {
    let output = Command::new(opencode_bin())
        .arg("models")
        .output()
        .await
        .map_err(|e| format!("failed to run opencode: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("opencode exited with {}: {}", output.status, stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let models: Vec<ModelOption> = stdout
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && l.ends_with("-free"))
        .map(|id| ModelOption { id: id.to_string(), label: id.to_string() })
        .collect();

    if models.is_empty() {
        return Err(format!("no free models parsed from opencode output:\n{}", stdout.trim()));
    }
    Ok(models)
}

/// `--agent plan` is OpenCode's built-in read-only planning agent — verified
/// empirically before wiring this up: asked it (via a throwaway temp dir) to
/// create a file, and it refused outright ("I can't write the file while in
/// plan mode (read-only)"), no file appeared. Same safety posture as the
/// other three engines here.
#[tauri::command]
pub async fn run_opencode(
    prompt: String,
    session_id: Option<String>,
    model: String,
    effort: String,
    context: Option<String>,
) -> Result<EngineReply, String> {
    let ctx = context.unwrap_or_else(|| "project".into());
    let cwd = resolve_cwd(&ctx)?;
    let model = if model.is_empty() { OPENCODE_DEFAULT_FREE_MODEL.to_string() } else { model };
    let mut cmd = Command::new(opencode_bin());
    cmd.current_dir(&cwd).stdin(Stdio::null()).arg("run").arg("--agent").arg("plan");
    if let Some(sid) = &session_id {
        cmd.arg("-s").arg(sid);
    }
    cmd.arg("-m").arg(&model);
    if !effort.is_empty() {
        cmd.arg("--variant").arg(&effort);
    }
    let output = cmd
        .arg("--format")
        .arg("json")
        .arg(&prompt)
        .output()
        .await
        .map_err(|e| format!("failed to run opencode: {e}"))?;

    // Like the other engines, parse stdout first — a failed turn (e.g. an
    // API/billing error) still exits non-zero, but the real explanation is a
    // structured `"type":"error"` event on stdout.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut messages = Vec::new();
    let mut session: Option<String> = None;
    for line in stdout.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else { continue };
        if session.is_none() {
            session = event.get("sessionID").and_then(Value::as_str).map(str::to_string);
        }
        match event.get("type").and_then(Value::as_str) {
            Some("text") => {
                if let Some(text) =
                    event.get("part").and_then(|p| p.get("text")).and_then(Value::as_str)
                {
                    messages.push(text.to_string());
                }
            }
            Some("error") => {
                let msg = event
                    .get("error")
                    .and_then(|e| e.get("data"))
                    .and_then(|d| d.get("message"))
                    .and_then(Value::as_str)
                    .unwrap_or("opencode turn failed");
                return Err(msg.to_string());
            }
            _ => {}
        }
    }

    if !messages.is_empty() {
        let text = require_nonempty(messages.join("\n\n"), "opencode")?;
        return Ok(EngineReply { text, session_id: session });
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("opencode exited with {}: {}", output.status, stderr.trim()));
    }

    Err(format!("no reply from opencode:\n{}", stdout.trim()))
}

#[cfg(test)]
mod propose_path_tests {
    use super::{
        apply_change_with_journal, file_diff_from_proposal, list_orchestrator_journal,
        read_journal_entries, resolve_orchestrator_relative_path, rollback_change_with_journal,
        ApplyChangeRequest, ProposedFileChange,
    };
    use crate::test_env_lock::ENV_LOCK;
    use std::path::PathBuf;

    fn temp_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "cockpit-{label}-{}-{}",
            std::process::id(),
            super::JOURNAL_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
        ));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    /// Points `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` (and therefore both
    /// `free_chat_root()` and the journal file) at a fresh temp directory for
    /// the lifetime of the guard, so apply/rollback tests never touch the
    /// real Application Support tree. Holds `ENV_LOCK` until dropped.
    struct FreeSandbox<'a> {
        _guard: std::sync::MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl FreeSandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let root = temp_dir(label);
            std::env::set_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR", &root);
            Self { _guard: guard, root }
        }

        fn journal_path(&self) -> PathBuf {
            self.root.join("orchestrator-journal.jsonl")
        }

        fn free_cwd(&self) -> PathBuf {
            crate::manuscript::free_chat_root().unwrap()
        }
    }

    impl Drop for FreeSandbox<'_> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR");
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn rejects_empty_absolute_and_parent_dir() {
        let cwd = PathBuf::from("/tmp/propose-cwd");
        assert!(resolve_orchestrator_relative_path(&cwd, "").is_err());
        assert!(resolve_orchestrator_relative_path(&cwd, "/etc/passwd").is_err());
        assert!(resolve_orchestrator_relative_path(&cwd, "../escape.txt").is_err());
        assert!(resolve_orchestrator_relative_path(&cwd, "nested/../../escape.txt").is_err());
    }

    #[test]
    fn accepts_nested_relative_paths() {
        let cwd = PathBuf::from("/tmp/propose-cwd");
        let got = resolve_orchestrator_relative_path(&cwd, "src/foo.rs").expect("nested ok");
        assert_eq!(got, cwd.join("src/foo.rs"));
        let got = resolve_orchestrator_relative_path(&cwd, "scene.txt").expect("flat ok");
        assert_eq!(got, cwd.join("scene.txt"));
    }

    #[test]
    fn file_diff_marks_missing_file_as_new() {
        let dir = temp_dir("propose-diff");
        let change = ProposedFileChange {
            path: "brand-new.txt".into(),
            new_content: "hello\n".into(),
        };
        let diff = file_diff_from_proposal(&dir, change).unwrap();
        assert!(diff.old_content.is_none());
        assert_eq!(diff.new_content, "hello\n");
        assert!(diff.diff.contains('+') || diff.diff.contains("hello"));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn file_diff_reads_existing_baseline() {
        let dir = temp_dir("propose-diff-exist");
        std::fs::write(dir.join("scene.txt"), "old line\n").unwrap();
        let change = ProposedFileChange {
            path: "scene.txt".into(),
            new_content: "new line\n".into(),
        };
        let diff = file_diff_from_proposal(&dir, change).unwrap();
        assert_eq!(diff.old_content.as_deref(), Some("old line\n"));
        assert!(diff.diff.contains("-old line") || diff.diff.contains("old line"));
        assert!(diff.diff.contains("+new line") || diff.diff.contains("new line"));
        assert_eq!(
            std::fs::read_to_string(dir.join("scene.txt")).unwrap(),
            "old line\n"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn apply_writes_when_old_content_matches() {
        let sandbox = FreeSandbox::new("apply-ok");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "new\n");
        let entries = read_journal_entries(&journal).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].kind, "apply");
        assert_eq!(entries[0].id, applied.journal_id);
    }

    #[test]
    fn apply_rejects_stale_old_content() {
        let sandbox = FreeSandbox::new("apply-stale");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "actual on disk\n").unwrap();
        let journal = sandbox.journal_path();
        let err = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("expected baseline\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap_err();
        assert!(err.contains("changed on disk"), "{err}");
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "actual on disk\n");
        assert!(!journal.exists() || read_journal_entries(&journal).unwrap().is_empty());
    }

    #[test]
    fn apply_rejects_new_file_when_already_exists() {
        let sandbox = FreeSandbox::new("apply-exists");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "already here\n").unwrap();
        let journal = sandbox.journal_path();
        let err = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: None,
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap_err();
        assert!(err.contains("already exists"), "{err}");
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "already here\n");
    }

    #[test]
    fn apply_creates_new_file_and_nested_dirs() {
        let sandbox = FreeSandbox::new("apply-new");
        let file = sandbox.free_cwd().join("nested/mod.txt");
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "nested/mod.txt".into(),
                old_content: None,
                new_content: "brand new\n".into(),
            },
            &journal,
        )
        .unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "brand new\n");
        assert!(!applied.journal_id.is_empty());
    }

    #[test]
    fn rollback_restores_old_content() {
        let sandbox = FreeSandbox::new("rollback-restore");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        rollback_change_with_journal(&applied.journal_id, &journal).unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "old\n");
        let entries = read_journal_entries(&journal).unwrap();
        assert!(entries.iter().any(|e| e.kind == "rollback"));
    }

    #[test]
    fn rollback_deletes_created_file() {
        let sandbox = FreeSandbox::new("rollback-delete");
        let file = sandbox.free_cwd().join("scene.txt");
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: None,
                new_content: "created\n".into(),
            },
            &journal,
        )
        .unwrap();
        assert!(file.exists());
        rollback_change_with_journal(&applied.journal_id, &journal).unwrap();
        assert!(!file.exists());
    }

    #[test]
    fn rollback_twice_is_rejected() {
        let sandbox = FreeSandbox::new("rollback-twice");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        rollback_change_with_journal(&applied.journal_id, &journal).unwrap();
        // File is "old" again after rollback — second rollback must fail on
        // "already rolled back" before it even re-checks freshness.
        let err = rollback_change_with_journal(&applied.journal_id, &journal).unwrap_err();
        assert_eq!(err, "already rolled back");
    }

    #[test]
    fn rollback_rejects_when_file_changed_after_apply() {
        let sandbox = FreeSandbox::new("rollback-drift");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        std::fs::write(&file, "drifted\n").unwrap();
        let err = rollback_change_with_journal(&applied.journal_id, &journal).unwrap_err();
        assert!(err.contains("changed since it was applied"), "{err}");
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "drifted\n");
    }

    #[test]
    fn rollback_unknown_id_errors() {
        let sandbox = FreeSandbox::new("rollback-unknown");
        let journal = sandbox.journal_path();
        let err = rollback_change_with_journal("no-such-id", &journal).unwrap_err();
        assert_eq!(err, "unknown journal entry");
    }

    #[test]
    fn free_context_entries_have_no_profile_id() {
        let sandbox = FreeSandbox::new("profile-free");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        let entries = read_journal_entries(&journal).unwrap();
        assert_eq!(entries[0].profile_id, None);
    }

    #[test]
    fn project_context_entries_get_the_active_profile_id() {
        let sandbox = FreeSandbox::new("profile-project");
        let config_root = temp_dir("profile-project-config");
        std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &config_root);
        let project_dir = temp_dir("profile-project-connected");
        crate::profiles::set_active_profile_id("development".into()).unwrap();
        crate::profiles::set_project_path(
            "development".into(),
            project_dir.to_string_lossy().to_string(),
        )
        .unwrap();

        let file = project_dir.join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("project".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        let entries = read_journal_entries(&journal).unwrap();
        assert_eq!(entries[0].profile_id.as_deref(), Some("development"));

        std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
        let _ = std::fs::remove_dir_all(&config_root);
        let _ = std::fs::remove_dir_all(&project_dir);
    }

    #[test]
    fn list_orchestrator_journal_reads_back_apply_and_rollback_entries() {
        let sandbox = FreeSandbox::new("list-journal");
        let file = sandbox.free_cwd().join("scene.txt");
        std::fs::write(&file, "old\n").unwrap();
        let journal = sandbox.journal_path();
        let applied = apply_change_with_journal(
            ApplyChangeRequest {
                context: Some("free".into()),
                path: "scene.txt".into(),
                old_content: Some("old\n".into()),
                new_content: "new\n".into(),
            },
            &journal,
        )
        .unwrap();
        rollback_change_with_journal(&applied.journal_id, &journal).unwrap();

        let entries = list_orchestrator_journal().unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().any(|e| e.kind == "apply" && e.id == applied.journal_id));
        assert!(entries
            .iter()
            .any(|e| e.kind == "rollback" && e.rolled_back_id.as_deref() == Some(applied.journal_id.as_str())));
    }

    #[test]
    fn list_orchestrator_journal_is_empty_when_nothing_applied_yet() {
        let _sandbox = FreeSandbox::new("list-journal-empty");
        assert!(list_orchestrator_journal().unwrap().is_empty());
    }
}
