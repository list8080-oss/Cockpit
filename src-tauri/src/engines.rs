//! One-shot calls to the `claude` and `codex` CLIs, run with cwd = the
//! manuscript repo so both pick up its `AGENTS.md`/`CLAUDE.md`/skill
//! automatically — same as the shared-shelf setup already used from a
//! terminal. Each call is a single non-interactive turn: no session, no
//! resume, no tool loop — just "here's a prompt, give me text back".

use crate::manuscript::manuscript_root;
use serde_json::Value;
use std::process::Stdio;
use tokio::process::Command;

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

#[tauri::command]
pub async fn run_claude(prompt: String) -> Result<String, String> {
    let cwd = manuscript_root()?;
    let output = Command::new(claude_bin())
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .arg("-p")
        .arg(&prompt)
        .arg("--output-format")
        .arg("json")
        .output()
        .await
        .map_err(|e| format!("failed to run claude: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("claude exited with {}: {}", output.status, stderr.trim()));
    }

    let json: Value = serde_json::from_str(stdout.trim())
        .map_err(|e| format!("unexpected claude output ({e}): {}", stdout.trim()))?;

    let is_error = json.get("is_error").and_then(Value::as_bool).unwrap_or(false);
    let result = json
        .get("result")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("no `result` field in claude output: {}", stdout.trim()))?;

    if is_error {
        Err(result.to_string())
    } else {
        Ok(result.to_string())
    }
}

#[tauri::command]
pub async fn run_codex(prompt: String) -> Result<String, String> {
    let cwd = manuscript_root()?;
    let output = Command::new(codex_bin())
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .arg("exec")
        .arg("--json")
        .arg("-s")
        .arg("read-only")
        .arg("--skip-git-repo-check")
        // Skips `~/.codex/config.toml` (marketplaces/plugins/MCP servers) —
        // those expect a local app-server that isn't running in headless
        // one-shot calls and otherwise crash the turn with a transport error.
        // Auth still comes from CODEX_HOME, so login is unaffected.
        .arg("--ignore-user-config")
        .arg("-m")
        .arg("gpt-5.6-sol")
        .arg(&prompt)
        .output()
        .await
        .map_err(|e| format!("failed to run codex: {e}"))?;

    // `codex exec` exits with status 1 for ordinary turn failures (rate
    // limits, refusals, etc.), not just crashes — the real explanation is a
    // structured event on stdout, so that's parsed first regardless of exit
    // status. Exit status + stderr are only the fallback when stdout has
    // nothing recognizable at all (an actual crash, e.g. binary not found).
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut messages = Vec::new();
    for line in stdout.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else { continue };
        match event.get("type").and_then(Value::as_str) {
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
        return Ok(messages.join("\n\n"));
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("codex exited with {}: {}", output.status, stderr.trim()));
    }

    Err(format!("no reply from codex:\n{}", stdout.trim()))
}
