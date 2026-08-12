//! Filesystem layout for the InPrincipio writing editor module.

use std::path::{Path, PathBuf};

pub const INPRINCIPIO_DIR: &str = ".inprincipio";
pub const PROJECT_JSON: &str = "project.json";
pub const MANUSCRIPT_DIR: &str = "manuscript";
pub const PLANNING_DIR: &str = "kb";
pub const ASSETS_IMAGES_DIR: &str = "assets/images";
pub const HISTORY_DIR: &str = "history";

/// Working directory for the active profile (folder, or parent when a single file is connected).
pub fn active_editor_project_dir() -> Result<PathBuf, String> {
    crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id())
}

/// Raw connected path — folder of documents, or a single file.
pub fn configured_project_path() -> Result<PathBuf, String> {
    let profile_id = crate::profiles::active_profile_id();
    let path = crate::profiles::project_path_for(&profile_id)
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    Ok(root)
}

pub fn inprincipio_dir(project_root: &Path) -> PathBuf {
    project_root.join(INPRINCIPIO_DIR)
}

pub fn project_manifest_path(project_root: &Path) -> PathBuf {
    inprincipio_dir(project_root).join(PROJECT_JSON)
}

pub fn history_root(project_root: &Path) -> PathBuf {
    inprincipio_dir(project_root).join(HISTORY_DIR)
}

pub fn search_index_path(project_root: &Path) -> PathBuf {
    inprincipio_dir(project_root).join("search.db")
}

/// Validates caller-supplied `project_path` against the active project directory.
pub fn resolve_editor_project(project_path: &str) -> Result<PathBuf, String> {
    let given = PathBuf::from(project_path);
    let canonical_given = given
        .canonicalize()
        .map_err(|e| format!("Cannot resolve project path: {e}"))?;
    let canonical_real = active_editor_project_dir()?
        .canonicalize()
        .map_err(|e| format!("Cannot resolve editor project dir: {e}"))?;
    if canonical_given != canonical_real {
        return Err("project_path must be the active project's directory".into());
    }
    Ok(canonical_real)
}

/// Ensures standard editor subfolders exist under the connected project root.
pub fn ensure_project_layout(project_root: &Path) -> Result<(), String> {
    for dir in [
        inprincipio_dir(project_root),
        project_root.join(MANUSCRIPT_DIR),
        project_root.join(PLANNING_DIR),
        project_root.join(ASSETS_IMAGES_DIR),
        history_root(project_root),
    ] {
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("cannot create {}: {e}", dir.display()))?;
    }
    Ok(())
}

/// Resolve a manifest-relative file path and prove it stays inside `project_root`.
pub fn resolve_project_relative_file(project_root: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.is_empty()
        || relative.contains('\\')
        || relative.starts_with('/')
        || relative.split('/').any(|part| part == "..")
    {
        return Err("invalid document path".into());
    }
    let canonical_root = project_root
        .canonicalize()
        .map_err(|e| format!("cannot resolve project root: {e}"))?;
    let path = project_root.join(relative);
    if !path.is_file() {
        return Err(format!("document file not found: {relative}"));
    }
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("cannot resolve document path: {e}"))?;
    if !canonical_path.starts_with(&canonical_root) {
        return Err(format!("document path escapes project: {relative}"));
    }
    Ok(path)
}
