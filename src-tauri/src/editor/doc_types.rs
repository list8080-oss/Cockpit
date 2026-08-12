//! Built-in document types for structured writing projects.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DocTypeDefinition {
    pub id: String,
    pub label: String,
    pub category: String,
    pub icon: String,
    pub heading_level: u8,
    pub builtin: bool,
}

pub fn builtin_doc_types() -> Vec<DocTypeDefinition> {
    vec![
        manuscript("part", "Part", "P", 1),
        manuscript("chapter", "Chapter", "C", 1),
        manuscript("scene", "Scene", "S", 2),
        planning("character", "Character", "H", 2),
        planning("location", "Location", "L", 2),
        planning("lore", "Lore", "O", 2),
        planning("item", "Item", "I", 2),
        planning("faction", "Faction", "F", 2),
        planning("event", "Event", "E", 2),
        planning("quest", "Quest", "Q", 2),
        planning("note", "Note", "N", 3),
        planning("timeline", "Timeline", "T", 2),
        planning("theme", "Theme", "M", 3),
        planning("folder", "Folder", "D", 1),
    ]
}

fn manuscript(id: &str, label: &str, icon: &str, heading_level: u8) -> DocTypeDefinition {
    DocTypeDefinition {
        id: id.into(),
        label: label.into(),
        category: "manuscript".into(),
        icon: icon.into(),
        heading_level,
        builtin: true,
    }
}

fn planning(id: &str, label: &str, icon: &str, heading_level: u8) -> DocTypeDefinition {
    DocTypeDefinition {
        id: id.into(),
        label: label.into(),
        category: "planning".into(),
        icon: icon.into(),
        heading_level,
        builtin: true,
    }
}

pub fn doc_type_category(doc_type: &str) -> Option<&'static str> {
    match doc_type {
        "part" | "chapter" | "scene" => Some("manuscript"),
        "character" | "location" | "lore" | "item" | "faction" | "event" | "quest" | "note"
        | "timeline" | "theme" | "folder" => Some("planning"),
        _ => None,
    }
}

pub fn is_known_doc_type(doc_type: &str) -> bool {
    doc_type_category(doc_type).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn has_fourteen_builtin_types() {
        assert_eq!(builtin_doc_types().len(), 14);
    }

    #[test]
    fn scene_is_manuscript_category() {
        assert_eq!(doc_type_category("scene"), Some("manuscript"));
        assert_eq!(doc_type_category("character"), Some("planning"));
    }
}
