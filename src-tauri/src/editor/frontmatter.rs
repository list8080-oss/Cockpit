//! YAML-style frontmatter for writing-editor documents.

use serde::{Deserialize, Serialize};

pub const DEFAULT_STATUS: &str = "draft";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocumentFrontmatter {
    pub id: String,
    #[serde(rename = "type")]
    pub doc_type: String,
    pub title: String,
    pub created: String,
    pub modified: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub synopsis: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_status")]
    pub status: String,
}

fn default_status() -> String {
    DEFAULT_STATUS.to_string()
}

impl DocumentFrontmatter {
    pub fn new(id: String, doc_type: String, title: String, now: &str) -> Self {
        Self {
            id,
            doc_type,
            title,
            created: now.to_string(),
            modified: now.to_string(),
            synopsis: None,
            tags: Vec::new(),
            status: DEFAULT_STATUS.to_string(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedDocument {
    pub frontmatter: DocumentFrontmatter,
    pub body: String,
}

pub fn split_document(raw: &str) -> Result<ParsedDocument, String> {
    let trimmed = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    let after_open = trimmed
        .strip_prefix("---")
        .ok_or_else(|| "document has no frontmatter".to_string())?;
    let after_open = after_open
        .strip_prefix("\r\n")
        .or_else(|| after_open.strip_prefix('\n'))
        .unwrap_or(after_open);
    let end = after_open
        .find("\n---")
        .ok_or_else(|| "unclosed frontmatter".to_string())?;
    let yaml = &after_open[..end];
    let body = after_open[end + 4..]
        .strip_prefix("\r\n")
        .or_else(|| after_open[end + 4..].strip_prefix('\n'))
        .unwrap_or(&after_open[end + 4..])
        .trim_start()
        .to_string();
    let frontmatter = parse_frontmatter_yaml(yaml)?;
    Ok(ParsedDocument { frontmatter, body })
}

pub fn compose_document(frontmatter: &DocumentFrontmatter, body: &str) -> String {
    format!(
        "---\n{}\n---\n\n{}",
        serialize_frontmatter_yaml(frontmatter),
        body.trim_end()
    )
}

fn parse_frontmatter_yaml(yaml: &str) -> Result<DocumentFrontmatter, String> {
    let mut id = None;
    let mut doc_type = None;
    let mut title = None;
    let mut created = None;
    let mut modified = None;
    let mut synopsis = None;
    let mut tags: Vec<String> = Vec::new();
    let mut status = None;
    let mut in_tags = false;

    for line in yaml.lines() {
        let line = line.trim_end();
        if line.is_empty() {
            in_tags = false;
            continue;
        }
        if in_tags {
            let trimmed_line = line.trim();
            if let Some(tag) = trimmed_line.strip_prefix("- ") {
                tags.push(unquote(tag.trim()));
            }
            continue;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim();
            let value = value.trim();
            match key {
                "id" => id = Some(value.to_string()),
                "type" => doc_type = Some(value.to_string()),
                "title" => title = Some(unquote(value)),
                "created" => created = Some(value.to_string()),
                "modified" => modified = Some(value.to_string()),
                "synopsis" => {
                    synopsis = if value.is_empty() || value == "null" {
                        None
                    } else {
                        Some(unquote(value))
                    }
                }
                "status" => status = Some(unquote(value)),
                "tags" => {
                    if value == "[]" {
                        in_tags = false;
                    } else if value.is_empty() {
                        in_tags = true;
                    } else {
                        tags.push(unquote(value));
                        in_tags = false;
                    }
                }
                _ => {}
            }
        }
    }

    Ok(DocumentFrontmatter {
        id: id.ok_or("frontmatter missing id")?,
        doc_type: doc_type.ok_or("frontmatter missing type")?,
        title: title.ok_or("frontmatter missing title")?,
        created: created.ok_or("frontmatter missing created")?,
        modified: modified.ok_or("frontmatter missing modified")?,
        synopsis,
        tags,
        status: status.unwrap_or_else(|| DEFAULT_STATUS.to_string()),
    })
}

fn serialize_frontmatter_yaml(fm: &DocumentFrontmatter) -> String {
    let mut lines = vec![
        format!("id: {}", fm.id),
        format!("type: {}", fm.doc_type),
        format!("title: {}", yaml_quote(&fm.title)),
        format!("created: {}", fm.created),
        format!("modified: {}", fm.modified),
    ];
    if let Some(ref synopsis) = fm.synopsis {
        lines.push(format!("synopsis: {}", yaml_quote(synopsis)));
    }
    lines.push(format!("status: {}", fm.status));
    if fm.tags.is_empty() {
        lines.push("tags: []".to_string());
    } else {
        lines.push("tags:".to_string());
        for tag in &fm.tags {
            lines.push(format!("  - {}", yaml_quote(tag)));
        }
    }
    lines.join("\n")
}

fn unquote(value: &str) -> String {
    if value.len() >= 2
        && ((value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\'')))
    {
        value[1..value.len() - 1].replace("\\\"", "\"")
    } else {
        value.to_string()
    }
}

// F-3 (editor audit 2026-08-12): this line-based parser has no concept of a
// quoted multi-line value, so an embedded '\n'/'\r' in user text (title,
// synopsis, a tag) would either inject a bogus extra "key: value" line into
// the frontmatter block or, via "\n---\n", break the block's own boundary
// entirely. Stripping them here — the one place all free-text frontmatter
// fields funnel through before being written — closes that off at the
// source instead of teaching the parser to round-trip quoted newlines.
fn yaml_quote(value: &str) -> String {
    let value = value.replace(['\n', '\r'], " ");
    if value.is_empty() || value.contains(':') || value.contains('#') {
        format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
    } else {
        value
    }
}

pub fn utc_now_rfc3339() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_frontmatter_and_body() {
        let fm = DocumentFrontmatter::new(
            "550e8400-e29b-41d4-a716-446655440000".into(),
            "chapter".into(),
            "A Dark Night".into(),
            "2026-08-12T07:00:00Z",
        );
        let raw = compose_document(&fm, "Hello prose.");
        let parsed = split_document(&raw).expect("parse");
        assert_eq!(parsed.frontmatter, fm);
        assert_eq!(parsed.body, "Hello prose.");
    }

    #[test]
    fn parse_tags_list() {
        let raw = "---\nid: abc\ntype: scene\ntitle: Scene\ncreated: 2026-01-01T00:00:00Z\nmodified: 2026-01-01T00:00:00Z\nstatus: draft\ntags:\n  - subplot\n  - urgent\n---\n\nBody.";
        let parsed = split_document(raw).expect("parse");
        assert_eq!(parsed.frontmatter.tags, vec!["subplot", "urgent"]);
    }

    #[test]
    fn compose_strips_embedded_newlines_from_free_text_fields() {
        let mut fm = DocumentFrontmatter::new(
            "id-1".into(),
            "chapter".into(),
            "Title\n---\nsynopsis: injected\ntitle: Still One Line".into(),
            "2026-08-12T00:00:00Z",
        );
        fm.synopsis = Some("line one\r\nline two".into());
        fm.tags = vec!["tag\nwith\nnewlines".into()];

        let raw = compose_document(&fm, "Body.");
        // The composed frontmatter block must still have exactly one
        // closing "---" and must round-trip back to the same (newline-free)
        // values — an embedded newline must never be able to inject a new
        // key or break the block boundary.
        assert_eq!(raw.matches("\n---\n").count(), 1);
        let parsed = split_document(&raw).expect("parse");
        assert!(!parsed.frontmatter.title.contains('\n'));
        assert_eq!(parsed.frontmatter.id, "id-1");
        let synopsis = parsed.frontmatter.synopsis.as_deref().unwrap();
        assert!(!synopsis.contains('\n') && !synopsis.contains('\r'));
        assert!(synopsis.contains("line one") && synopsis.contains("line two"));
        assert_eq!(parsed.frontmatter.tags, vec!["tag with newlines"]);
    }

    #[test]
    fn unquote_does_not_panic_on_lone_quote_char() {
        assert_eq!(unquote("\""), "\"");
        assert_eq!(unquote("'"), "'");
    }
}
