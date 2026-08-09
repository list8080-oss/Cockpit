//! One-shot calls to the `claude`, `codex`, and `cursor-agent` CLIs, run with
//! cwd = the manuscript repo so all three pick up its `AGENTS.md`/`CLAUDE.md`/
//! skill automatically — same as the shared-shelf setup already used from a
//! terminal. Each call is a single non-interactive turn; optionally it can
//! resume a prior turn's session/thread id (returned alongside the reply) so
//! a follow-up stays in that engine's own context instead of starting cold.

use crate::manuscript::manuscript_root;
use serde::Serialize;
use serde_json::Value;
use std::process::Stdio;
use tokio::process::Command;

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

/// GUI-launched apps on macOS don't inherit a login shell's PATH, so Homebrew
/// binaries can be invisible even though a Terminal `which` finds them. Try
/// known install locations before falling back to bare `PATH` lookup.
fn resolve_bin(candidates: &[&str], fallback: &str) -> String {
    for c in candidates {
        if std::path::Path::new(c).is_file() {
            return c.to_string();
        }
    }
    fallback.to_string()
}

fn claude_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/claude", "/usr/local/bin/claude"], "claude")
}

fn codex_bin() -> String {
    resolve_bin(
        &[
            "/Applications/ChatGPT.app/Contents/Resources/codex",
            "/opt/homebrew/bin/codex",
            "/usr/local/bin/codex",
        ],
        "codex",
    )
}

fn cursor_bin() -> String {
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".local/bin/cursor-agent");
        if p.is_file() {
            return p.to_string_lossy().to_string();
        }
    }
    resolve_bin(
        &["/opt/homebrew/bin/cursor-agent", "/usr/local/bin/cursor-agent"],
        "cursor-agent",
    )
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
) -> Result<EngineReply, String> {
    let cwd = manuscript_root()?;
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
) -> Result<EngineReply, String> {
    let cwd = manuscript_root()?;
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
) -> Result<EngineReply, String> {
    let cwd = manuscript_root()?;
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

fn opencode_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/opencode", "/usr/local/bin/opencode"], "opencode")
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
) -> Result<EngineReply, String> {
    let cwd = manuscript_root()?;
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
