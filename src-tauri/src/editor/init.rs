//! Initialize structured writing projects and migrate legacy chapter folders.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::frontmatter::{compose_document, utc_now_rfc3339, DocumentFrontmatter};
use super::io::atomic_write;
use super::manifest::{WritingProjectManifest, WritingProjectNode, MANIFEST_VERSION};
use super::mode::{detect_project_mode, ProjectMode};
use super::paths::{configured_project_path, ensure_project_layout, MANUSCRIPT_DIR};
use super::search_index::rebuild_writing_search_index;
use super::templates::{apply_writing_template, is_valid_template_id};
use crate::profiles;

pub fn detect_active_project_mode() -> Result<ProjectMode, String> {
    let root = configured_project_path()?;
    if root.is_file() {
        return Ok(ProjectMode::Legacy);
    }
    Ok(detect_project_mode(&root))
}

pub fn init_writing_project(template_id: Option<String>) -> Result<WritingProjectManifest, String> {
    let project_root = configured_project_path()?;
    if project_root.is_file() {
        return Err("Structured projects require a connected folder, not a single file.".into());
    }
    if detect_project_mode(&project_root) == ProjectMode::Structured {
        return Err("Project is already structured.".into());
    }

    let template = template_id.unwrap_or_else(|| "blank".to_string());
    if !is_valid_template_id(&template) {
        return Err(format!("Unknown template: {template}"));
    }

    ensure_project_layout(&project_root)?;
    let mut manifest = WritingProjectManifest::blank(&project_root);
    if template != "blank" {
        apply_writing_template(&project_root, &mut manifest, &template)?;
    }
    manifest.save(&project_root)?;
    if template != "blank" {
        let _ = rebuild_writing_search_index(&project_root, &manifest);
    }
    Ok(manifest)
}

/// Import legacy profile chapter files into `manuscript/` with frontmatter and write
/// `.inprincipio/project.json`.
pub fn migrate_legacy_writing_project() -> Result<WritingProjectManifest, String> {
    let project_root = configured_project_path()?;
    if project_root.is_file() {
        return Err("Migration requires a connected folder.".into());
    }
    if detect_project_mode(&project_root) == ProjectMode::Structured {
        return Err("Project is already structured.".into());
    }

    ensure_project_layout(&project_root)?;
    let chapters_dir = legacy_chapters_dir(&project_root)?;
    let entries = crate::manuscript::read_dir_retrying(&chapters_dir)
        .map_err(|e| format!("failed to read {}: {e}", chapters_dir.display()))?;

    let mut nodes = BTreeMap::new();
    let mut manuscript_roots = Vec::new();
    let now = utc_now_rfc3339();

    let mut files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.is_file() && is_writing_doc_file(p))
        .collect();
    files.sort();

    for source in files {
        let file_name = source
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or_else(|| "invalid chapter file name".to_string())?;
        let stem = source
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(file_name);
        let body = std::fs::read_to_string(&source)
            .map_err(|e| format!("failed to read {}: {e}", source.display()))?;
        let node_id = Uuid::new_v4().to_string();
        let relative = format!("{MANUSCRIPT_DIR}/{file_name}");
        let dest = project_root.join(&relative);

        if !dest.exists() {
            let fm = DocumentFrontmatter::new(
                node_id.clone(),
                "chapter".into(),
                title_from_stem(stem),
                &now,
            );
            atomic_write(&dest, &compose_document(&fm, &body))?;
        } else {
            let existing = std::fs::read_to_string(&dest)
                .map_err(|e| format!("failed to read {}: {e}", dest.display()))?;
            if super::frontmatter::split_document(&existing).is_err() {
                let fm = DocumentFrontmatter::new(
                    node_id.clone(),
                    "chapter".into(),
                    title_from_stem(stem),
                    &now,
                );
                atomic_write(&dest, &compose_document(&fm, &existing))?;
            }
        }

        nodes.insert(
            node_id.clone(),
            WritingProjectNode {
                title: Some(title_from_stem(stem)),
                file: Some(relative),
                doc_type: Some("chapter".into()),
                children: Vec::new(),
            },
        );
        manuscript_roots.push(node_id);
    }

    let manifest = WritingProjectManifest {
        version: MANIFEST_VERSION,
        root: project_root.to_string_lossy().into_owned(),
        nodes,
        manuscript_roots,
        planning_roots: Vec::new(),
        doc_types: Vec::new(),
        tag_colors: BTreeMap::new(),
        status_colors: None,
    };
    manifest.save(&project_root)?;
    Ok(manifest)
}

fn legacy_chapters_dir(project_root: &Path) -> Result<PathBuf, String> {
    let profile_id = profiles::active_profile_id();
    if let Some(sub) = profiles::chapters_subfolder(&profile_id) {
        let dir = project_root.join(sub);
        if dir.is_dir() {
            return Ok(dir);
        }
    }
    Ok(crate::manuscript::chapters_dir(project_root))
}

fn is_writing_doc_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| {
            let lower = ext.to_lowercase();
            lower == "txt" || lower == "md"
        })
        .unwrap_or(false)
}

fn title_from_stem(stem: &str) -> String {
    stem.replace('_', " ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::mode::ProjectMode;
    use crate::test_env_lock::ENV_LOCK;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct Sandbox<'a> {
        _guard: std::sync::MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl Sandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let root = std::env::temp_dir().join(format!(
                "inprincipio-editor-init-{label}-{}-{}",
                std::process::id(),
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_nanos())
                    .unwrap_or(0)
            ));
            let _ = std::fs::remove_dir_all(&root);
            std::fs::create_dir_all(&root).unwrap();
            std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &root);
            Self { _guard: guard, root }
        }
    }

    impl Drop for Sandbox<'_> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn init_blank_creates_manifest_and_layout() {
        let sandbox = Sandbox::new("init-blank");
        let project = sandbox.root.join("book");
        std::fs::create_dir_all(&project).unwrap();
        profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();

        let manifest = init_writing_project(Some("blank".into())).expect("init");
        assert_eq!(manifest.version, MANIFEST_VERSION);
        assert!(manifest.nodes.is_empty());
        assert_eq!(detect_active_project_mode().unwrap(), ProjectMode::Structured);
    }

    #[test]
    fn init_novel_template_populates_manifest() {
        let sandbox = Sandbox::new("init-novel");
        let project = sandbox.root.join("book");
        std::fs::create_dir_all(&project).unwrap();
        profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();

        let manifest = init_writing_project(Some("novel".into())).expect("init novel");
        assert_eq!(manifest.manuscript_roots.len(), 3);
        assert!(manifest.nodes.len() > 20);
    }

    #[test]
    fn migrate_legacy_chapters_from_glavy() {
        let sandbox = Sandbox::new("migrate");
        let project = sandbox.root.join("book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();
        std::fs::write(chapters.join("01_intro.txt"), "Opening line.").unwrap();
        std::fs::write(chapters.join("02_next.md"), "Second chapter.").unwrap();
        profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();

        let manifest = migrate_legacy_writing_project().expect("migrate");
        assert_eq!(manifest.manuscript_roots.len(), 2);
        assert_eq!(manifest.nodes.len(), 2);

        let intro = project.join("manuscript/01_intro.txt");
        assert!(intro.is_file());
        let raw = std::fs::read_to_string(intro).unwrap();
        let parsed = super::super::frontmatter::split_document(&raw).expect("frontmatter");
        assert_eq!(parsed.body, "Opening line.");

        assert_eq!(detect_active_project_mode().unwrap(), ProjectMode::Structured);
    }
}
