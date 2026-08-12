//! CRUD for nodes in a structured writing project.

use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::doc_types::{doc_type_category, is_known_doc_type};
use super::frontmatter::{compose_document, split_document, utc_now_rfc3339, DocumentFrontmatter};
use super::io::atomic_write;
use super::manifest::{WritingProjectManifest, WritingProjectNode};
use super::mode::{detect_project_mode, ProjectMode};
use super::paths::{
    configured_project_path, resolve_editor_project, MANUSCRIPT_DIR, PLANNING_DIR,
};
use super::search_index::{index_writing_node, remove_writing_node_from_index};

fn require_structured(project_root: &Path) -> Result<(), String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Err("Node operations require a structured project.".into());
    }
    Ok(())
}

pub(crate) fn load_mut_root(project_path: &str) -> Result<(PathBuf, WritingProjectManifest), String> {
    let _root = resolve_editor_project(project_path)?;
    let connected = configured_project_path()?;
    require_structured(&connected)?;
    let manifest = WritingProjectManifest::load(&connected)?;
    Ok((connected, manifest))
}

fn save_manifest(project_root: &Path, manifest: &WritingProjectManifest) -> Result<(), String> {
    manifest.save(project_root)
}

fn slugify(title: &str) -> String {
    let mut slug = String::new();
    let mut last_dash = false;
    for ch in title.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash {
            slug.push('_');
            last_dash = true;
        }
    }
    let slug = slug.trim_matches('_').to_string();
    if slug.is_empty() {
        "untitled".into()
    } else {
        slug
    }
}

fn unique_relative_path(project_root: &Path, section_dir: &str, doc_type: &str, title: &str) -> String {
    let base = format!("{section_dir}/{}_{}.md", doc_type, slugify(title));
    if !project_root.join(&base).exists() {
        return base;
    }
    let suffix = &Uuid::new_v4().to_string()[..8];
    format!("{section_dir}/{}_{}_{suffix}.md", doc_type, slugify(title))
}

fn section_dir_for(_doc_type: &str, section: &str) -> Result<&'static str, String> {
    match section {
        "manuscript" => Ok(MANUSCRIPT_DIR),
        "planning" => Ok(PLANNING_DIR),
        other => Err(format!("unknown section: {other}")),
    }
}

fn validate_section_doc_type(section: &str, doc_type: &str) -> Result<(), String> {
    if !is_known_doc_type(doc_type) {
        return Err(format!("unknown doc type: {doc_type}"));
    }
    let expected = doc_type_category(doc_type).ok_or_else(|| format!("unknown doc type: {doc_type}"))?;
    if expected != section {
        return Err(format!("doc type {doc_type} does not belong in section {section}"));
    }
    Ok(())
}

fn remove_from_roots(manifest: &mut WritingProjectManifest, node_id: &str) {
    manifest.manuscript_roots.retain(|id| id != node_id);
    manifest.planning_roots.retain(|id| id != node_id);
}

fn remove_from_parent(manifest: &mut WritingProjectManifest, node_id: &str) {
    for node in manifest.nodes.values_mut() {
        node.children.retain(|id| id != node_id);
    }
    remove_from_roots(manifest, node_id);
}

fn insert_into_parent(
    manifest: &mut WritingProjectManifest,
    parent_id: Option<&str>,
    section: &str,
    node_id: &str,
    index: Option<usize>,
) -> Result<(), String> {
    if let Some(parent) = parent_id {
        let parent_node = manifest
            .nodes
            .get_mut(parent)
            .ok_or_else(|| format!("unknown parent: {parent}"))?;
        let pos = index.unwrap_or(parent_node.children.len());
        if pos > parent_node.children.len() {
            return Err("move index out of range".into());
        }
        parent_node.children.insert(pos, node_id.to_string());
        return Ok(());
    }
    let roots = if section == "manuscript" {
        &mut manifest.manuscript_roots
    } else {
        &mut manifest.planning_roots
    };
    let pos = index.unwrap_or(roots.len());
    if pos > roots.len() {
        return Err("move index out of range".into());
    }
    roots.insert(pos, node_id.to_string());
    Ok(())
}

/// Insert a node into an in-memory manifest and write its file on disk.
pub(crate) fn add_node_to_manifest(
    project_root: &Path,
    manifest: &mut WritingProjectManifest,
    parent_id: Option<&str>,
    section: &str,
    doc_type: &str,
    title: &str,
    body: &str,
) -> Result<String, String> {
    validate_section_doc_type(section, doc_type)?;
    let node_id = Uuid::new_v4().to_string();
    let now = utc_now_rfc3339();
    let section_dir = section_dir_for(doc_type, section)?;
    let relative = unique_relative_path(project_root, section_dir, doc_type, title);
    let dest = project_root.join(&relative);

    let fm = DocumentFrontmatter::new(
        node_id.clone(),
        doc_type.to_string(),
        title.to_string(),
        &now,
    );
    atomic_write(&dest, &compose_document(&fm, body))?;

    manifest.nodes.insert(
        node_id.clone(),
        WritingProjectNode {
            title: Some(title.to_string()),
            file: Some(relative),
            doc_type: Some(doc_type.to_string()),
            children: Vec::new(),
        },
    );
    insert_into_parent(manifest, parent_id, section, &node_id, None)?;
    Ok(node_id)
}

pub fn create_writing_node(
    project_path: &str,
    parent_id: Option<String>,
    section: String,
    doc_type: String,
    title: String,
) -> Result<WritingProjectManifest, String> {
    let (project_root, mut manifest) = load_mut_root(project_path)?;
    let node_id = add_node_to_manifest(
        &project_root,
        &mut manifest,
        parent_id.as_deref(),
        &section,
        &doc_type,
        &title,
        "",
    )?;
    save_manifest(&project_root, &manifest)?;
    if let Ok(updated) = WritingProjectManifest::load(&project_root) {
        let _ = index_writing_node(&project_root, &updated, &node_id);
    }
    Ok(manifest)
}

pub fn rename_writing_node(
    project_path: &str,
    node_id: String,
    new_title: String,
) -> Result<WritingProjectManifest, String> {
    if new_title.trim().is_empty() {
        return Err("title cannot be empty".into());
    }
    let (project_root, mut manifest) = load_mut_root(project_path)?;
    let node = manifest
        .nodes
        .get(&node_id)
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    let relative = node
        .file
        .as_ref()
        .ok_or_else(|| format!("node has no file: {node_id}"))?
        .clone();

    let path = project_root.join(&relative);
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut parsed = split_document(&raw)?;
    if parsed.frontmatter.id != node_id {
        return Err("document id mismatch".into());
    }
    parsed.frontmatter.title = new_title.clone();
    parsed.frontmatter.modified = utc_now_rfc3339();
    atomic_write(&path, &compose_document(&parsed.frontmatter, &parsed.body))?;

    if let Some(node) = manifest.nodes.get_mut(&node_id) {
        node.title = Some(new_title);
    }
    save_manifest(&project_root, &manifest)?;
    if let Ok(updated) = WritingProjectManifest::load(&project_root) {
        let _ = index_writing_node(&project_root, &updated, &node_id);
        // Titles changed — refresh link targets project-wide.
        let _ = super::search_index::rebuild_writing_search_index(&project_root, &updated);
    }
    Ok(manifest)
}

pub fn delete_writing_node(
    project_path: &str,
    node_id: String,
    delete_children: bool,
) -> Result<WritingProjectManifest, String> {
    let (project_root, mut manifest) = load_mut_root(project_path)?;
    let child_ids = manifest
        .nodes
        .get(&node_id)
        .map(|n| n.children.clone())
        .ok_or_else(|| format!("unknown node: {node_id}"))?;

    if !child_ids.is_empty() && !delete_children {
        return Err("node has children — pass delete_children to remove the subtree".into());
    }

    if delete_children {
        for child in child_ids {
            delete_subtree(&mut manifest, &project_root, &child)?;
        }
    } else if !child_ids.is_empty() {
        return Err("node has children — pass delete_children to remove the subtree".into());
    }

    delete_one_node(&mut manifest, &project_root, &node_id)?;
    save_manifest(&project_root, &manifest)?;
    Ok(manifest)
}

fn delete_subtree(
    manifest: &mut WritingProjectManifest,
    project_root: &Path,
    node_id: &str,
) -> Result<(), String> {
    let children = manifest
        .nodes
        .get(node_id)
        .map(|n| n.children.clone())
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    for child in children {
        delete_subtree(manifest, project_root, &child)?;
    }
    delete_one_node(manifest, project_root, node_id)
}

fn delete_one_node(
    manifest: &mut WritingProjectManifest,
    project_root: &Path,
    node_id: &str,
) -> Result<(), String> {
    let node = manifest
        .nodes
        .remove(node_id)
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    remove_from_parent(manifest, node_id);
    if let Some(relative) = node.file {
        let path = project_root.join(relative);
        if path.is_file() {
            let _ = std::fs::remove_file(path);
        }
    }
    let _ = remove_writing_node_from_index(project_root, node_id);
    Ok(())
}

pub fn move_writing_node(
    project_path: &str,
    node_id: String,
    new_parent_id: Option<String>,
    section: String,
    index: usize,
) -> Result<WritingProjectManifest, String> {
    let (project_root, mut manifest) = load_mut_root(project_path)?;
    if !manifest.nodes.contains_key(&node_id) {
        return Err(format!("unknown node: {node_id}"));
    }
    if let Some(ref parent) = new_parent_id {
        if parent == &node_id {
            return Err("node cannot be its own parent".into());
        }
        if !manifest.nodes.contains_key(parent) {
            return Err(format!("unknown parent: {parent}"));
        }
    }

    remove_from_parent(&mut manifest, &node_id);
    insert_into_parent(
        &mut manifest,
        new_parent_id.as_deref(),
        &section,
        &node_id,
        Some(index),
    )?;
    save_manifest(&project_root, &manifest)?;
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::init::init_writing_project;
    use crate::editor::mode::ProjectMode;
    use crate::test_env_lock::ENV_LOCK;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct Sandbox<'a> {
        _guard: std::sync::MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl Sandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let root = std::env::temp_dir().join(format!(
                "inprincipio-editor-nodes-{label}-{}-{}",
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
    fn create_rename_delete_node_roundtrip() {
        let sandbox = Sandbox::new("crud");
        let project = sandbox.root.join("book");
        std::fs::create_dir_all(&project).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();
        init_writing_project(Some("blank".into())).expect("init");
        let dir = project.to_string_lossy().into_owned();

        let manifest = create_writing_node(
            &dir,
            None,
            "manuscript".into(),
            "chapter".into(),
            "Opening".into(),
        )
        .expect("create");
        assert_eq!(manifest.manuscript_roots.len(), 1);
        let node_id = manifest.manuscript_roots[0].clone();

        let renamed = rename_writing_node(&dir, node_id.clone(), "New Title".into()).expect("rename");
        assert_eq!(
            renamed.nodes.get(&node_id).and_then(|n| n.title.as_deref()),
            Some("New Title")
        );

        let deleted = delete_writing_node(&dir, node_id, false).expect("delete");
        assert!(deleted.nodes.is_empty());
        assert_eq!(detect_project_mode(&project), ProjectMode::Structured);
    }
}
