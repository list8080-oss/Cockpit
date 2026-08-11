//! Disk-persisted version history for the writing editor: autosave backups
//! and named ("pinned") snapshots, stored under
//! `<project>/.inprincipio/history/<node-id>/` so they travel with the
//! manuscript on disk instead of living only in the WebView's localStorage
//! (lost on cache clear, profile reset, or reinstall).

use crate::editor_project::require_project_and_safe_id;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BACKUPS: usize = 20;
const PREVIEW_CHARS: usize = 160;

#[derive(Serialize, Clone)]
pub struct BackupEntry {
    node_id: String,
    timestamp: String,
    size_bytes: u64,
    preview: String,
}

#[derive(Serialize, Clone)]
pub struct SnapshotEntry {
    node_id: String,
    timestamp: String,
    name: String,
    size_bytes: u64,
    preview: String,
}

fn history_dir(project: &Path, node_id: &str) -> PathBuf {
    project.join(".inprincipio").join("history").join(node_id)
}

fn timestamp_now() -> Result<String, String> {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("clock error: {e}"))?
        .as_millis();
    Ok(ms.to_string())
}

/// Timestamps are also path segments (`<dir>/<timestamp>.md`), so anything
/// arriving from the frontend must be validated the same as a document id —
/// this is stricter still, since a real timestamp is always plain digits.
fn validate_timestamp(timestamp: &str) -> Result<(), String> {
    if timestamp.is_empty() || !timestamp.chars().all(|c| c.is_ascii_digit()) {
        return Err("invalid timestamp".into());
    }
    Ok(())
}

fn preview_of(content: &str) -> String {
    content.chars().take(PREVIEW_CHARS).collect()
}

/// `(timestamp, size_bytes, preview)` for every `.md` entry in `dir`, newest
/// first. Missing directory (no history yet) is an empty list, not an error.
fn list_entries(dir: &Path) -> Result<Vec<(String, u64, String)>, String> {
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(|e| format!("failed to read {}: {e}", dir.display()))? {
        let entry = entry.map_err(|e| format!("dir entry error: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let timestamp = path.file_stem().and_then(|s| s.to_str()).unwrap_or_default().to_string();
        if timestamp.is_empty() || !timestamp.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        out.push((timestamp, size_bytes, preview_of(&content)));
    }
    out.sort_by(|a, b| {
        let av: u128 = a.0.parse().unwrap_or(0);
        let bv: u128 = b.0.parse().unwrap_or(0);
        bv.cmp(&av)
    });
    Ok(out)
}

fn snapshot_name(dir: &Path, timestamp: &str) -> String {
    std::fs::read_to_string(dir.join(format!("{timestamp}.name"))).unwrap_or_default()
}

fn prune_old_backups(dir: &Path) -> Result<(), String> {
    let mut entries = list_entries(dir)?;
    if entries.len() <= MAX_BACKUPS {
        return Ok(());
    }
    for (timestamp, _, _) in entries.split_off(MAX_BACKUPS) {
        let _ = std::fs::remove_file(dir.join(format!("{timestamp}.md")));
    }
    Ok(())
}

#[tauri::command]
pub fn create_backup(project_path: String, node_id: String, content: String) -> Result<(), String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    let dir = history_dir(&project, &node_id).join("backups");
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create history dir: {e}"))?;
    let timestamp = timestamp_now()?;
    std::fs::write(dir.join(format!("{timestamp}.md")), &content)
        .map_err(|e| format!("cannot write backup: {e}"))?;
    prune_old_backups(&dir)
}

#[tauri::command]
pub fn list_document_backups(project_path: String, node_id: String) -> Result<Vec<BackupEntry>, String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    let dir = history_dir(&project, &node_id).join("backups");
    Ok(list_entries(&dir)?
        .into_iter()
        .map(|(timestamp, size_bytes, preview)| BackupEntry {
            node_id: node_id.clone(),
            timestamp,
            size_bytes,
            preview,
        })
        .collect())
}

#[tauri::command]
pub fn restore_backup(project_path: String, node_id: String, timestamp: String) -> Result<String, String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    validate_timestamp(&timestamp)?;
    let path = history_dir(&project, &node_id).join("backups").join(format!("{timestamp}.md"));
    std::fs::read_to_string(&path).map_err(|_| "backup not found".to_string())
}

#[tauri::command]
pub fn list_document_snapshots(project_path: String, node_id: String) -> Result<Vec<SnapshotEntry>, String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    let dir = history_dir(&project, &node_id).join("snapshots");
    Ok(list_entries(&dir)?
        .into_iter()
        .map(|(timestamp, size_bytes, preview)| {
            let name = snapshot_name(&dir, &timestamp);
            SnapshotEntry { node_id: node_id.clone(), timestamp, name, size_bytes, preview }
        })
        .collect())
}

#[tauri::command]
pub fn pin_snapshot(
    project_path: String,
    node_id: String,
    timestamp: String,
    name: String,
) -> Result<SnapshotEntry, String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    validate_timestamp(&timestamp)?;
    let backups_dir = history_dir(&project, &node_id).join("backups");
    let content = std::fs::read_to_string(backups_dir.join(format!("{timestamp}.md")))
        .map_err(|_| "backup not found".to_string())?;

    let snapshots_dir = history_dir(&project, &node_id).join("snapshots");
    std::fs::create_dir_all(&snapshots_dir).map_err(|e| format!("cannot create history dir: {e}"))?;
    let new_timestamp = timestamp_now()?;
    std::fs::write(snapshots_dir.join(format!("{new_timestamp}.md")), &content)
        .map_err(|e| format!("cannot write snapshot: {e}"))?;
    std::fs::write(snapshots_dir.join(format!("{new_timestamp}.name")), &name)
        .map_err(|e| format!("cannot write snapshot name: {e}"))?;

    Ok(SnapshotEntry {
        node_id,
        timestamp: new_timestamp,
        name,
        size_bytes: content.len() as u64,
        preview: preview_of(&content),
    })
}

#[tauri::command]
pub fn unpin_snapshot(project_path: String, node_id: String, timestamp: String) -> Result<(), String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    validate_timestamp(&timestamp)?;
    let dir = history_dir(&project, &node_id).join("snapshots");
    let _ = std::fs::remove_file(dir.join(format!("{timestamp}.md")));
    let _ = std::fs::remove_file(dir.join(format!("{timestamp}.name")));
    Ok(())
}

#[tauri::command]
pub fn restore_snapshot(project_path: String, node_id: String, timestamp: String) -> Result<String, String> {
    let project = require_project_and_safe_id(&project_path, &node_id)?;
    validate_timestamp(&timestamp)?;
    let path = history_dir(&project, &node_id).join("snapshots").join(format!("{timestamp}.md"));
    std::fs::read_to_string(&path).map_err(|_| "snapshot not found".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_dir(label: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "inprincipio-vh-test-{label}-{}-{}",
            std::process::id(),
            SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0)
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn validate_timestamp_rejects_non_digits() {
        assert!(validate_timestamp("1739300000123").is_ok());
        assert!(validate_timestamp("").is_err());
        assert!(validate_timestamp("../../etc").is_err());
        assert!(validate_timestamp("12a").is_err());
    }

    #[test]
    fn list_entries_sorts_newest_first_and_skips_non_backup_files() {
        let dir = temp_dir("list-entries");
        fs::write(dir.join("100.md"), "old").unwrap();
        fs::write(dir.join("200.md"), "new").unwrap();
        fs::write(dir.join("stray.txt"), "ignore me").unwrap();

        let entries = list_entries(&dir).unwrap();
        let timestamps: Vec<&str> = entries.iter().map(|(t, _, _)| t.as_str()).collect();
        assert_eq!(timestamps, vec!["200", "100"]);

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn prune_old_backups_keeps_only_the_newest_max() {
        let dir = temp_dir("prune");
        for i in 0..25u32 {
            fs::write(dir.join(format!("{i:03}.md")), "x").unwrap();
        }
        prune_old_backups(&dir).unwrap();
        let remaining = list_entries(&dir).unwrap();
        assert_eq!(remaining.len(), MAX_BACKUPS);
        // Newest (highest-numbered) survive.
        assert_eq!(remaining[0].0, "024");

        fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_entries_on_missing_dir_is_empty_not_error() {
        let dir = std::env::temp_dir().join("inprincipio-vh-test-does-not-exist");
        assert_eq!(list_entries(&dir).unwrap(), Vec::new());
    }
}
