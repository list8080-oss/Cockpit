//! Read-only access to the user's configured manuscript folder. Never writes —
//! chapter edits stay a manual, deliberate step the author does themselves
//! after comparing agent variants.

use crate::config;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ChapterInfo {
    file: String,
    title: String,
}

pub fn manuscript_root() -> Result<PathBuf, String> {
    let configured = config::load()
        .manuscript_path
        .ok_or("Manuscript folder not set — choose one in Settings.")?;
    let root = PathBuf::from(configured);
    if !root.is_dir() {
        return Err(format!("Manuscript folder not found: {}", root.display()));
    }
    Ok(root)
}

/// Chapters live in a `Главы` subfolder for the layout this app was built
/// against; fall back to the root itself so an arbitrary folder of `.txt`
/// files also works.
fn chapters_dir(root: &std::path::Path) -> PathBuf {
    let nested = root.join("Главы");
    if nested.is_dir() { nested } else { root.to_path_buf() }
}

#[tauri::command]
pub fn get_manuscript_path() -> Option<String> {
    config::load().manuscript_path
}

#[tauri::command]
pub fn set_manuscript_path(path: String) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Not a folder: {}", root.display()));
    }
    let mut cfg = config::load();
    cfg.manuscript_path = Some(path);
    config::save(&cfg)
}

#[tauri::command]
pub fn list_chapters() -> Result<Vec<ChapterInfo>, String> {
    let dir = chapters_dir(&manuscript_root()?);
    let mut files: Vec<String> = std::fs::read_dir(&dir)
        .map_err(|e| format!("failed to read {}: {e}", dir.display()))?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| name.ends_with(".txt"))
        .collect();
    files.sort();
    Ok(files
        .into_iter()
        .map(|file| {
            let title = file
                .trim_end_matches(".txt")
                .replace('_', " ");
            ChapterInfo { file, title }
        })
        .collect())
}

/// `file` must be a bare filename (no path separators) from `list_chapters` —
/// rejected otherwise so this can never read outside the chapters folder.
#[tauri::command]
pub fn read_chapter(file: String) -> Result<String, String> {
    if file.contains('/') || file.contains('\\') || file == ".." {
        return Err("invalid chapter filename".into());
    }
    let path = chapters_dir(&manuscript_root()?).join(&file);
    std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}
