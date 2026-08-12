//! Read and update per-node metadata stored in document frontmatter.

use std::collections::BTreeMap;
use std::path::Path;

use serde::Serialize;

use super::frontmatter::{compose_document, split_document, utc_now_rfc3339};
use super::manifest::WritingProjectManifest;
use super::mode::{detect_project_mode, ProjectMode};
use super::nodes::load_mut_root;
use super::paths::{configured_project_path, resolve_project_relative_file};
use super::io::atomic_write;

pub const STATUS_VALUES: &[&str] = &[
    "draft",
    "in-revision",
    "revised",
    "final",
    "stuck",
    "cut",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct NodeMetadataDto {
    pub synopsis: Option<String>,
    pub tags: Vec<String>,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
}

fn validate_status(status: &str) -> Result<(), String> {
    if STATUS_VALUES.contains(&status) {
        Ok(())
    } else {
        Err(format!("unknown status: {status}"))
    }
}

fn read_node_metadata(project_root: &Path, node_id: &str, relative: &str) -> Result<NodeMetadataDto, String> {
    let path = resolve_project_relative_file(project_root, relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let parsed = split_document(&raw)?;
    if parsed.frontmatter.id != node_id {
        return Err("document id mismatch".into());
    }
    Ok(NodeMetadataDto {
        synopsis: parsed.frontmatter.synopsis,
        tags: parsed.frontmatter.tags,
        status: parsed.frontmatter.status,
        doc_type: Some(parsed.frontmatter.doc_type),
        title: Some(parsed.frontmatter.title),
    })
}

pub fn list_writing_project_metadata(project_path: &str) -> Result<BTreeMap<String, NodeMetadataDto>, String> {
    let connected = configured_project_path()?;
    if detect_project_mode(&connected) != ProjectMode::Structured {
        return Ok(BTreeMap::new());
    }
    let _ = project_path;
    let manifest = WritingProjectManifest::load(&connected)?;
    let mut out = BTreeMap::new();
    for (node_id, node) in &manifest.nodes {
        let Some(relative) = node.file.as_ref() else {
            continue;
        };
        match read_node_metadata(&connected, node_id, relative) {
            Ok(meta) => {
                out.insert(node_id.clone(), meta);
            }
            Err(_) => {
                out.insert(
                    node_id.clone(),
                    NodeMetadataDto {
                        synopsis: None,
                        tags: Vec::new(),
                        status: super::frontmatter::DEFAULT_STATUS.to_string(),
                        doc_type: node.doc_type.clone(),
                        title: node.title.clone(),
                    },
                );
            }
        }
    }
    Ok(out)
}

pub fn update_writing_node_metadata(
    project_path: &str,
    node_id: String,
    synopsis: Option<String>,
    tags: Vec<String>,
    status: String,
) -> Result<NodeMetadataDto, String> {
    validate_status(&status)?;
    let (project_root, manifest) = load_mut_root(project_path)?;
    let node = manifest
        .nodes
        .get(&node_id)
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    let relative = node
        .file
        .as_ref()
        .ok_or_else(|| format!("node has no file: {node_id}"))?
        .clone();

    let path = resolve_project_relative_file(&project_root, &relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let mut parsed = split_document(&raw)?;
    if parsed.frontmatter.id != node_id {
        return Err("document id mismatch".into());
    }

    parsed.frontmatter.synopsis = synopsis
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    parsed.frontmatter.tags = tags
        .into_iter()
        .map(|t| t.trim().to_string())
        .filter(|t| !t.is_empty())
        .collect();
    parsed.frontmatter.status = status.clone();
    parsed.frontmatter.modified = utc_now_rfc3339();
    atomic_write(&path, &compose_document(&parsed.frontmatter, &parsed.body))?;

    Ok(NodeMetadataDto {
        synopsis: parsed.frontmatter.synopsis,
        tags: parsed.frontmatter.tags,
        status: parsed.frontmatter.status,
        doc_type: Some(parsed.frontmatter.doc_type),
        title: Some(parsed.frontmatter.title),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::init::init_writing_project;
    use crate::editor::nodes::create_writing_node;
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
                "inprincipio-editor-metadata-{label}-{}-{}",
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
    fn update_and_list_metadata_roundtrip() {
        let sandbox = Sandbox::new("roundtrip");
        let project = sandbox.root.join("book");
        std::fs::create_dir_all(&project).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();
        init_writing_project(Some("blank".into())).expect("init");
        let dir = project.to_string_lossy().into_owned();

        let manifest = create_writing_node(
            &dir,
            None,
            "manuscript".into(),
            "scene".into(),
            "Opening beat".into(),
        )
        .expect("create");
        let node_id = manifest.manuscript_roots[0].clone();

        let updated = update_writing_node_metadata(
            &dir,
            node_id.clone(),
            Some("Hero enters the tavern.".into()),
            vec!["subplot".into(), "urgent".into()],
            "in-revision".into(),
        )
        .expect("update");

        assert_eq!(updated.synopsis.as_deref(), Some("Hero enters the tavern."));
        assert_eq!(updated.tags, vec!["subplot", "urgent"]);
        assert_eq!(updated.status, "in-revision");

        let all = list_writing_project_metadata(&dir).expect("list");
        assert_eq!(all.get(&node_id), Some(&updated));
    }

    #[test]
    fn rejects_unknown_status() {
        let sandbox = Sandbox::new("status");
        let project = sandbox.root.join("book");
        std::fs::create_dir_all(&project).unwrap();
        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into()).unwrap();
        init_writing_project(Some("blank".into())).expect("init");
        let dir = project.to_string_lossy().into_owned();
        let manifest = create_writing_node(
            &dir,
            None,
            "manuscript".into(),
            "scene".into(),
            "Scene".into(),
        )
        .expect("create");
        let node_id = manifest.manuscript_roots[0].clone();

        let err = update_writing_node_metadata(&dir, node_id, None, vec![], "published".into())
            .unwrap_err();
        assert!(err.contains("unknown status"), "{err}");
    }
}
