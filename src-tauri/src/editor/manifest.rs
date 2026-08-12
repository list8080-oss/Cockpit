//! On-disk writing project manifest (`.inprincipio/project.json`).

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;

use super::io::atomic_write;
use super::paths::project_manifest_path;

pub const MANIFEST_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WritingProjectNode {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub doc_type: Option<String>,
    #[serde(default)]
    pub children: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WritingProjectManifest {
    pub version: u32,
    pub root: String,
    pub nodes: BTreeMap<String, WritingProjectNode>,
    #[serde(default)]
    pub manuscript_roots: Vec<String>,
    #[serde(default)]
    pub planning_roots: Vec<String>,
    #[serde(default)]
    pub doc_types: Vec<serde_json::Value>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub tag_colors: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status_colors: Option<BTreeMap<String, String>>,
}

impl WritingProjectManifest {
    pub fn blank(project_root: &Path) -> Self {
        Self {
            version: MANIFEST_VERSION,
            root: project_root.to_string_lossy().into_owned(),
            nodes: BTreeMap::new(),
            manuscript_roots: Vec::new(),
            planning_roots: Vec::new(),
            doc_types: Vec::new(),
            tag_colors: BTreeMap::new(),
            status_colors: None,
        }
    }

    pub fn load(project_root: &Path) -> Result<Self, String> {
        let path = project_manifest_path(project_root);
        let raw = std::fs::read_to_string(&path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let manifest: Self =
            serde_json::from_str(&raw).map_err(|e| format!("invalid project manifest: {e}"))?;
        if manifest.version != MANIFEST_VERSION {
            return Err(format!(
                "unsupported project manifest version {} (expected {MANIFEST_VERSION})",
                manifest.version
            ));
        }
        Ok(manifest)
    }

    pub fn save(&self, project_root: &Path) -> Result<(), String> {
        let path = project_manifest_path(project_root);
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("failed to serialize project manifest: {e}"))?;
        atomic_write(&path, &format!("{json}\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::paths::{ensure_project_layout, inprincipio_dir};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn save_and_load_roundtrip() {
        let root = std::env::temp_dir().join(format!(
            "inprincipio-manifest-test-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        ensure_project_layout(&root).unwrap();

        let mut manifest = WritingProjectManifest::blank(&root);
        manifest.manuscript_roots.push("node-1".into());
        manifest.nodes.insert(
            "node-1".into(),
            WritingProjectNode {
                title: Some("Chapter One".into()),
                file: Some("manuscript/chapter_one.md".into()),
                doc_type: Some("chapter".into()),
                children: Vec::new(),
            },
        );
        manifest.save(&root).expect("save");
        assert!(inprincipio_dir(&root).join("project.json").is_file());

        let loaded = WritingProjectManifest::load(&root).expect("load");
        assert_eq!(loaded, manifest);

        let _ = std::fs::remove_dir_all(&root);
    }
}
