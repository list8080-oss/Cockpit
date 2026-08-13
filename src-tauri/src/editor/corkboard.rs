//! Corkboard layout — manuscript chapters as columns, scenes as cards.

use std::collections::BTreeMap;
use std::path::Path;

use serde::Serialize;

use super::frontmatter::split_document;
use super::manifest::WritingProjectManifest;
use super::mode::{detect_project_mode, ProjectMode};
use super::paths::resolve_project_relative_file;

pub const LOOSE_COLUMN_ID: &str = "__manuscript_root__";

#[derive(Debug, Clone, Serialize)]
pub struct CorkboardCardDto {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    pub synopsis: String,
    pub word_count: u64,
    pub status: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CorkboardColumnDto {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    pub cards: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CorkboardViewDto {
    pub columns: Vec<CorkboardColumnDto>,
    pub cards: BTreeMap<String, CorkboardCardDto>,
}

fn word_count(text: &str) -> u64 {
    text.split_whitespace().count() as u64
}

fn load_card(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    node_id: &str,
) -> Result<Option<CorkboardCardDto>, String> {
    let node = match manifest.nodes.get(node_id) {
        Some(node) => node,
        None => return Ok(None),
    };
    let relative = match node.file.as_ref() {
        Some(file) => file,
        None => return Ok(None),
    };
    let path = resolve_project_relative_file(project_root, relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    let parsed = split_document(&raw)?;
    Ok(Some(CorkboardCardDto {
        id: node_id.to_string(),
        title: parsed.frontmatter.title,
        doc_type: parsed.frontmatter.doc_type,
        synopsis: parsed.frontmatter.synopsis.unwrap_or_default(),
        word_count: word_count(&parsed.body),
        status: parsed.frontmatter.status,
        tags: parsed.frontmatter.tags,
    }))
}

fn collect_columns(
    manifest: &WritingProjectManifest,
    out: &mut Vec<(String, String, String, Vec<String>)>,
) -> Result<(), String> {
    let mut loose_roots = Vec::new();
    let mut visited = std::collections::HashSet::new();

    for root_id in &manifest.manuscript_roots {
        if let Some(node) = manifest.nodes.get(root_id) {
            match node.doc_type.as_deref() {
                Some("part") => {
                    for child_id in &node.children {
                        collect_node_columns(manifest, child_id, out, &mut visited)?;
                    }
                }
                Some("chapter") => push_chapter_column(manifest, root_id, out),
                _ => loose_roots.push(root_id.clone()),
            }
        }
    }

    if !loose_roots.is_empty() {
        out.push((
            LOOSE_COLUMN_ID.into(),
            "Manuscript".into(),
            "chapter".into(),
            loose_roots,
        ));
    }
    Ok(())
}

fn collect_node_columns(
    manifest: &WritingProjectManifest,
    node_id: &str,
    out: &mut Vec<(String, String, String, Vec<String>)>,
    visited: &mut std::collections::HashSet<String>,
) -> Result<(), String> {
    // E-02 (Аргус, ARGUS.md @ 92d83cb): same unbounded-recursion crash as
    // manuscript_assembly.rs::walk_manuscript_node, same fix — a node
    // revisited via a cycle (or listed under two parents) errors instead of
    // blowing the stack.
    if !visited.insert(node_id.to_string()) {
        return Err(format!(
            "manuscript tree contains a cycle at node {node_id} — project.json is corrupted"
        ));
    }
    let Some(node) = manifest.nodes.get(node_id) else {
        return Ok(());
    };
    match node.doc_type.as_deref() {
        Some("part") => {
            for child_id in &node.children {
                collect_node_columns(manifest, child_id, out, visited)?;
            }
        }
        Some("chapter") => push_chapter_column(manifest, node_id, out),
        _ => {}
    }
    Ok(())
}

fn push_chapter_column(
    manifest: &WritingProjectManifest,
    node_id: &str,
    out: &mut Vec<(String, String, String, Vec<String>)>,
) {
    let Some(node) = manifest.nodes.get(node_id) else {
        return;
    };
    out.push((
        node_id.to_string(),
        node.title.clone().unwrap_or_else(|| node_id.to_string()),
        node.doc_type.clone().unwrap_or_else(|| "chapter".into()),
        node.children.clone(),
    ));
}

pub fn get_writing_corkboard(project_root: &Path, manifest: &WritingProjectManifest) -> Result<CorkboardViewDto, String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(CorkboardViewDto {
            columns: Vec::new(),
            cards: BTreeMap::new(),
        });
    }

    let mut column_specs = Vec::new();
    collect_columns(manifest, &mut column_specs)?;

    let mut cards = BTreeMap::new();
    let mut columns = Vec::new();

    for (id, title, doc_type, card_ids) in column_specs {
        let mut ordered_cards = Vec::new();
        for card_id in card_ids {
            if let Some(card) = load_card(project_root, manifest, &card_id)? {
                cards.insert(card_id.clone(), card);
                ordered_cards.push(card_id);
            }
        }
        columns.push(CorkboardColumnDto {
            id,
            title,
            doc_type,
            cards: ordered_cards,
        });
    }

    Ok(CorkboardViewDto { columns, cards })
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
                "inprincipio-editor-corkboard-{label}-{}-{}",
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
    fn builds_chapter_columns_with_scene_cards() {
        let sandbox = Sandbox::new("layout");
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
            "Chapter One".into(),
        )
        .expect("chapter");
        let chapter_id = manifest.manuscript_roots[0].clone();

        let manifest = create_writing_node(
            &dir,
            Some(chapter_id.clone()),
            "manuscript".into(),
            "scene".into(),
            "Opening".into(),
        )
        .expect("scene");

        let board = get_writing_corkboard(&project, &manifest).expect("corkboard");
        assert_eq!(board.columns.len(), 1);
        assert_eq!(board.columns[0].id, chapter_id);
        assert_eq!(board.columns[0].cards.len(), 1);
        assert!(board.cards.contains_key(&board.columns[0].cards[0]));
    }

    #[test]
    fn collect_columns_rejects_a_cyclic_tree() {
        // E-02 (Аргус, ARGUS.md @ 92d83cb): same unbounded-recursion crash
        // as manuscript_assembly.rs, same fix, this time on the "part"
        // recursion path collect_node_columns walks. No filesystem needed —
        // collect_columns takes only the manifest.
        use crate::editor::manifest::WritingProjectNode;
        use std::collections::BTreeMap;

        let mut nodes = BTreeMap::new();
        nodes.insert(
            "a".to_string(),
            WritingProjectNode {
                title: Some("A".into()),
                file: None,
                doc_type: Some("part".into()),
                children: vec!["b".to_string()],
            },
        );
        nodes.insert(
            "b".to_string(),
            WritingProjectNode {
                title: Some("B".into()),
                file: None,
                doc_type: Some("part".into()),
                children: vec!["a".to_string()],
            },
        );
        let manifest = WritingProjectManifest {
            version: 1,
            root: "a".into(),
            nodes,
            manuscript_roots: vec!["a".to_string()],
            planning_roots: Vec::new(),
            doc_types: Vec::new(),
            tag_colors: BTreeMap::new(),
            status_colors: None,
        };

        let mut out = Vec::new();
        let err = collect_columns(&manifest, &mut out)
            .expect_err("a cyclic manuscript tree must error, not recurse forever");
        assert!(err.contains("cycle"), "{err}");
    }
}
