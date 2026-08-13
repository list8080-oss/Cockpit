//! Tauri IPC for the writing editor — legacy flat projects and structured manifests.

use serde::Serialize;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use super::corkboard::{get_writing_corkboard, CorkboardViewDto};
use super::doc_types::{self, DocTypeDefinition};
use super::export::{
    export_writing_project_for_ipc, get_writing_readthrough, ExportResultDto, ReadThroughDto,
};
use super::frontmatter::{compose_document, split_document, utc_now_rfc3339};
use super::init::{detect_active_project_mode, init_writing_project, migrate_legacy_writing_project};
use super::io::atomic_write;
use super::manifest::WritingProjectManifest;
use super::metadata::{list_writing_project_metadata, update_writing_node_metadata, NodeMetadataDto};
use super::mode::ProjectMode;
use super::search_index::{
    ensure_writing_search_index, get_writing_backlinks, index_writing_node,
    rebuild_writing_search_index, search_writing_project, BacklinkResultDto, SearchResultDto,
};
use super::nodes::{
    create_writing_node, delete_writing_node, move_writing_node, rename_writing_node,
};
use super::paths::{
    configured_project_path, resolve_editor_project, resolve_project_relative_file,
};

const LEGACY_DOC_EXTENSIONS: &[&str] = &["txt", "md"];

#[derive(Debug, Serialize)]
pub struct ProjectNodeDto {
    title: Option<String>,
    file: Option<String>,
    doc_type: Option<String>,
    children: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ProjectManifestDto {
    version: u32,
    root: String,
    nodes: BTreeMap<String, ProjectNodeDto>,
    doc_types: Vec<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    manuscript_roots: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    planning_roots: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag_colors: Option<BTreeMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status_colors: Option<BTreeMap<String, String>>,
    mode: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentContentDto {
    id: String,
    title: String,
    doc_type: String,
    content: String,
    file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    synopsis: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WordCountResultDto {
    total_words: u64,
    total_chars: u64,
}

pub use super::paths::active_editor_project_dir;

#[tauri::command]
pub fn get_editor_project_dir() -> Result<String, String> {
    Ok(active_editor_project_dir()?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn detect_editor_project_mode() -> Result<String, String> {
    Ok(detect_active_project_mode()?.as_str().into())
}

#[tauri::command]
pub fn init_writing_project_command(template_id: Option<String>) -> Result<ProjectManifestDto, String> {
    let manifest = init_writing_project(template_id)?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn migrate_legacy_writing_project_command() -> Result<ProjectManifestDto, String> {
    let manifest = migrate_legacy_writing_project()?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn list_writing_doc_types() -> Vec<DocTypeDefinition> {
    doc_types::builtin_doc_types()
}

#[tauri::command]
pub fn create_writing_node_command(
    project_path: String,
    parent_id: Option<String>,
    section: String,
    doc_type: String,
    title: String,
) -> Result<ProjectManifestDto, String> {
    let manifest = create_writing_node(&project_path, parent_id, section, doc_type, title)?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn rename_writing_node_command(
    project_path: String,
    node_id: String,
    new_title: String,
) -> Result<ProjectManifestDto, String> {
    let manifest = rename_writing_node(&project_path, node_id, new_title)?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn delete_writing_node_command(
    project_path: String,
    node_id: String,
    delete_children: bool,
) -> Result<ProjectManifestDto, String> {
    let manifest = delete_writing_node(&project_path, node_id, delete_children)?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn move_writing_node_command(
    project_path: String,
    node_id: String,
    new_parent_id: Option<String>,
    section: String,
    index: usize,
) -> Result<ProjectManifestDto, String> {
    let manifest = move_writing_node(&project_path, node_id, new_parent_id, section, index)?;
    manifest_to_dto(manifest, ProjectMode::Structured)
}

#[tauri::command]
pub fn list_writing_project_metadata_command(
    project_path: String,
) -> Result<BTreeMap<String, NodeMetadataDto>, String> {
    list_writing_project_metadata(&project_path)
}

#[tauri::command]
pub fn update_writing_node_metadata_command(
    project_path: String,
    node_id: String,
    synopsis: Option<String>,
    tags: Vec<String>,
    status: String,
) -> Result<NodeMetadataDto, String> {
    let meta = update_writing_node_metadata(&project_path, node_id.clone(), synopsis, tags, status)?;
    if let Ok(connected) = configured_project_path() {
        if let Ok(manifest) = WritingProjectManifest::load(&connected) {
            let _ = index_writing_node(&connected, &manifest, &node_id);
        }
    }
    Ok(meta)
}

#[tauri::command]
pub fn ensure_writing_search_index_command(project_path: String) -> Result<(), String> {
    let connected = configured_project_path()?;
    resolve_editor_project(&project_path)?;
    let manifest = WritingProjectManifest::load(&connected)?;
    ensure_writing_search_index(&connected, &manifest)
}

#[tauri::command]
pub fn rebuild_writing_search_index_command(project_path: String) -> Result<(), String> {
    let connected = configured_project_path()?;
    resolve_editor_project(&project_path)?;
    let manifest = WritingProjectManifest::load(&connected)?;
    rebuild_writing_search_index(&connected, &manifest)
}

#[tauri::command]
pub fn search_writing_project_command(
    project_path: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResultDto>, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    search_writing_project(&connected, &query, limit)
}

#[tauri::command]
pub fn get_writing_backlinks_command(
    project_path: String,
    node_id: String,
) -> Result<Vec<BacklinkResultDto>, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let manifest = WritingProjectManifest::load(&connected)?;
    get_writing_backlinks(&connected, &manifest, &node_id)
}

#[tauri::command]
pub fn get_writing_corkboard_command(project_path: String) -> Result<CorkboardViewDto, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let manifest = WritingProjectManifest::load(&connected)?;
    get_writing_corkboard(&connected, &manifest)
}

#[tauri::command]
pub fn get_writing_readthrough_command(project_path: String) -> Result<ReadThroughDto, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let manifest = WritingProjectManifest::load(&connected)?;
    get_writing_readthrough(&connected, &manifest)
}

#[tauri::command]
pub fn export_writing_project_command(
    project_path: String,
    format: String,
    output_path: String,
) -> Result<ExportResultDto, String> {
    export_writing_project_for_ipc(&project_path, format, output_path)
}

#[tauri::command]
pub fn list_editor_documents(project_path: String) -> Result<ProjectManifestDto, String> {
    let root = resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let mode = if connected.is_file() {
        ProjectMode::Legacy
    } else {
        super::mode::detect_project_mode(&connected)
    };

    match mode {
        ProjectMode::Legacy => {
            let docs = list_legacy_documents()?;
            let nodes = docs
                .into_iter()
                .map(|(id, title, file)| {
                    (
                        id.clone(),
                        ProjectNodeDto {
                            title: Some(title),
                            file: Some(file),
                            doc_type: Some("chapter".into()),
                            children: Vec::new(),
                        },
                    )
                })
                .collect();
            Ok(ProjectManifestDto {
                version: 1,
                root: root.to_string_lossy().into_owned(),
                nodes,
                doc_types: Vec::new(),
                manuscript_roots: None,
                planning_roots: None,
                tag_colors: None,
                status_colors: None,
                mode: ProjectMode::Legacy.as_str().into(),
            })
        }
        ProjectMode::Structured => {
            let manifest = WritingProjectManifest::load(&connected)?;
            manifest_to_dto(manifest, ProjectMode::Structured)
        }
    }
}

#[tauri::command]
pub fn load_document(project_path: String, node_id: String) -> Result<DocumentContentDto, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let mode = document_mode(&connected)?;

    match mode {
        ProjectMode::Legacy => load_legacy_document(&node_id),
        ProjectMode::Structured => load_structured_document(&connected, &node_id),
    }
}

#[tauri::command]
pub fn save_document(project_path: String, node_id: String, content: String) -> Result<(), String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let mode = document_mode(&connected)?;

    match mode {
        ProjectMode::Legacy => save_legacy_document(&node_id, &content),
        ProjectMode::Structured => save_structured_document(&connected, &node_id, &content),
    }
}

#[tauri::command]
pub fn get_manuscript_word_count(project_path: String) -> Result<WordCountResultDto, String> {
    resolve_editor_project(&project_path)?;
    let connected = configured_project_path()?;
    let mode = document_mode(&connected)?;

    let (mut total_words, mut total_chars) = (0u64, 0u64);
    match mode {
        ProjectMode::Legacy => {
            for (id, _, _) in list_legacy_documents()? {
                if let Ok(path) = resolve_legacy_document_path(&id) {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        total_words += word_count(&content);
                        total_chars += char_count(&content);
                    }
                }
            }
        }
        ProjectMode::Structured => {
            let manifest = WritingProjectManifest::load(&connected)?;
            for node in manifest.nodes.values() {
                if let Some(ref relative) = node.file {
                    if let Ok(path) = resolve_project_relative_file(&connected, relative) {
                        if let Ok(raw) = std::fs::read_to_string(&path) {
                            let body = split_document(&raw).map(|p| p.body).unwrap_or(raw);
                            total_words += word_count(&body);
                            total_chars += char_count(&body);
                        }
                    }
                }
            }
        }
    }
    Ok(WordCountResultDto {
        total_words,
        total_chars,
    })
}

pub fn require_project_and_safe_id(project_path: &str, node_id: &str) -> Result<PathBuf, String> {
    let project = resolve_editor_project(project_path)?;
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    Ok(project)
}

fn manifest_to_dto(manifest: WritingProjectManifest, mode: ProjectMode) -> Result<ProjectManifestDto, String> {
    let nodes = manifest
        .nodes
        .into_iter()
        .map(|(id, node)| {
            (
                id,
                ProjectNodeDto {
                    title: node.title,
                    file: node.file,
                    doc_type: node.doc_type,
                    children: node.children,
                },
            )
        })
        .collect();
    Ok(ProjectManifestDto {
        version: manifest.version,
        root: manifest.root,
        nodes,
        doc_types: if manifest.doc_types.is_empty() {
            serde_json::to_value(doc_types::builtin_doc_types())
                .ok()
                .and_then(|v| v.as_array().cloned())
                .unwrap_or_default()
        } else {
            manifest.doc_types
        },
        manuscript_roots: Some(manifest.manuscript_roots),
        planning_roots: Some(manifest.planning_roots),
        tag_colors: if manifest.tag_colors.is_empty() {
            None
        } else {
            Some(manifest.tag_colors)
        },
        status_colors: manifest.status_colors,
        mode: mode.as_str().into(),
    })
}

fn document_mode(connected: &Path) -> Result<ProjectMode, String> {
    if connected.is_file() {
        Ok(ProjectMode::Legacy)
    } else {
        Ok(super::mode::detect_project_mode(connected))
    }
}

fn node_title(file_stem: &str) -> String {
    file_stem.replace('_', " ")
}

fn is_doc_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    LEGACY_DOC_EXTENSIONS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{ext}")))
}

fn list_legacy_documents() -> Result<Vec<(String, String, String)>, String> {
    let root = configured_project_path()?;
    if root.is_file() {
        let file = root
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let stem = root
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        return Ok(vec![(file.clone(), node_title(&stem), file)]);
    }

    let dir = crate::manuscript::chapters_dir(&root);
    let mut files: Vec<String> = crate::manuscript::read_dir_retrying(&dir)
        .map_err(|e| format!("failed to read {}: {e}", dir.display()))?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| is_doc_file(name))
        .collect();
    files.sort();
    Ok(files
        .into_iter()
        .map(|file| {
            let stem = file.rsplit_once('.').map(|(s, _)| s).unwrap_or(&file).to_string();
            (file.clone(), node_title(&stem), file)
        })
        .collect())
}

fn resolve_legacy_document_path(node_id: &str) -> Result<PathBuf, String> {
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    let root = configured_project_path()?;
    if root.is_file() {
        let expected_id = root
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        if node_id != expected_id {
            return Err(format!("unknown document: {node_id}"));
        }
        return Ok(root);
    }
    let canonical_root = root
        .canonicalize()
        .map_err(|e| format!("cannot resolve project root: {e}"))?;
    let path = crate::manuscript::chapters_dir(&root).join(node_id);
    if !path.is_file() {
        return Err(format!("unknown document: {node_id}"));
    }
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("cannot resolve document path: {e}"))?;
    if !canonical_path.starts_with(&canonical_root) {
        return Err(format!("unknown document: {node_id}"));
    }
    Ok(path)
}

fn load_legacy_document(node_id: &str) -> Result<DocumentContentDto, String> {
    let path = resolve_legacy_document_path(node_id)?;
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    Ok(DocumentContentDto {
        id: node_id.to_string(),
        title: node_title(&stem),
        doc_type: "chapter".into(),
        content,
        file: node_id.to_string(),
        synopsis: None,
        tags: Vec::new(),
        status: None,
    })
}

fn save_legacy_document(node_id: &str, content: &str) -> Result<(), String> {
    let path = resolve_legacy_document_path(node_id)?;
    atomic_write(&path, content)
}

fn load_structured_document(project_root: &Path, node_id: &str) -> Result<DocumentContentDto, String> {
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    let manifest = WritingProjectManifest::load(project_root)?;
    let node = manifest
        .nodes
        .get(node_id)
        .ok_or_else(|| format!("unknown document: {node_id}"))?;
    let relative = node
        .file
        .as_ref()
        .ok_or_else(|| format!("document has no file: {node_id}"))?;
    let path = resolve_project_relative_file(project_root, relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let parsed = split_document(&raw)?;
    Ok(DocumentContentDto {
        id: parsed.frontmatter.id,
        title: parsed.frontmatter.title,
        doc_type: parsed.frontmatter.doc_type,
        content: parsed.body,
        file: relative.clone(),
        synopsis: parsed.frontmatter.synopsis,
        tags: parsed.frontmatter.tags,
        status: Some(parsed.frontmatter.status),
    })
}

fn save_structured_document(
    project_root: &Path,
    node_id: &str,
    content: &str,
) -> Result<(), String> {
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    let manifest = WritingProjectManifest::load(project_root)?;
    let node = manifest
        .nodes
        .get(node_id)
        .ok_or_else(|| format!("unknown document: {node_id}"))?;
    let relative = node
        .file
        .as_ref()
        .ok_or_else(|| format!("document has no file: {node_id}"))?;
    let path = resolve_project_relative_file(project_root, relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut parsed = split_document(&raw)?;
    if parsed.frontmatter.id != node_id {
        return Err("document id mismatch".into());
    }
    parsed.frontmatter.modified = utc_now_rfc3339();
    atomic_write(&path, &compose_document(&parsed.frontmatter, content))?;
    if let Ok(manifest) = WritingProjectManifest::load(project_root) {
        let _ = index_writing_node(project_root, &manifest, node_id);
    }
    Ok(())
}

fn word_count(text: &str) -> u64 {
    text.split_whitespace().count() as u64
}

fn char_count(text: &str) -> u64 {
    text.chars().count() as u64
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env_lock::ENV_LOCK;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct ProjectSandbox<'a> {
        _guard: std::sync::MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl ProjectSandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let root = std::env::temp_dir().join(format!(
                "inprincipio-editor-project-test-{label}-{}-{}",
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

    impl Drop for ProjectSandbox<'_> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn legacy_lists_loads_and_saves_chapters() {
        let sandbox = ProjectSandbox::new("roundtrip");
        let project = sandbox.root.join("my-book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();
        std::fs::write(chapters.join("01_intro.txt"), "Hello world").unwrap();
        std::fs::write(chapters.join("02_middle.md"), "Chapter two text here").unwrap();

        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");

        let dir = active_editor_project_dir().expect("resolve project dir");
        let manifest = list_editor_documents(dir.to_string_lossy().into_owned()).expect("list docs");
        assert_eq!(manifest.mode, "legacy");
        assert_eq!(manifest.nodes.len(), 2);

        let loaded = load_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into())
            .expect("load doc");
        assert_eq!(loaded.content, "Hello world");

        save_document(
            dir.to_string_lossy().into_owned(),
            "01_intro.txt".into(),
            "Edited content".into(),
        )
        .expect("save doc");
        let reloaded = load_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into())
            .expect("reload doc");
        assert_eq!(reloaded.content, "Edited content");
    }

    #[test]
    fn structured_roundtrip_after_migration() {
        let sandbox = ProjectSandbox::new("structured");
        let project = sandbox.root.join("my-book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();
        std::fs::write(chapters.join("01_intro.txt"), "Structured body").unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");

        migrate_legacy_writing_project_command().expect("migrate");
        let dir = active_editor_project_dir().expect("dir");
        let manifest = list_editor_documents(dir.to_string_lossy().into_owned()).expect("list");
        assert_eq!(manifest.mode, "structured");
        assert_eq!(manifest.nodes.len(), 1);
        let node_id = manifest.manuscript_roots.as_ref().unwrap()[0].clone();

        let loaded = load_document(dir.to_string_lossy().into_owned(), node_id.clone()).expect("load");
        assert_eq!(loaded.content, "Structured body");

        save_document(
            dir.to_string_lossy().into_owned(),
            node_id,
            "Updated structured body".into(),
        )
        .expect("save");
    }

    #[test]
    fn save_document_rejects_unknown_id() {
        let sandbox = ProjectSandbox::new("unknown-id");
        let project = sandbox.root.join("empty-book");
        std::fs::create_dir_all(project.join("Главы")).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");
        let dir = active_editor_project_dir().expect("resolve project dir");
        let err = save_document(
            dir.to_string_lossy().into_owned(),
            "../../etc/passwd".into(),
            "x".into(),
        )
        .unwrap_err();
        assert!(err.contains("invalid document id"), "{err}");
    }

    #[cfg(unix)]
    #[test]
    fn load_and_save_reject_a_symlink_escaping_the_project() {
        let sandbox = ProjectSandbox::new("symlink-escape");
        let project = sandbox.root.join("my-book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();

        let outside = sandbox.root.join("outside-secret.txt");
        std::fs::write(&outside, "not part of the manuscript").unwrap();
        std::os::unix::fs::symlink(&outside, chapters.join("01_intro.txt")).unwrap();

        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");
        let dir = active_editor_project_dir().expect("resolve project dir");

        let load_err = load_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into())
            .expect_err("reading through an escaping symlink must be rejected");
        assert!(load_err.contains("unknown document"), "{load_err}");
    }
}
