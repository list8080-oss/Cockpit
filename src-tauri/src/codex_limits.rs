//! Lazy Codex usage limits from the ChatGPT account that backs `codex login`.
//! Reads `~/.codex/auth.json` and calls `GET {chatgpt_base}/api/codex/usage`.
//! No background polling — callers invoke this on demand.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

const DEFAULT_CHATGPT_BASE: &str = "https://chatgpt.com/backend-api";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexLimitWindow {
    /// Percent of the window already used (0–100).
    pub used_percent: f64,
    /// Window length in minutes when known (e.g. 300 ≈ 5h, 10080 ≈ week).
    pub window_minutes: Option<i64>,
    pub resets_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexLimits {
    pub available: bool,
    pub five_hour: Option<CodexLimitWindow>,
    pub weekly: Option<CodexLimitWindow>,
    pub plan_type: Option<String>,
    pub detail: Option<String>,
}

impl CodexLimits {
    fn unavailable(detail: impl Into<String>) -> Self {
        Self {
            available: false,
            five_hour: None,
            weekly: None,
            plan_type: None,
            detail: Some(detail.into()),
        }
    }
}

#[derive(Debug, Deserialize)]
struct AuthFile {
    tokens: Option<AuthTokens>,
}

#[derive(Debug, Deserialize)]
struct AuthTokens {
    access_token: Option<String>,
    account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageResponse {
    plan_type: Option<String>,
    rate_limit: Option<RateLimitBlock>,
}

#[derive(Debug, Deserialize)]
struct RateLimitBlock {
    primary_window: Option<WindowSnapshot>,
    secondary_window: Option<WindowSnapshot>,
}

#[derive(Debug, Deserialize)]
struct WindowSnapshot {
    used_percent: Option<f64>,
    limit_window_seconds: Option<i64>,
    reset_at: Option<i64>,
    // Some payloads use minutes instead of seconds.
    window_minutes: Option<i64>,
    #[serde(alias = "windowDurationMins")]
    window_duration_mins: Option<i64>,
}

fn auth_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".codex").join("auth.json"))
}

fn chatgpt_base_url() -> String {
    // Optional override from Codex config if present.
    if let Some(home) = dirs::home_dir() {
        let cfg = home.join(".codex").join("config.toml");
        if let Ok(text) = std::fs::read_to_string(cfg) {
            for line in text.lines() {
                let line = line.trim();
                if let Some(rest) = line.strip_prefix("chatgpt_base_url") {
                    let rest = rest.trim().trim_start_matches('=').trim();
                    let url = rest.trim_matches('"').trim_matches('\'').trim();
                    if !url.is_empty() {
                        return url.trim_end_matches('/').to_string();
                    }
                }
            }
        }
    }
    DEFAULT_CHATGPT_BASE.to_string()
}

fn window_from_snapshot(snap: &WindowSnapshot) -> Option<CodexLimitWindow> {
    let used = snap.used_percent?;
    let minutes = snap
        .window_minutes
        .or(snap.window_duration_mins)
        .or_else(|| snap.limit_window_seconds.map(|s| (s + 59) / 60));
    Some(CodexLimitWindow {
        used_percent: used,
        window_minutes: minutes,
        resets_at: snap.reset_at,
    })
}

/// Classify primary/secondary into 5h vs weekly by window length when possible.
fn classify_windows(
    primary: Option<CodexLimitWindow>,
    secondary: Option<CodexLimitWindow>,
) -> (Option<CodexLimitWindow>, Option<CodexLimitWindow>) {
    let is_week = |w: &CodexLimitWindow| {
        w.window_minutes
            .map(|m| m >= 24 * 60)
            .unwrap_or(false)
    };
    let is_short = |w: &CodexLimitWindow| {
        w.window_minutes
            .map(|m| m > 0 && m < 24 * 60)
            .unwrap_or(false)
    };

    match (primary, secondary) {
        (Some(a), Some(b)) if is_week(&a) && is_short(&b) => (Some(b), Some(a)),
        (Some(a), Some(b)) if is_short(&a) && is_week(&b) => (Some(a), Some(b)),
        (Some(a), Some(b)) => (Some(a), Some(b)),
        (Some(a), None) if is_week(&a) => (None, Some(a)),
        (Some(a), None) => (Some(a), None),
        (None, Some(b)) if is_week(&b) => (None, Some(b)),
        (None, Some(b)) => (Some(b), None),
        (None, None) => (None, None),
    }
}

#[tauri::command]
pub async fn get_codex_limits() -> Result<CodexLimits, String> {
    let path = auth_path().ok_or_else(|| "HOME unavailable".to_string())?;
    if !path.is_file() {
        return Ok(CodexLimits::unavailable("codex auth.json not found — sign in via Codex"));
    }

    let raw = std::fs::read_to_string(&path).map_err(|e| format!("read auth.json: {e}"))?;
    let auth: AuthFile =
        serde_json::from_str(&raw).map_err(|e| format!("parse auth.json: {e}"))?;
    let tokens = auth.tokens.ok_or_else(|| "no tokens in auth.json".to_string())?;
    let access = tokens
        .access_token
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "no access_token in auth.json".to_string())?;
    let account_id = tokens.account_id.filter(|s| !s.is_empty());

    let base = chatgpt_base_url();
    let url = format!("{}/api/codex/usage", base.trim_end_matches('/'));

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| format!("http client: {e}"))?;

    let mut req = client
        .get(&url)
        .header("Authorization", format!("Bearer {access}"))
        .header("Accept", "application/json");
    if let Some(id) = &account_id {
        req = req.header("ChatGPT-Account-Id", id);
    }

    let response = req.send().await.map_err(|e| format!("usage request failed: {e}"))?;
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("read usage body: {e}"))?;

    if !status.is_success() {
        return Ok(CodexLimits::unavailable(format!(
            "usage HTTP {}: {}",
            status.as_u16(),
            body.chars().take(160).collect::<String>()
        )));
    }

    let parsed: UsageResponse =
        serde_json::from_str(&body).map_err(|e| format!("parse usage JSON: {e}"))?;

    let primary = parsed
        .rate_limit
        .as_ref()
        .and_then(|r| r.primary_window.as_ref())
        .and_then(window_from_snapshot);
    let secondary = parsed
        .rate_limit
        .as_ref()
        .and_then(|r| r.secondary_window.as_ref())
        .and_then(window_from_snapshot);

    let (five_hour, weekly) = classify_windows(primary, secondary);

    if five_hour.is_none() && weekly.is_none() {
        return Ok(CodexLimits::unavailable(
            "usage payload has no rate-limit windows",
        ));
    }

    Ok(CodexLimits {
        available: true,
        five_hour,
        weekly,
        plan_type: parsed.plan_type,
        detail: None,
    })
}
