//! Persisted app settings — currently just the manuscript folder path.
//! Kept as a plain JSON file rather than a Tauri store/AppHandle dependency
//! so `manuscript.rs` can stay simple free functions.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct AppConfig {
    pub manuscript_path: Option<String>,
}

fn config_path() -> Result<PathBuf, String> {
    let dir = dirs::config_dir()
        .ok_or("HOME unavailable")?
        .join("Cockpit");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("config.json"))
}

pub fn load() -> AppConfig {
    let Ok(path) = config_path() else { return AppConfig::default() };
    let Ok(text) = std::fs::read_to_string(path) else { return AppConfig::default() };
    serde_json::from_str(&text).unwrap_or_default()
}

pub fn save(config: &AppConfig) -> Result<(), String> {
    let path = config_path()?;
    let text = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(path, text).map_err(|e| e.to_string())
}
