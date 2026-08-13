//! Persisted app settings — per-profile project paths and the active
//! project profile id.
//! Kept as a plain JSON file rather than a Tauri store/AppHandle dependency
//! so `manuscript.rs` can stay simple free functions.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

/// Where one entity's personality lives: a GitHub repo (`owner/name`) and,
/// when the personality is a subfolder of a shared repo, that subfolder.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityRepoConfig {
    pub repo: String,
    #[serde(default)]
    pub subpath: Option<String>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AppConfig {
    /// Legacy pre-profile field. `load()` migrates it into
    /// `project_paths["manuscript"]` on every read; nothing writes to it
    /// anymore. Kept `pub(crate)` only so existing in-crate tests can seed
    /// old-format configs; production code must not write it.
    #[serde(default)]
    pub(crate) manuscript_path: Option<String>,
    /// Selected project profile id. `None` means fall back to the built-in
    /// default (`"manuscript"`).
    #[serde(default)]
    pub active_profile_id: Option<String>,
    /// Connected project folder/file per profile id (e.g. "manuscript",
    /// "development"). Source of truth for `profiles::resolve_profile_workdir`.
    #[serde(default)]
    pub project_paths: BTreeMap<String, String>,
    /// entity id ("orchestrator"/"argus"/"vera") -> its personality repo.
    /// Deliberately a local-config value and NOT a constant in source: the
    /// source code is published as-is to the public repo on every release,
    /// and these are private personal repo names that must never appear
    /// there (BACKLOG п.14, аудит 2026-08-13). An empty map just means the
    /// Entities download feature is dormant until someone fills it in —
    /// same trust model as `project_paths` (a file only the local user can
    /// edit; never writable from the webview side).
    #[serde(default)]
    pub entity_repos: BTreeMap<String, EntityRepoConfig>,
}

fn config_path() -> Result<PathBuf, String> {
    let dir = match std::env::var("YAR_COCKPIT_CONFIG_DIR") {
        Ok(dir) => PathBuf::from(dir),
        Err(_) => dirs::config_dir().ok_or("HOME unavailable")?.join("Cockpit"),
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn load() -> AppConfig {
    let Ok(path) = config_path() else { return AppConfig::default() };
    let Ok(text) = std::fs::read_to_string(path) else { return AppConfig::default() };
    let mut cfg: AppConfig = serde_json::from_str(&text).unwrap_or_default();
    if !cfg.project_paths.contains_key("manuscript") {
        if let Some(legacy) = cfg.manuscript_path.take() {
            cfg.project_paths.insert("manuscript".into(), legacy);
        }
    }
    cfg
}

/// Writes via a temp file + rename in the same directory so a crash mid-write
/// can never leave `config.json` truncated or corrupted — the rename is
/// atomic, so readers always see either the old file or the fully-written
/// new one, never a partial one.
pub fn save(config: &AppConfig) -> Result<(), String> {
    let path = config_path()?;
    let text = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    let tmp_path = path.with_extension("json.tmp");
    std::fs::write(&tmp_path, text).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp_path, &path).map_err(|e| e.to_string())
}
