//! Per-provider auth status for the CLIs this app fans out to.
//! Each service uses the user's own subscription/account — InPrincipio only
//! surfaces whether that login is present and can start the provider's
//! own login flow. There is no shared "InPrincipio account".

use crate::bin_paths::{claude_bin, codex_bin, cursor_bin, gh_bin, opencode_bin};
use serde::Serialize;
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

const CMD_TIMEOUT: Duration = Duration::from_secs(10);

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

/// `opencode auth list` colors its output; strips just the color/reset
/// escapes (`ESC [ ... letter`) so the plain-text heuristics below see
/// clean text instead of stray control bytes.
fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\u{1b}' && chars.peek() == Some(&'[') {
            chars.next();
            for c2 in chars.by_ref() {
                if c2.is_ascii_alphabetic() {
                    break;
                }
            }
        } else {
            out.push(c);
        }
    }
    out
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AuthProvider {
    Claude,
    Codex,
    Cursor,
    Opencode,
    Github,
}

impl AuthProvider {
    fn as_str(self) -> &'static str {
        match self {
            Self::Claude => "claude",
            Self::Codex => "codex",
            Self::Cursor => "cursor",
            Self::Opencode => "opencode",
            Self::Github => "github",
        }
    }

    fn from_id(id: &str) -> Option<Self> {
        match id {
            "claude" => Some(Self::Claude),
            "codex" => Some(Self::Codex),
            "cursor" => Some(Self::Cursor),
            "opencode" => Some(Self::Opencode),
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

/// `opencode auth list` has no `--format json` — only human-readable,
/// color-coded text (verified via `opencode auth --help`). Parsed with a
/// plain-text heuristic like the other CLIs here that lack a JSON status.
async fn status_opencode() -> AuthStatus {
    let bin = opencode_bin();
    if !bin_exists(&bin) {
        return AuthStatus {
            id: "opencode".into(),
            label: "OpenCode".into(),
            installed: false,
            logged_in: false,
            account: None,
            detail: Some("CLI not found".into()),
        };
    }
    match run_output(&bin, &["auth", "list"]).await {
        Ok(output) => {
            let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
            let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));
            let combined = format!("{stdout}\n{stderr}");
            let lower = combined.to_lowercase();
            let logged_in = output.status.success()
                && lower.contains("credentials")
                && !lower.contains("0 credentials")
                && !lower.contains("no credentials");

            // The line above "N credentials" names the connected provider(s)
            // (e.g. "OpenCode Go   api") — not an email, but still useful as
            // an at-a-glance account label.
            let account = combined.lines().find_map(|line| {
                let trimmed = line.trim();
                let has_letters = trimmed.chars().any(|c| c.is_alphanumeric());
                if trimmed.is_empty()
                    || !has_letters
                    || trimmed.starts_with("Credentials")
                    || trimmed.to_lowercase().ends_with("credentials")
                {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            });

            AuthStatus {
                id: "opencode".into(),
                label: "OpenCode".into(),
                installed: true,
                logged_in,
                account,
                detail: if logged_in { None } else { Some("Not logged in".into()) },
            }
        }
        Err(e) => AuthStatus {
            id: "opencode".into(),
            label: "OpenCode".into(),
            installed: true,
            logged_in: false,
            account: None,
            detail: Some(e),
        },
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

            // Prefer the real GitHub login from the API — not a placeholder.
            let mut account = None;
            if logged_in {
                if let Ok(who) = run_output(&bin, &["api", "user", "-q", ".login"]).await {
                    if who.status.success() {
                        let login = String::from_utf8_lossy(&who.stdout).trim().to_string();
                        if !login.is_empty() && !login.contains(' ') {
                            account = Some(login);
                        }
                    }
                }
            }
            if account.is_none() {
                account = combined
                    .lines()
                    .find_map(|line| {
                        let lower = line.to_lowercase();
                        if lower.contains("logged in to") {
                            line.split_whitespace()
                                .rev()
                                .find(|t| {
                                    !t.contains('.')
                                        && t.chars().all(|c| {
                                            c.is_ascii_alphanumeric() || c == '-' || c == '_'
                                        })
                                })
                                .map(|s| s.trim_matches(|c: char| c == '"' || c == '\'').to_string())
                        } else {
                            None
                        }
                    })
                    .or_else(|| extract_email(&combined));
            }

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
    let (claude, codex, cursor, opencode, github) = tokio::join!(
        status_claude(),
        status_codex(),
        status_cursor(),
        status_opencode(),
        status_github()
    );
    Ok(vec![claude, codex, cursor, opencode, github])
}

fn provider_bins_and_args(provider: AuthProvider, logout: bool) -> (String, Vec<&'static str>) {
    match (provider, logout) {
        (AuthProvider::Claude, false) => (claude_bin(), vec!["auth", "login"]),
        (AuthProvider::Claude, true) => (claude_bin(), vec!["auth", "logout"]),
        (AuthProvider::Codex, false) => (codex_bin(), vec!["login"]),
        (AuthProvider::Codex, true) => (codex_bin(), vec!["logout"]),
        (AuthProvider::Cursor, false) => (cursor_bin(), vec!["login"]),
        (AuthProvider::Cursor, true) => (cursor_bin(), vec!["logout"]),
        (AuthProvider::Opencode, false) => (opencode_bin(), vec!["auth", "login"]),
        (AuthProvider::Opencode, true) => (opencode_bin(), vec!["auth", "logout"]),
        // Web flow avoids interactive prompts that need a TTY.
        (AuthProvider::Github, false) => (gh_bin(), vec!["auth", "login", "-p", "https", "-w"]),
        (AuthProvider::Github, true) => (gh_bin(), vec!["auth", "logout"]),
    }
}

async fn start_auth_flow(provider: String, logout: bool) -> Result<(), String> {
    let provider = AuthProvider::from_id(&provider)
        .ok_or_else(|| format!("unknown provider: {provider}"))?;
    let (bin, args) = provider_bins_and_args(provider, logout);
    let action = if logout { "logout" } else { "login" };

    if !bin_exists(&bin) {
        return Err(format!("{} CLI not found", provider.as_str()));
    }

    // A previous click can leave a stuck process waiting in a Terminal window
    // the user lost track of (this is especially easy to hit with GitHub's
    // device-code flow, which sits there until a code is typed into the
    // browser). Clear any earlier attempt for this exact provider+action
    // before starting a fresh one, so retrying always works instead of
    // silently piling up zombies with different one-time codes.
    let bin_name = std::path::Path::new(&bin)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| bin.clone());
    if let Some(first_arg) = args.first() {
        let pattern = format!("{bin_name} {first_arg}");
        let _ = std::process::Command::new("pkill")
            .arg("-f")
            .arg(&pattern)
            .status();
    }

    // On macOS, open Terminal for a visible interactive session and bring it
    // to the front — otherwise a device-code prompt waiting for input looks
    // like nothing happened.
    if cfg!(target_os = "macos") {
        let cmdline = format!(
            "{} {} ; echo; echo '[{}] {} finished — you can close this window.'; exec bash",
            shell_quote(&bin),
            args.iter().map(|a| shell_quote(a)).collect::<Vec<_>>().join(" "),
            provider.as_str(),
            action
        );
        let script = format!(
            "tell application \"Terminal\"\n  activate\n  do script \"{}\"\nend tell",
            cmdline.replace('\\', "\\\\").replace('"', "\\\"")
        );
        let status = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
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
        .map_err(|e| format!("failed to start {} {}: {e}", provider.as_str(), action))?;
    Ok(())
}

/// Start the provider's own login flow (browser / CLI). Detached so the UI
/// stays responsive; the user completes login in the browser or Terminal.
#[tauri::command]
pub async fn start_auth_login(provider: String) -> Result<(), String> {
    start_auth_flow(provider, false).await
}

#[tauri::command]
pub async fn start_auth_logout(provider: String) -> Result<(), String> {
    start_auth_flow(provider, true).await
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

#[cfg(test)]
mod tests {
    use super::*;

    // -- extract_email ------------------------------------------------------

    #[test]
    fn extract_email_finds_plain_address() {
        assert_eq!(extract_email("logged in as dev@example.com"), Some("dev@example.com".into()));
    }

    #[test]
    fn extract_email_strips_surrounding_punctuation() {
        assert_eq!(
            extract_email("account: <dev@example.com>, active"),
            Some("dev@example.com".into())
        );
    }

    #[test]
    fn extract_email_returns_none_when_absent() {
        assert_eq!(extract_email("Logged in, no address shown"), None);
    }

    #[test]
    fn extract_email_rejects_at_without_dot() {
        // Looks email-ish but isn't a full address (no TLD) — should not match.
        assert_eq!(extract_email("mentions user@localhost only"), None);
    }

    #[test]
    fn extract_email_picks_first_match() {
        assert_eq!(
            extract_email("primary a@example.com secondary b@example.com"),
            Some("a@example.com".into())
        );
    }

    // -- strip_ansi -----------------------------------------------------------

    #[test]
    fn strip_ansi_removes_color_codes() {
        assert_eq!(strip_ansi("\u{1b}[32mOK\u{1b}[0m"), "OK");
    }

    #[test]
    fn strip_ansi_leaves_plain_text_untouched() {
        assert_eq!(strip_ansi("2 credentials found"), "2 credentials found");
    }

    #[test]
    fn strip_ansi_handles_multiple_sequences_inline() {
        assert_eq!(
            strip_ansi("\u{1b}[1m\u{1b}[32mCredentials\u{1b}[0m: 2"),
            "Credentials: 2"
        );
    }

    // -- AuthProvider id round-trip -------------------------------------------

    #[test]
    fn provider_id_round_trips_for_all_variants() {
        for provider in [
            AuthProvider::Claude,
            AuthProvider::Codex,
            AuthProvider::Cursor,
            AuthProvider::Opencode,
            AuthProvider::Github,
        ] {
            assert_eq!(AuthProvider::from_id(provider.as_str()), Some(provider));
        }
    }

    #[test]
    fn provider_from_id_rejects_unknown() {
        assert_eq!(AuthProvider::from_id("bogus"), None);
        assert_eq!(AuthProvider::from_id(""), None);
    }

    // -- provider_bins_and_args -------------------------------------------------
    // Locks in the exact CLI invocation contract per provider/action so a
    // future edit can't silently change e.g. login into logout args.

    #[test]
    fn provider_args_cover_login_and_logout_for_every_provider() {
        let (_, args) = provider_bins_and_args(AuthProvider::Claude, false);
        assert_eq!(args, vec!["auth", "login"]);
        let (_, args) = provider_bins_and_args(AuthProvider::Claude, true);
        assert_eq!(args, vec!["auth", "logout"]);

        let (_, args) = provider_bins_and_args(AuthProvider::Codex, false);
        assert_eq!(args, vec!["login"]);
        let (_, args) = provider_bins_and_args(AuthProvider::Codex, true);
        assert_eq!(args, vec!["logout"]);

        let (_, args) = provider_bins_and_args(AuthProvider::Cursor, false);
        assert_eq!(args, vec!["login"]);
        let (_, args) = provider_bins_and_args(AuthProvider::Cursor, true);
        assert_eq!(args, vec!["logout"]);

        let (_, args) = provider_bins_and_args(AuthProvider::Opencode, false);
        assert_eq!(args, vec!["auth", "login"]);
        let (_, args) = provider_bins_and_args(AuthProvider::Opencode, true);
        assert_eq!(args, vec!["auth", "logout"]);

        let (_, args) = provider_bins_and_args(AuthProvider::Github, false);
        assert_eq!(args, vec!["auth", "login", "-p", "https", "-w"]);
        let (_, args) = provider_bins_and_args(AuthProvider::Github, true);
        assert_eq!(args, vec!["auth", "logout"]);
    }

    // -- bin_exists -----------------------------------------------------------

    #[test]
    fn bin_exists_false_for_bogus_absolute_path() {
        assert!(!bin_exists("/definitely/not/a/real/binary/path-xyz"));
    }

    // -- shell_quote ------------------------------------------------------------
    // Feeds into an AppleScript `do script` shell command line (start_auth_flow)
    // — worth locking down against injection via CLI args/binary paths.

    #[test]
    fn shell_quote_leaves_safe_tokens_unquoted() {
        assert_eq!(shell_quote("auth"), "auth");
        assert_eq!(shell_quote("/usr/local/bin/gh"), "/usr/local/bin/gh");
        assert_eq!(shell_quote("-p"), "-p");
    }

    #[test]
    fn shell_quote_wraps_empty_string() {
        assert_eq!(shell_quote(""), "''");
    }

    #[test]
    fn shell_quote_wraps_strings_with_spaces() {
        assert_eq!(shell_quote("two words"), "'two words'");
    }

    #[test]
    fn shell_quote_escapes_embedded_single_quotes() {
        assert_eq!(shell_quote("it's"), "'it'\\''s'");
    }

    #[test]
    fn shell_quote_neutralizes_shell_metacharacters() {
        // Single-quoting disables all shell expansion (`;`, `$()`, backticks,
        // `&&`) as long as embedded `'` are escaped — verify the output stays
        // wrapped in a single unbroken quoted token for each dangerous input.
        for dangerous in ["; rm -rf /", "$(whoami)", "`id`", "a && b", "a | b"] {
            let quoted = shell_quote(dangerous);
            assert!(quoted.starts_with('\''), "expected leading quote for {dangerous:?}: {quoted}");
            assert!(quoted.ends_with('\''), "expected trailing quote for {dangerous:?}: {quoted}");
        }
    }
}
