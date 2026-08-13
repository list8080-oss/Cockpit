//! Assemble manuscript sections in reading order (manuscript tree only).

use std::path::Path;

use serde::Serialize;

use super::doc_types::doc_type_category;
use super::frontmatter::split_document;
use super::manifest::WritingProjectManifest;
use super::mode::{detect_project_mode, ProjectMode};
use super::paths::resolve_project_relative_file;

#[derive(Debug, Clone, Serialize)]
pub struct ManuscriptSectionDto {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    pub body: String,
    pub body_html: String,
    pub heading_level: u8,
    pub word_count: u64,
}

pub fn preprocess_wiki_links(body: &str) -> String {
    let mut out = String::with_capacity(body.len());
    let mut rest = body;
    while let Some(start) = rest.find("[[") {
        out.push_str(&rest[..start]);
        let after = &rest[start + 2..];
        if let Some(end) = after.find("]]") {
            let title = after[..end].trim();
            if !title.is_empty() {
                out.push_str(title);
            }
            rest = &after[end + 2..];
        } else {
            out.push_str(&rest[start..]);
            return out;
        }
    }
    out.push_str(rest);
    out
}

/// True for a relative URL (no scheme — the common case: `../images/x.png`,
/// `#section`, a bare filename) or one of the schemes a link/image target
/// can legitimately need. Everything else (`javascript:`, `data:`, `vbscript:`,
/// `file:`, ...) is rejected — this is the same allowlist-by-scheme approach
/// established HTML sanitizers use, not a denylist of known-bad schemes,
/// since a denylist only ever covers the schemes someone thought to name.
fn has_safe_url_scheme(url: &str) -> bool {
    match url.find(|c: char| !(c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')) {
        Some(idx) if url.as_bytes().get(idx) == Some(&b':') => {
            matches!(url[..idx].to_ascii_lowercase().as_str(), "http" | "https" | "mailto")
        }
        _ => true,
    }
}

/// Raw HTML embedded in the source markdown (`Event::Html`/`Event::InlineHtml`)
/// is remapped to `Event::Text` rather than passed through — `push_html`
/// escapes `Text` events itself, so a stray `<script>` in a chapter body
/// (typed by a co-author, pasted from elsewhere, or produced by a prompt-
/// injected agent) ends up as inert visible text instead of executing when
/// the exported HTML is opened in a browser. `export.rs::build_html_document`
/// inserts this output unescaped, so the guarantee has to hold here.
///
/// A `[text](javascript:...)` link or `![alt](javascript:...)` image survives
/// that remap untouched — it's legitimate markdown link/image syntax, not
/// embedded HTML, so it never becomes an `Event::Html`. pulldown_cmark has no
/// opinion on URL schemes; without this second pass, clicking such a link
/// runs arbitrary JS — inside the Tauri webview itself for the in-app
/// Read-Through view (`ReadThroughView.tsx`'s `dangerouslySetInnerHTML`), not
/// just in a browser after export. Dangerous-scheme targets are blanked to
/// an empty `dest_url` rather than dropping the link/image entirely, so the
/// visible text/alt still renders — same "make it inert, don't lose the
/// author's content" approach as the `Event::Html` remap above.
pub fn markdown_to_html(input: &str) -> String {
    use pulldown_cmark::{html, Event, Options, Parser, Tag};
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    let parser = Parser::new(input).map(|event| match event {
        Event::Html(s) | Event::InlineHtml(s) => Event::Text(s),
        Event::Start(Tag::Link { link_type, dest_url, title, id }) if !has_safe_url_scheme(&dest_url) => {
            Event::Start(Tag::Link { link_type, dest_url: "".into(), title, id })
        }
        Event::Start(Tag::Image { link_type, dest_url, title, id }) if !has_safe_url_scheme(&dest_url) => {
            Event::Start(Tag::Image { link_type, dest_url: "".into(), title, id })
        }
        other => other,
    });
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

pub fn markdown_to_plain(input: &str) -> String {
    use pulldown_cmark::{Event, Parser, Tag, TagEnd};
    let parser = Parser::new(input);
    let mut out = String::new();
    let mut prev_was_text = false;
    for event in parser {
        match event {
            Event::Text(text) | Event::Code(text) => {
                if prev_was_text {
                    out.push(' ');
                }
                out.push_str(&text);
                prev_was_text = true;
            }
            Event::SoftBreak => {
                out.push('\n');
                prev_was_text = false;
            }
            Event::HardBreak | Event::Rule => {
                out.push_str("\n\n");
                prev_was_text = false;
            }
            Event::Start(Tag::Heading { .. }) => {
                if !out.is_empty() {
                    out.push_str("\n\n");
                }
                prev_was_text = false;
            }
            Event::End(TagEnd::Heading(_)) => {
                out.push_str("\n\n");
                prev_was_text = false;
            }
            Event::Start(Tag::Paragraph) => {
                if prev_was_text {
                    out.push_str("\n\n");
                }
                prev_was_text = false;
            }
            Event::End(TagEnd::Paragraph) => {
                prev_was_text = false;
            }
            _ => {}
        }
    }
    out.trim().to_string()
}

fn word_count(text: &str) -> u64 {
    text.split_whitespace().count() as u64
}

fn heading_level(doc_type: &str, depth: u8) -> u8 {
    match doc_type {
        "part" => 1,
        "chapter" => if depth == 0 { 1 } else { 2 },
        "scene" => if depth <= 1 { 2 } else { 3 },
        _ => (depth + 2).min(6),
    }
}

fn load_section_body(project_root: &Path, relative: &str) -> Result<String, String> {
    let path = resolve_project_relative_file(project_root, relative)?;
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    if let Ok(parsed) = split_document(&raw) {
        Ok(parsed.body)
    } else {
        Ok(raw)
    }
}

fn push_section(
    sections: &mut Vec<ManuscriptSectionDto>,
    id: String,
    title: String,
    doc_type: String,
    body: String,
    heading_level: u8,
) {
    let normalized = preprocess_wiki_links(body.trim());
    let body_html = if normalized.is_empty() {
        String::new()
    } else {
        markdown_to_html(&normalized)
    };
    let words = word_count(&normalized);
    sections.push(ManuscriptSectionDto {
        id,
        title,
        doc_type,
        body: normalized,
        body_html,
        heading_level,
        word_count: words,
    });
}

fn walk_manuscript_node(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    node_id: &str,
    depth: u8,
    sections: &mut Vec<ManuscriptSectionDto>,
    visited: &mut std::collections::HashSet<String>,
) -> Result<(), String> {
    // E-02 (Аргус, ARGUS.md @ 92d83cb): project.json isn't validated as a
    // cycle-free tree on load. A node that (directly or through a longer
    // chain) lists an ancestor as its own child would otherwise recurse
    // forever and crash the app via stack overflow when opening Corkboard
    // or exporting — turn that into a clean error instead.
    if !visited.insert(node_id.to_string()) {
        return Err(format!(
            "manuscript tree contains a cycle at node {node_id} — project.json is corrupted"
        ));
    }

    let node = manifest
        .nodes
        .get(node_id)
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    let doc_type = node.doc_type.as_deref().unwrap_or("note");
    if doc_type_category(doc_type) != Some("manuscript") {
        return Ok(());
    }

    let body = if let Some(relative) = &node.file {
        load_section_body(project_root, relative)?
    } else {
        String::new()
    };

    let title = node.title.clone().unwrap_or_else(|| node_id.to_string());
    let is_container = matches!(doc_type, "part" | "chapter");
    if !body.trim().is_empty() || is_container {
        push_section(
            sections,
            node_id.to_string(),
            title,
            doc_type.to_string(),
            body,
            heading_level(doc_type, depth),
        );
    }

    for child in &node.children {
        walk_manuscript_node(project_root, manifest, child, depth + 1, sections, visited)?;
    }
    Ok(())
}

pub fn collect_legacy_manuscript_sections(project_root: &Path) -> Result<Vec<ManuscriptSectionDto>, String> {
    let chapters_dir = crate::manuscript::chapters_dir(project_root);
    let mut files: Vec<String> = crate::manuscript::read_dir_retrying(&chapters_dir)
        .map_err(|e| format!("failed to read {}: {e}", chapters_dir.display()))?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| {
            let lower = name.to_lowercase();
            lower.ends_with(".txt") || lower.ends_with(".md")
        })
        .collect();
    files.sort();

    let mut sections = Vec::new();
    for file in files {
        let path = chapters_dir.join(&file);
        let raw = std::fs::read_to_string(&path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let stem = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| file.clone());
        let title = stem.replace('_', " ");
        let body = if let Ok(parsed) = split_document(&raw) {
            parsed.body
        } else {
            raw
        };
        push_section(
            &mut sections,
            file.clone(),
            title,
            "chapter".into(),
            body,
            1,
        );
    }
    Ok(sections)
}

pub fn collect_manuscript_sections(
    project_root: &Path,
    manifest: &WritingProjectManifest,
) -> Result<Vec<ManuscriptSectionDto>, String> {
    let mode = detect_project_mode(project_root);
    if mode == ProjectMode::Legacy {
        return collect_legacy_manuscript_sections(project_root);
    }

    let mut sections = Vec::new();
    let mut visited = std::collections::HashSet::new();
    for root_id in &manifest.manuscript_roots {
        walk_manuscript_node(project_root, manifest, root_id, 0, &mut sections, &mut visited)?;
    }
    Ok(sections)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wiki_links_become_plain_text() {
        assert_eq!(
            preprocess_wiki_links("See [[Hero]] here."),
            "See Hero here."
        );
    }

    #[test]
    fn markdown_to_html_renders_paragraphs() {
        let html = markdown_to_html("Hello **world**.");
        assert!(html.contains("<strong>world</strong>"));
    }

    #[test]
    fn markdown_to_html_escapes_embedded_script_tags() {
        // E-01 (Аргус, ARGUS.md @ 92d83cb): pulldown_cmark passes raw HTML
        // in the source through unescaped by default, and build_html_document
        // inserts body_html without further escaping — a chapter body
        // containing a literal <script> would execute it when the exported
        // HTML file is opened in a browser.
        let html = markdown_to_html("Before.\n\n<script>alert('xss')</script>\n\nAfter.");
        assert!(!html.contains("<script>"), "raw <script> tag leaked into output: {html}");
        assert!(html.contains("&lt;script&gt;"));
    }

    #[test]
    fn markdown_to_html_escapes_inline_html_but_keeps_real_markdown() {
        let html = markdown_to_html("Text with <img src=x onerror=alert(1)> inline, and **bold**.");
        assert!(!html.contains("<img"), "raw inline HTML leaked into output: {html}");
        assert!(html.contains("&lt;img"));
        assert!(html.contains("<strong>bold</strong>"));
    }

    #[test]
    fn markdown_to_html_strips_javascript_scheme_link() {
        // H-02 (frontend/editor audit, 2026-08-12): the E-01 fix above only
        // catches raw embedded HTML, not legitimate markdown link syntax
        // whose URL uses a dangerous scheme — `[text](javascript:...)` never
        // becomes an Event::Html, so it survived that fix untouched. Renders
        // live inside the app's own webview via ReadThroughView's
        // dangerouslySetInnerHTML, not just in an exported file.
        let html = markdown_to_html("[click me](javascript:alert(document.cookie))");
        assert!(!html.contains("javascript:"), "dangerous scheme leaked into href: {html}");
        assert!(html.contains("click me"), "link text should still render");
    }

    #[test]
    fn markdown_to_html_strips_javascript_scheme_image() {
        let html = markdown_to_html("![alt text](javascript:alert(1))");
        assert!(!html.contains("javascript:"), "dangerous scheme leaked into src: {html}");
        assert!(html.contains("alt text"), "alt text should still render");
    }

    #[test]
    fn markdown_to_html_keeps_safe_link_schemes() {
        let html = markdown_to_html(
            "[web](https://example.com) [mail](mailto:a@b.com) [rel](../other.md) [img](./pic.png)",
        );
        assert!(html.contains(r#"href="https://example.com""#));
        assert!(html.contains(r#"href="mailto:a@b.com""#));
        assert!(html.contains(r#"href="../other.md""#));
        assert!(html.contains(r#"href="./pic.png""#));
    }

    #[test]
    fn collect_manuscript_sections_rejects_a_cyclic_tree() {
        // E-02 (Аргус, ARGUS.md @ 92d83cb): a crafted project.json where a
        // node's own descendant lists it as a child used to recurse forever
        // and crash via stack overflow. Two nodes pointing at each other —
        // no filesystem I/O needed, both have file: None.
        use super::super::manifest::WritingProjectNode;
        use std::collections::BTreeMap;

        let mut nodes = BTreeMap::new();
        nodes.insert(
            "a".to_string(),
            WritingProjectNode {
                title: Some("A".into()),
                file: None,
                doc_type: Some("chapter".into()),
                children: vec!["b".to_string()],
            },
        );
        nodes.insert(
            "b".to_string(),
            WritingProjectNode {
                title: Some("B".into()),
                file: None,
                doc_type: Some("chapter".into()),
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

        let mut sections = Vec::new();
        let mut visited = std::collections::HashSet::new();
        let err = walk_manuscript_node(Path::new("/nonexistent"), &manifest, "a", 0, &mut sections, &mut visited)
            .expect_err("a cyclic manuscript tree must error, not recurse forever");
        assert!(err.contains("cycle"), "{err}");
    }
}
