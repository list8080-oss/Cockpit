//! Starter layouts for structured writing projects.

use std::path::Path;

use super::manifest::WritingProjectManifest;
use super::nodes::add_node_to_manifest;

pub fn is_valid_template_id(id: &str) -> bool {
    matches!(
        id,
        "blank" | "novel" | "short-story" | "game-narrative" | "screenplay"
    )
}

pub fn apply_writing_template(
    project_root: &Path,
    manifest: &mut WritingProjectManifest,
    template_id: &str,
) -> Result<(), String> {
    match template_id {
        "blank" => Ok(()),
        "novel" => apply_novel(project_root, manifest),
        "short-story" => apply_short_story(project_root, manifest),
        "game-narrative" => apply_game_narrative(project_root, manifest),
        "screenplay" => apply_screenplay(project_root, manifest),
        other => Err(format!("unknown template: {other}")),
    }
}

fn apply_novel(project_root: &Path, manifest: &mut WritingProjectManifest) -> Result<(), String> {
    for (part_index, part_title) in ["Part I", "Part II", "Part III"].into_iter().enumerate() {
        let part_id = add_node_to_manifest(
            project_root,
            manifest,
            None,
            "manuscript",
            "part",
            part_title,
            "",
        )?;
        for chapter in 1..=3 {
            let chapter_title = format!("Chapter {}", part_index * 3 + chapter);
            let chapter_id = add_node_to_manifest(
                project_root,
                manifest,
                Some(&part_id),
                "manuscript",
                "chapter",
                &chapter_title,
                "",
            )?;
            for scene in 1..=2 {
                let scene_title = format!("Scene {scene}");
                add_node_to_manifest(
                    project_root,
                    manifest,
                    Some(&chapter_id),
                    "manuscript",
                    "scene",
                    &scene_title,
                    "",
                )?;
            }
        }
    }
    Ok(())
}

fn apply_short_story(project_root: &Path, manifest: &mut WritingProjectManifest) -> Result<(), String> {
    for scene in 1..=5 {
        add_node_to_manifest(
            project_root,
            manifest,
            None,
            "manuscript",
            "scene",
            &format!("Scene {scene}"),
            "",
        )?;
    }
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "character",
        "Protagonist",
        "# Protagonist\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "character",
        "Supporting Character",
        "# Supporting Character\n\n",
    )?;
    Ok(())
}

fn apply_game_narrative(
    project_root: &Path,
    manifest: &mut WritingProjectManifest,
) -> Result<(), String> {
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "manuscript",
        "scene",
        "Opening Scene",
        "",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "quest",
        "Main Quest",
        "# Main Quest\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "quest",
        "Side Quest",
        "# Side Quest\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "character",
        "Guide NPC",
        "# Guide NPC\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "character",
        "Antagonist",
        "# Antagonist\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "lore",
        "World Lore",
        "# World Lore\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "item",
        "Key Item",
        "# Key Item\n\n",
    )?;
    Ok(())
}

fn apply_screenplay(project_root: &Path, manifest: &mut WritingProjectManifest) -> Result<(), String> {
    for act in 1..=3 {
        let act_id = add_node_to_manifest(
            project_root,
            manifest,
            None,
            "manuscript",
            "part",
            &format!("Act {act}"),
            "",
        )?;
        for scene in 1..=3 {
            add_node_to_manifest(
                project_root,
                manifest,
                Some(&act_id),
                "manuscript",
                "scene",
                &format!("Scene {scene}"),
                "",
            )?;
        }
    }
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "character",
        "Lead Character",
        "# Lead Character\n\n",
    )?;
    add_node_to_manifest(
        project_root,
        manifest,
        None,
        "planning",
        "location",
        "Primary Location",
        "# Primary Location\n\n",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::paths::ensure_project_layout;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "inprincipio-editor-template-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ))
    }

    #[test]
    fn novel_template_creates_expected_tree() {
        let root = temp_root("novel");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        ensure_project_layout(&root).unwrap();

        let mut manifest = WritingProjectManifest::blank(&root);
        apply_writing_template(&root, &mut manifest, "novel").expect("novel template");

        assert_eq!(manifest.manuscript_roots.len(), 3);
        assert_eq!(manifest.nodes.len(), 3 + 9 + 18); // parts + chapters + scenes
        let scenes = manifest
            .nodes
            .values()
            .filter(|n| n.doc_type.as_deref() == Some("scene"))
            .count();
        assert_eq!(scenes, 18);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn short_story_template_creates_scenes_and_characters() {
        let root = temp_root("short");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        ensure_project_layout(&root).unwrap();

        let mut manifest = WritingProjectManifest::blank(&root);
        apply_writing_template(&root, &mut manifest, "short-story").expect("short story");

        assert_eq!(manifest.manuscript_roots.len(), 5);
        assert_eq!(manifest.planning_roots.len(), 2);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn rejects_unknown_template() {
        let root = temp_root("unknown");
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        ensure_project_layout(&root).unwrap();

        let mut manifest = WritingProjectManifest::blank(&root);
        let err = apply_writing_template(&root, &mut manifest, "unknown").unwrap_err();
        assert!(err.contains("unknown template"));

        let _ = std::fs::remove_dir_all(&root);
    }
}
