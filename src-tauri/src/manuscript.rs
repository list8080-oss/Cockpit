//! Read-only access to the local "Рукопись" manuscript clone. Never writes —
//! chapter edits stay a manual, deliberate step the author does themselves
//! after comparing agent variants.

use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ChapterInfo {
    file: String,
    title: String,
}

pub fn manuscript_root() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("HOME unavailable")?;
    let root = home.join("Documents").join("Рукопись");
    if !root.is_dir() {
        return Err(format!("Manuscript folder not found at {}", root.display()));
    }
    Ok(root)
}

#[tauri::command]
pub fn list_chapters() -> Result<Vec<ChapterInfo>, String> {
    let dir = manuscript_root()?.join("Главы");
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
/// rejected otherwise so this can never read outside `Главы/`.
#[tauri::command]
pub fn read_chapter(file: String) -> Result<String, String> {
    if file.contains('/') || file.contains('\\') || file == ".." {
        return Err("invalid chapter filename".into());
    }
    let path = manuscript_root()?.join("Главы").join(&file);
    std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}
