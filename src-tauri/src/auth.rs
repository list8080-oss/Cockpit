//! Per-provider auth status for the CLIs this app fans out to.
//! Each service uses the user's own subscription/account — Cockpit only
//! surfaces whether that login is present and can start the provider's
//! own login flow. There is no shared "Cockpit account".

use serde::Serialize;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const CMD_TIMEOUT: Duration = Duration::from_secs(10);

fn resolve_bin(candidates: &[&str], fallback: &str) -> String {
    for c in candidates {
        if std::path::Path::new(c).is_file() {
            return c.to_string();
        }
    }
    fallback.to_string()
}

fn bin_exists(path: &str) -> bool {
    std::path::Path::new(path).is_file()
        || which_ok(path)
}

fn which_ok(name: &str) -> bool {
    std::process::Command::new("which")
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
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

fn gh_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/gh", "/usr/local/bin/gh"], "gh")
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AuthProvider {
    Claude,
    Codex,
    Cursor,
    Github,
}

impl AuthProvider {
    fn as_str(self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::Codex => "codex",
            Self::Cursor => "cursor",
            Self::Github => "github",
        }
    }

    fn from_id(id: &str) -> Option<Self> {
        match id {
            "claude" => Some(Self::Claude),
            "codex" => Some(Self::Codex),
            "cursor" => Some(Self::Cursor),
            "github" => Some(Self::Github),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub id: String,
    pub label: String,
    /// CLI binary found on this machine.
    pub installed: bool,
    pub logged_in: bool,
    /// Email / login handle when the CLI exposes one.
    pub account: Option<String>,
    pub detail: Option<String>,
}

async fn run_output(bin: &str, args: &[&str]) -> Result<std::process::Output, String> {
    let fut = Command::new(bin)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();
    match timeout(CMD_TIMEOUT, fut).await {
        Ok(Ok(output)) => Ok(output),
        Ok(Err(e)) => Err(format!("failed to run {bin}: {e}")),
        Err(_) => Err(format!("{bin} timed out")),
    }
}

fn extract_email(text: &str) -> Option<String> {
    for token in text.split_whitespace() {
        let t = token.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '@' && c != '.' && c != '_' && c != '+' && c != '-');
        if t.contains('@') && t.contains('.') {
            return Some(t.to_string());
        }
    }
    None
}

async fn status_claude() -> AuthStatus {
    let bin = claude_bin();
    if !bin_exists(&bin) {
        return AuthStatus {
            id: "claude".into(),
            label: "Claude".into(),
            installed: false,
            logged_in: false,
            account: None,
            detail: Some("CLI not found".into()),
        };
    }
    match run_output(&bin, &["auth", "status"]).await {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let combined = format!("{stdout}\n{stderr}");
            let mut logged_in = output.status.success();
            let account;
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
                if let Some(v) = json.get("loggedIn").and_then(|v| v.as_bool()) {
                    logged_in = v;
                }
                account = json
                    .get("email")
                    .or_else(|| json.get("account"))
                    .or_else(|| json.pointer("/account/email"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .or_else(|| extract_email(&combined));
            } else {
                account = extract_email(&combined);
            }
            AuthStatus {
                id: "claude".into(),
                label: "Claude".into(),
                installed: true,
                logged_in,
                account,
                detail: None,
            }
        }
        Err(e) => AuthStatus {
            id: "claude".into(),
            label: "Claude".into(),
            installed: true,
            logged_in: false,
            account: None,
            detail: Some(e),
        },
    }
}

async fn status_codex() -> AuthStatus {
    let bin = codex_bin();
    if !bin_exists(&bin) {
        return AuthStatus {
            id: "codex".into(),
            label: "Codex".into(),
            installed: false,
            logged_in: false,
            account: None,
            detail: Some("CLI not found".into()),
        };
    }
    match run_output(&bin, &["login", "status"]).await {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            let combined = format!("{stdout}\n{stderr}");
            let logged_in = output.status.success()
                && !combined.to_lowercase().contains("not logged in");
            AuthStatus {
                id: "codex".into(),
                label: "Codex".into(),
                installed: true,
                logged_in,
                account: extract_email(&combined),
                detail: if logged_in {
                    None
                } else {
                    Some(stdout.trim().lines().next().unwrap_or("Not logged in").into())
                },
            }
        }
        Err(e) => AuthStatus {
            id: "codex".into(),
            label: "Codex".into(),
            installed: true,
            logged_in: false,
            account: None,
            detail: Some(e),
        },
    }
}

async fn status_cursor() -> AuthStatus {
    let bin = cursor_bin();
    if !bin_exists(&bin) {
        return AuthStatus {
            id: "cursor".into(),
            label: "Cursor".into(),
            installed: false,
            logged_in: false,
            account: None,
            detail: Some("CLI not found".into()),
        };
    }

    // Prefer machine-readable status when available.
    let output = match run_output(&bin, &["status", "--format", "json"]).await {
        Ok(o) if !o.stdout.is_empty() => o,
        _ => match run_output(&bin, &["status"]).await {
            Ok(o) => o,
            Err(e) => {
                return AuthStatus {
                    id: "cursor".into(),
                    label: "Cursor".into(),
                    installed: true,
                    logged_in: false,
                    account: None,
                    detail: Some(e),
                };
            }
        },
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}\n{stderr}");
    let lower = combined.to_lowercase();

    let mut logged_in = output.status.success()
        && (lower.contains("logged in") || lower.contains("authenticated"))
        && !lower.contains("not logged in")
        && !lower.contains("not authenticated");

    let mut account = extract_email(&combined);

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
        if let Some(v) = json
            .get("loggedIn")
            .or_else(|| json.get("authenticated"))
            .and_then(|v| v.as_bool())
        {
            logged_in = v;
        }
        account = json
            .get("email")
            .or_else(|| json.get("account"))
            .or_else(|| json.get("user"))
            .and_then(|v| {
                if v.is_string() {
                    v.as_str().map(|s| s.to_string())
                } else {
                    v.get("email").and_then(|e| e.as_str()).map(|s| s.to_string())
                }
            })
            .or(account);
    }

    AuthStatus {
        id: "cursor".into(),
        label: "Cursor".into(),
        installed: true,
        logged_in,
        account,
        detail: None,
    }
}

async fn status_github() -> AuthStatus {
    let bin = gh_bin();
    if !bin_exists(&bin) {
        return AuthStatus {
            id: "github".into(),
            label: "GitHub".into(),
            installed: false,
            logged_in: false,
            account: None,
            detail: Some("CLI not found".into()),
        };
    }
    match run_output(&bin, &["auth", "status"]).await {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let stderr = String::from_utf8_lossy(&output.stderr);
            // `gh auth status` writes to stderr by default.
            let combined = format!("{stdout}\n{stderr}");
            let logged_in = output.status.success();
            let account = combined
                .lines()
                .find_map(|line| {
                    let lower = line.to_lowercase();
                    if lower.contains("logged in to") {
                        line.split_whitespace().rev().find(|t| {
                            t.contains('@')
                                || (!t.contains('.') && t.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'))
                        }).map(|s| s.trim_matches(|c: char| c == '"' || c == '\'').to_string())
                    } else {
                        None
                    }
                })
                .or_else(|| extract_email(&combined));
            AuthStatus {
                id: "github".into(),
                label: "GitHub".into(),
                installed: true,
                logged_in,
                account,
                detail: if logged_in {
                    None
                } else {
                    Some("Not logged in".into())
                },
            }
        }
        Err(e) => AuthStatus {
            id: "github".into(),
            label: "GitHub".into(),
            installed: true,
            logged_in: false,
            account: None,
            detail: Some(e),
        },
    }
}

#[tauri::command]
pub async fn list_auth_status() -> Result<Vec<AuthStatus>, String> {
    let (claude, codex, cursor, github) = tokio::join!(
        status_claude(),
        status_codex(),
        status_cursor(),
        status_github()
    );
    Ok(vec![claude, codex, cursor, github])
}

/// Start the provider's own login flow (browser / CLI). Detached so the UI
/// stays responsive; the user completes login in the browser or Terminal.
#[tauri::command]
pub async fn start_auth_login(provider: String) -> Result<(), String> {
    let provider = AuthProvider::from_id(&provider)
        .ok_or_else(|| format!("unknown provider: {provider}"))?;

    let (bin, args): (String, Vec<&str>) = match provider {
        AuthProvider::Claude => (claude_bin(), vec!["auth", "login"]),
        AuthProvider::Codex => (codex_bin(), vec!["login"]),
        AuthProvider::Cursor => (cursor_bin(), vec!["login"]),
        // Web flow avoids interactive prompts that need a TTY.
        AuthProvider::Github => (gh_bin(), vec!["auth", "login", "-p", "https", "-w"]),
    };

    if !bin_exists(&bin) {
        return Err(format!("{} CLI not found", provider.as_str()));
    }

    // On macOS, open Terminal for a visible interactive login session.
    // Browser-based CLIs still work; Terminal makes progress obvious.
    if cfg!(target_os = "macos") {
        let cmdline = format!(
            "{} {} ; echo; echo '[{}] login finished — you can close this window.'; exec bash",
            shell_quote(&bin),
            args.iter().map(|a| shell_quote(a)).collect::<Vec<_>>().join(" "),
            provider.as_str()
        );
        let status = std::process::Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"Terminal\" to do script \"{}\"",
                cmdline.replace('\\', "\\\\").replace('"', "\\\"")
            ))
            .status()
            .map_err(|e| format!("failed to open Terminal: {e}"))?;
        if status.success() {
            return Ok(());
        }
    }

    Command::new(&bin)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("failed to start {} login: {e}", provider.as_str()))?;
    Ok(())
}

fn shell_quote(s: &str) -> String {
    if s.is_empty() {
        return "''".into();
    }
    if s.chars()
        .all(|c| c.is_ascii_alphanumeric() || "-_./:@+".contains(c))
    {
        return s.to_string();
    }
    format!("'{}'", s.replace('\'', "'\\''"))
}
