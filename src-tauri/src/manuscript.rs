//! Read-only access to the user's connected project — either a folder of
//! chapter files or a single manuscript file. Never writes — chapter edits
//! stay a manual, deliberate step the author does themselves after comparing
//! agent variants.

use crate::config;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ChapterInfo {
    file: String,
    title: String,
}

fn configured_path() -> Result<PathBuf, String> {
    let configured = config::load()
        .manuscript_path
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(configured);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    Ok(root)
}

/// Directory to use as `cwd` when invoking the CLI engines (they read
/// `AGENTS.md`/`CLAUDE.md`/skills from it) — the project folder itself, or
/// its parent when the connected project is a single file.
pub fn manuscript_root() -> Result<PathBuf, String> {
    let root = configured_path()?;
    if root.is_file() {
        root.parent()
            .map(PathBuf::from)
            .ok_or_else(|| format!("no parent directory for {}", root.display()))
    } else {
        Ok(root)
    }
}

/// Only meaningful in folder mode. Chapters live in a `Главы` subfolder for
/// the layout this app was built against; fall back to the root itself so an
/// arbitrary folder of `.txt` files also works.
fn chapters_dir(root: &std::path::Path) -> PathBuf {
    let nested = root.join("Главы");
    if nested.is_dir() { nested } else { root.to_path_buf() }
}

#[tauri::command]
pub fn get_manuscript_path() -> Option<String> {
    config::load().manuscript_path
}

/// Accepts either a folder (chapters as separate files inside it) or a
/// single file (the whole manuscript in one document) — same connection,
/// the rest of the app tells them apart by checking the path itself.
#[tauri::command]
pub fn set_manuscript_path(path: String) -> Result<(), String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Not a folder or file: {}", root.display()));
    }
    let mut cfg = config::load();
    cfg.manuscript_path = Some(path);
    config::save(&cfg)
}

/// Disconnects the project (forgets the path) without touching anything on
/// disk — purely so a stale connection doesn't get in the way of a different
/// one later.
#[tauri::command]
pub fn clear_manuscript_path() -> Result<(), String> {
    let mut cfg = config::load();
    cfg.manuscript_path = None;
    config::save(&cfg)
}

#[tauri::command]
pub fn list_chapters() -> Result<Vec<ChapterInfo>, String> {
    let root = configured_path()?;
    if root.is_file() {
        let title = root
            .file_stem()
            .map(|s| s.to_string_lossy().replace('_', " "))
            .unwrap_or_else(|| "Manuscript".into());
        let file = root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        return Ok(vec![ChapterInfo { file, title }]);
    }

    let dir = chapters_dir(&root);
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
/// In single-file mode `file` is ignored: there is only ever one chapter,
/// the connected file itself.
#[tauri::command]
pub fn read_chapter(file: String) -> Result<String, String> {
    if file.contains('/') || file.contains('\\') || file == ".." {
        return Err("invalid chapter filename".into());
    }
    let root = configured_path()?;
    if root.is_file() {
        return std::fs::read_to_string(&root)
            .map_err(|e| format!("failed to read {}: {e}", root.display()));
    }
    let path = chapters_dir(&root).join(&file);
    std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}
