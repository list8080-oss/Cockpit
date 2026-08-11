//! The writing editor's real, on-disk multi-document project — the same
//! project the active profile has connected (a folder of chapter files, or a
//! single manuscript file), now with read *and* write access for the editor
//! itself. `manuscript.rs` stays read-only for the Orchestrator's AI-variant
//! panels; this module is the editor's own view onto the same files.

use serde::Serialize;
use std::collections::BTreeMap;
use std::path::PathBuf;

const DOC_EXTENSIONS: &[&str] = &["txt", "md"];

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
}

#[derive(Debug, Serialize)]
pub struct DocumentContentDto {
    id: String,
    title: String,
    doc_type: String,
    content: String,
    file: String,
}

#[derive(Debug, Serialize)]
pub struct WordCountResultDto {
    total_words: u64,
    total_chars: u64,
}

/// The directory `projectPath` means everywhere in the editor (image assets,
/// version history root) — always a directory, even when the connected path
/// is a single file (then it's that file's parent).
pub fn active_editor_project_dir() -> Result<PathBuf, String> {
    crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id())
}

/// The raw path the active profile has connected — a folder of chapters, or
/// a single file. Distinct from `active_editor_project_dir` (which collapses
/// file-mode to the file's parent) because listing documents needs to know
/// which mode it's in.
fn configured_project_path() -> Result<PathBuf, String> {
    let profile_id = crate::profiles::active_profile_id();
    let path = crate::profiles::project_path_for(&profile_id)
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    Ok(root)
}

/// Every editor-scoped command below takes `project_path` from the
/// frontend, which in normal use is always whatever `get_editor_project_dir`
/// returned — but that's caller-supplied input, not something to trust on
/// faith. Pin it to the one real, currently-active project directory so a
/// stale or forged value can never point a read or write somewhere else.
fn resolve_editor_project(project_path: &str) -> Result<PathBuf, String> {
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

fn node_title(file_stem: &str) -> String {
    file_stem.replace('_', " ")
}

fn is_doc_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    DOC_EXTENSIONS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{ext}")))
}

/// `(id, title, file)` for every document the active project currently has,
/// sorted by filename. `id` and `file` are both the bare filename — stable
/// across reloads, safe to use as a path segment (no separators, checked at
/// the single point files enter this list: `read_dir` never yields `..` or
/// slashes in a `file_name()`).
fn list_documents() -> Result<Vec<(String, String, String)>, String> {
    let root = configured_project_path()?;

    if root.is_file() {
        let file = root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let stem = root.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        return Ok(vec![(file.clone(), node_title(&stem), file)]);
    }

    let dir = crate::manuscript::chapters_dir(&root);
    let mut files: Vec<String> = std::fs::read_dir(&dir)
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

/// Resolve a document id (bare filename, as returned by `list_documents`) to
/// its path on disk. Rejects anything with a separator or `..` outright, and
/// anything that isn't actually one of the project's documents — so this can
/// never become a read/write path outside the connected project.
fn resolve_document_path(node_id: &str) -> Result<PathBuf, String> {
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    let root = configured_project_path()?;
    if root.is_file() {
        let expected_id = root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        if node_id != expected_id {
            return Err(format!("unknown document: {node_id}"));
        }
        return Ok(root);
    }
    let path = crate::manuscript::chapters_dir(&root).join(node_id);
    if !path.is_file() {
        return Err(format!("unknown document: {node_id}"));
    }
    Ok(path)
}

fn word_count(text: &str) -> u64 {
    text.split_whitespace().count() as u64
}

fn char_count(text: &str) -> u64 {
    text.chars().count() as u64
}

#[tauri::command]
pub fn get_editor_project_dir() -> Result<String, String> {
    Ok(active_editor_project_dir()?.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn list_editor_documents(project_path: String) -> Result<ProjectManifestDto, String> {
    let root = resolve_editor_project(&project_path)?;
    let docs = list_documents()?;
    let nodes = docs
        .into_iter()
        .map(|(id, title, file)| {
            (
                id,
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
    })
}

#[tauri::command]
pub fn load_document(project_path: String, node_id: String) -> Result<DocumentContentDto, String> {
    resolve_editor_project(&project_path)?;
    let path = resolve_document_path(&node_id)?;
    let content = std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let stem = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
    Ok(DocumentContentDto {
        id: node_id.clone(),
        title: node_title(&stem),
        doc_type: "chapter".into(),
        content,
        file: node_id,
    })
}

#[tauri::command]
pub fn save_document(project_path: String, node_id: String, content: String) -> Result<(), String> {
    resolve_editor_project(&project_path)?;
    let path = resolve_document_path(&node_id)?;
    std::fs::write(&path, content).map_err(|e| format!("failed to write {}: {e}", path.display()))
}

#[tauri::command]
pub fn get_manuscript_word_count(project_path: String) -> Result<WordCountResultDto, String> {
    resolve_editor_project(&project_path)?;
    let docs = list_documents()?;
    let (mut total_words, mut total_chars) = (0u64, 0u64);
    for (id, _, _) in docs {
        if let Ok(path) = resolve_document_path(&id) {
            if let Ok(content) = std::fs::read_to_string(&path) {
                total_words += word_count(&content);
                total_chars += char_count(&content);
            }
        }
    }
    Ok(WordCountResultDto { total_words, total_chars })
}

/// Shared with `version_history.rs`: proves `project_path` really is the
/// active project directory, and that `node_id` is shape-safe to use as a
/// path segment (no separators, no `..`). Deliberately does *not* require
/// `node_id` to be a document that still exists in the current listing —
/// history for a chapter the user since renamed or deleted on disk should
/// stay browsable.
pub(crate) fn require_project_and_safe_id(project_path: &str, node_id: &str) -> Result<PathBuf, String> {
    let project = resolve_editor_project(project_path)?;
    if node_id.is_empty() || node_id.contains('/') || node_id.contains('\\') || node_id.contains("..") {
        return Err("invalid document id".into());
    }
    Ok(project)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn node_title_replaces_underscores() {
        assert_eq!(node_title("01_the_beginning"), "01 the beginning");
    }

    #[test]
    fn is_doc_file_accepts_txt_and_md_case_insensitively() {
        assert!(is_doc_file("chapter.txt"));
        assert!(is_doc_file("chapter.MD"));
        assert!(!is_doc_file("image.png"));
        assert!(!is_doc_file("notes"));
    }

    #[test]
    fn word_and_char_count_match_frontend_semantics() {
        assert_eq!(word_count("  hello   world  "), 2);
        assert_eq!(word_count(""), 0);
        assert_eq!(char_count("héllo"), 5);
    }

    // ── Integration: a connected "manuscript" profile end to end ──────────

    struct ProjectSandbox<'a> {
        _guard: std::sync::MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl ProjectSandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
            let root = std::env::temp_dir().join(format!(
                "inprincipio-editor-project-test-{label}-{}-{}",
                std::process::id(),
                SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0)
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

    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn lists_loads_and_saves_chapters_in_the_active_manuscript_profile() {
        let sandbox = ProjectSandbox::new("roundtrip");
        let project = sandbox.root.join("my-book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();
        std::fs::write(chapters.join("01_intro.txt"), "Hello world").unwrap();
        std::fs::write(chapters.join("02_middle.md"), "Chapter two text here").unwrap();
        std::fs::write(chapters.join("notes.png"), "not a document").unwrap();

        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");

        let dir = active_editor_project_dir().expect("resolve project dir");
        let manifest = list_editor_documents(dir.to_string_lossy().into_owned()).expect("list docs");
        assert_eq!(manifest.nodes.len(), 2, "{:?}", manifest.nodes.keys().collect::<Vec<_>>());
        assert!(manifest.nodes.contains_key("01_intro.txt"));
        assert!(manifest.nodes.contains_key("02_middle.md"));

        let loaded = load_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into())
            .expect("load doc");
        assert_eq!(loaded.content, "Hello world");
        assert_eq!(loaded.title, "01 intro");

        save_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into(), "Edited content".into())
            .expect("save doc");
        let reloaded = load_document(dir.to_string_lossy().into_owned(), "01_intro.txt".into())
            .expect("reload doc");
        assert_eq!(reloaded.content, "Edited content");

        let count = get_manuscript_word_count(dir.to_string_lossy().into_owned()).expect("word count");
        assert_eq!(count.total_words, 2 /* "Edited content" */ + 4 /* "Chapter two text here" */);
    }

    #[test]
    fn save_document_rejects_unknown_id() {
        let sandbox = ProjectSandbox::new("unknown-id");
        let project = sandbox.root.join("empty-book");
        std::fs::create_dir_all(project.join("Главы")).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");
        let dir = active_editor_project_dir().expect("resolve project dir");
        let err = save_document(dir.to_string_lossy().into_owned(), "../../etc/passwd".into(), "x".into())
            .unwrap_err();
        assert!(err.contains("invalid document id"), "{err}");
    }

    #[test]
    fn resolve_editor_project_rejects_a_foreign_path() {
        let sandbox = ProjectSandbox::new("foreign-path");
        let project = sandbox.root.join("my-book");
        std::fs::create_dir_all(project.join("Главы")).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");
        let elsewhere = sandbox.root.join("somewhere-else");
        std::fs::create_dir_all(&elsewhere).unwrap();
        let err = list_editor_documents(elsewhere.to_string_lossy().into_owned()).unwrap_err();
        assert!(err.contains("must be the active project"), "{err}");
    }
}
