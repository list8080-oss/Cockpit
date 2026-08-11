//! Image storage for the writing editor — images live under
//! `assets/images/` inside whichever project the active profile has
//! connected, so they travel with the manuscript instead of an app-data
//! sandbox disconnected from it. Path validation is shared with
//! `editor_project`, which owns the notion of "the active project dir".

use base64::{engine::general_purpose::STANDARD, Engine as _};
use crate::editor_project::active_editor_project_dir;
use std::path::{Path, PathBuf};

const MAX_IMAGE_SIZE: u64 = 20 * 1024 * 1024;
const ALLOWED_EXTS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"];

/// The write commands below take `project_path` from the frontend, which in
/// normal use is always whatever `get_editor_project_dir` returned — but a
/// command handler shouldn't trust caller-supplied paths on faith. Pin
/// writes to the one real, currently-active project dir so this can never
/// become a write path into an arbitrary folder even if some future
/// frontend bug passed something else through.
fn require_editor_project(project_path: &str) -> Result<PathBuf, String> {
    let given = PathBuf::from(project_path);
    let canonical_given = given
        .canonicalize()
        .map_err(|e| format!("Cannot resolve project path: {e}"))?;
    let canonical_real = active_editor_project_dir()?
        .canonicalize()
        .map_err(|e| format!("Cannot resolve editor project dir: {e}"))?;
    if canonical_given != canonical_real {
        return Err("project_path must be the active project directory".into());
    }
    Ok(canonical_real)
}

fn unique_dest_filename(original_name: &str, ext: &str) -> String {
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| format!("{:x}", d.as_millis()))
        .unwrap_or_else(|_| "img".into());
    format!("{stamp}-{original_name}.{ext}")
}

fn write_image_bytes(project: &Path, original_name: &str, ext: &str, bytes: &[u8]) -> Result<String, String> {
    if !ALLOWED_EXTS.contains(&ext) {
        return Err(format!("Unsupported image format: .{ext}"));
    }
    if bytes.len() as u64 > MAX_IMAGE_SIZE {
        return Err(format!(
            "Image too large ({:.1} MB). Maximum allowed size is 20 MB.",
            bytes.len() as f64 / (1024.0 * 1024.0)
        ));
    }

    let dest_filename = unique_dest_filename(original_name, ext);
    let dest_dir = project.join("assets").join("images");
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Cannot create images directory: {e}"))?;
    let dest_path = dest_dir.join(&dest_filename);
    std::fs::write(&dest_path, bytes).map_err(|e| format!("Failed to write image: {e}"))?;
    Ok(format!("assets/images/{dest_filename}"))
}

#[tauri::command]
pub fn import_image(project_path: String, source_path: String) -> Result<String, String> {
    let project = require_editor_project(&project_path)?;
    let source = PathBuf::from(&source_path);

    if !source.exists() {
        return Err(format!("Source file not found: {source_path}"));
    }

    let metadata =
        std::fs::metadata(&source).map_err(|e| format!("Cannot read image metadata: {e}"))?;
    if metadata.len() > MAX_IMAGE_SIZE {
        return Err(format!(
            "Image too large ({:.1} MB). Maximum allowed size is 20 MB.",
            metadata.len() as f64 / (1024.0 * 1024.0)
        ));
    }

    let ext = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    let original_name = source
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let bytes = std::fs::read(&source).map_err(|e| format!("Failed to read image: {e}"))?;
    write_image_bytes(&project, original_name, &ext, &bytes)
}

#[tauri::command]
pub fn import_image_bytes(
    project_path: String,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let project = require_editor_project(&project_path)?;
    let path = PathBuf::from(&file_name);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    let original_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    write_image_bytes(&project, original_name, &ext, &bytes)
}

#[tauri::command]
pub fn read_image_base64(project_path: String, relative_path: String) -> Result<String, String> {
    let project = require_editor_project(&project_path)?;
    let image_path = project.join(&relative_path);

    if !image_path.exists() {
        return Err(format!("Image not found: {relative_path}"));
    }

    let canonical_image = image_path
        .canonicalize()
        .map_err(|e| format!("Cannot resolve image path: {e}"))?;
    if !canonical_image.starts_with(&project) {
        return Err("Image path must be within the project directory".into());
    }

    let ext = image_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };

    let bytes = std::fs::read(&image_path).map_err(|e| format!("Cannot read image: {e}"))?;
    let b64 = STANDARD.encode(&bytes);

    Ok(format!("data:{mime};base64,{b64}"))
}
