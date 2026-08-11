//! Read-only access to the user's connected project — either a folder of
//! chapter files or a single manuscript file. Never writes — chapter edits
//! stay a manual, deliberate step the author does themselves after comparing
//! agent variants.

use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ChapterInfo {
    file: String,
    title: String,
}

fn configured_path() -> Result<PathBuf, String> {
    let path = crate::profiles::project_path_for("manuscript")
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    Ok(root)
}

/// Stable app-data sandbox for Orchestrator "free chat" context (phase 4).
/// Not the manuscript — agents run here when the user chose free conversation
/// so a connected project is not required and the manuscript stays untouched.
///
/// Honors `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` (same override `engines.rs`'s
/// `orchestrator_data_dir()` uses for the propose/apply journal) so tests that
/// exercise real file writes through this sandbox never touch the real
/// Application Support tree.
pub fn free_chat_root() -> Result<PathBuf, String> {
    let base = match std::env::var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR") {
        Ok(dir) => PathBuf::from(dir),
        Err(_) => dirs::data_dir().ok_or("data directory unavailable")?.join("yar-cockpit"),
    };
    let dir = base.join("orchestrator-free");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("cannot create free-chat working directory: {e}"))?;
    Ok(dir)
}

/// Resolve the engine working directory for Orchestrator context.
/// `free` → app-data sandbox (always available).
/// anything else (including `"project"`) → active profile workdir.
pub fn agent_workdir(context: &str) -> Result<PathBuf, String> {
    match context {
        "free" => free_chat_root(),
        _ => crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id()),
    }
}

/// Only meaningful in folder mode. Some profiles (e.g. manuscript) keep
/// chapters in a named subfolder; fall back to the project root so an
/// arbitrary folder of `.txt` files also works.
fn chapters_dir(root: &std::path::Path) -> PathBuf {
    if let Some(sub) = crate::profiles::chapters_subfolder(&crate::profiles::active_profile_id()) {
        let nested = root.join(sub);
        if nested.is_dir() {
            return nested;
        }
    }
    root.to_path_buf()
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

#[cfg(test)]
mod tests {
    use super::*;

    // Whether a project happens to be connected, and which profile happens
    // to be active, on the machine running `cargo test` is not something a
    // test should depend on — this compares `agent_workdir`'s routing
    // against resolving THE SAME active profile directly (not a hardcoded
    // one), so it holds either way (Ok or Err, whichever profile is active)
    // instead of requiring a specific real connection to pass.

    #[test]
    fn project_context_routes_through_active_profile() {
        let via_context = agent_workdir("project");
        let via_profile =
            crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id());
        match (via_context, via_profile) {
            (Ok(a), Ok(b)) => assert_eq!(a, b),
            (Err(a), Err(b)) => assert_eq!(a, b),
            other => panic!("agent_workdir(\"project\") and resolve_profile_workdir(active_profile_id()) disagree: {other:?}"),
        }
    }

    #[test]
    fn free_context_uses_app_data_sandbox() {
        // Asserts the real default location, so it must not run concurrently
        // with a test elsewhere that points YAR_COCKPIT_ORCHESTRATOR_DATA_DIR
        // at a temp sandbox instead — that env var is process-global.
        let _guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
        // Always available regardless of manuscript connection state.
        let got = agent_workdir("free").expect("free chat sandbox should always be creatable");
        assert!(got.ends_with("yar-cockpit/orchestrator-free"));
        assert!(got.is_dir());
    }
}
