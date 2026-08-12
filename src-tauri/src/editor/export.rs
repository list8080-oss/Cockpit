//! Export manuscript to HTML and PDF.

use std::path::Path;

use genpdf::elements::{Break, Paragraph};
use genpdf::fonts;
use genpdf::style::Style;
use genpdf::{Document, Element, SimplePageDecorator};
use serde::Serialize;

use super::manifest::WritingProjectManifest;
use super::manuscript_assembly::{collect_manuscript_sections, markdown_to_plain, ManuscriptSectionDto};
use super::paths::{configured_project_path, resolve_editor_project};

#[derive(Debug, Clone, Serialize)]
pub struct ExportResultDto {
    pub format: String,
    pub output_path: String,
    pub word_count: u64,
    pub section_count: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ReadThroughDto {
    pub sections: Vec<ManuscriptSectionDto>,
    pub total_words: u64,
}

fn html_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn build_html_document(title: &str, sections: &[ManuscriptSectionDto]) -> String {
    let mut body = String::new();
    for section in sections {
        let level = section.heading_level.clamp(1, 6);
        body.push_str(&format!(
            "<section class=\"manuscript-section\" id=\"{}\">\n<h{level}>{}</h{level}>\n",
            html_escape(&section.id),
            html_escape(&section.title),
        ));
        if section.body_html.is_empty() {
            body.push_str("<p class=\"empty-section\"></p>\n");
        } else {
            body.push_str(&format!("<div class=\"section-body\">{}</div>\n", section.body_html));
        }
        body.push_str("</section>\n");
    }

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{title}</title>
  <style>
    body {{
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.65;
      color: #1a1a2e;
      background: #fff;
      margin: 0;
      padding: 2rem 1rem 4rem;
    }}
    main {{
      max-width: 42rem;
      margin: 0 auto;
    }}
    h1, h2, h3, h4, h5, h6 {{
      line-height: 1.25;
      page-break-after: avoid;
    }}
    .manuscript-section {{
      margin-bottom: 2.5rem;
    }}
    .section-body p {{
      margin: 0 0 1rem;
    }}
    .empty-section {{
      display: none;
    }}
    @media print {{
      body {{ padding: 0; }}
      .manuscript-section {{ page-break-inside: avoid; }}
    }}
  </style>
</head>
<body>
  <main>
    <h1>{title}</h1>
    {body}
  </main>
</body>
</html>"#
    )
}

/// Was: scanned OS font directories by name, expecting
/// `"{name}-{style}.ttf"` (the Linux/DejaVu naming convention `genpdf`
/// itself requires). Broke PDF export unconditionally on stock macOS —
/// its bundled fonts use a different naming scheme (`Arial Bold.ttf`, no
/// hyphen) — and even where a candidate happened to match, Arial/Helvetica
/// have no Cyrillic outlines, which this app's manuscript content needs
/// (UI ships en/ru/uk/cs). Embedding DejaVu Sans at compile time via the
/// `dejavu` crate (Bitstream Vera license, redistributable) sidesteps both
/// problems — same font, same glyphs, on every OS, no host lookup at all.
fn load_pdf_font_family() -> Result<fonts::FontFamily<fonts::FontData>, String> {
    let font = |bytes: &'static [u8]| {
        fonts::FontData::new(bytes.to_vec(), None)
            .map_err(|e| format!("failed to load embedded PDF font: {e}"))
    };
    Ok(fonts::FontFamily {
        regular: font(dejavu::sans::regular())?,
        bold: font(dejavu::sans::bold())?,
        italic: font(dejavu::sans::oblique())?,
        bold_italic: font(dejavu::sans::bold_oblique())?,
    })
}

fn export_pdf(output_path: &Path, title: &str, sections: &[ManuscriptSectionDto]) -> Result<(), String> {
    let font_family = load_pdf_font_family()?;
    let mut doc = Document::new(font_family);
    doc.set_title(title);
    doc.set_minimal_conformance();
    doc.set_line_spacing(1.35);

    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(10);
    doc.set_page_decorator(decorator);

    doc.push(Paragraph::new(title).styled(Style::new().with_font_size(20).bold()));
    doc.push(Break::new(1.5));

    for section in sections {
        let heading_size = match section.heading_level {
            1 => 16,
            2 => 14,
            _ => 12,
        };
        doc.push(
            Paragraph::new(&section.title).styled(Style::new().with_font_size(heading_size).bold()),
        );
        if !section.body.is_empty() {
            let plain = markdown_to_plain(&section.body);
            for chunk in plain.split("\n\n") {
                let trimmed = chunk.trim();
                if !trimmed.is_empty() {
                    doc.push(Paragraph::new(trimmed));
                }
            }
        }
        doc.push(Break::new(1.0));
    }

    doc.render_to_file(output_path)
        .map_err(|e| format!("PDF render error: {e}"))
}

pub fn get_writing_readthrough(
    project_root: &Path,
    manifest: &WritingProjectManifest,
) -> Result<ReadThroughDto, String> {
    let sections = collect_manuscript_sections(project_root, manifest)?;
    let total_words = sections.iter().map(|s| s.word_count).sum();
    Ok(ReadThroughDto {
        sections,
        total_words,
    })
}

pub fn export_writing_project(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    format: &str,
    output_path: &Path,
) -> Result<ExportResultDto, String> {
    let sections = collect_manuscript_sections(project_root, manifest)?;
    if sections.is_empty() {
        return Err("Nothing to export — the manuscript has no sections.".into());
    }

    let project_title = project_root
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Manuscript".into());

    match format {
        "html" => {
            let html = build_html_document(&project_title, &sections);
            std::fs::write(output_path, html)
                .map_err(|e| format!("failed to write {}: {e}", output_path.display()))?;
        }
        "pdf" => {
            export_pdf(output_path, &project_title, &sections)?;
        }
        other => return Err(format!("unsupported export format: {other}")),
    }

    let word_count = sections.iter().map(|s| s.word_count).sum();
    Ok(ExportResultDto {
        format: format.to_string(),
        output_path: output_path.to_string_lossy().into_owned(),
        word_count,
        section_count: sections.len() as u64,
    })
}

pub fn export_writing_project_for_ipc(
    project_path: &str,
    format: String,
    output_path: String,
) -> Result<ExportResultDto, String> {
    resolve_editor_project(project_path)?;
    let connected = configured_project_path()?;
    let manifest = WritingProjectManifest::load(&connected)?;
    let path = Path::new(&output_path);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("cannot create output directory: {e}"))?;
        }
    }
    export_writing_project(&connected, &manifest, &format, path)
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
                "inprincipio-editor-export-{label}-{}-{}",
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
    fn html_export_writes_file() {
        let sandbox = Sandbox::new("html");
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
            "Chapter".into(),
        )
        .expect("chapter");
        let chapter_id = manifest.manuscript_roots[0].clone();
        let relative = manifest.nodes.get(&chapter_id).unwrap().file.as_ref().unwrap();
        let path = project.join(relative);
        let raw = std::fs::read_to_string(&path).unwrap();
        let mut parsed = super::super::frontmatter::split_document(&raw).unwrap();
        parsed.body = "Once upon a **time**.".into();
        std::fs::write(
            &path,
            super::super::frontmatter::compose_document(&parsed.frontmatter, &parsed.body),
        )
        .unwrap();

        let manifest = WritingProjectManifest::load(&project).unwrap();
        let out = project.join("export.html");
        let result = export_writing_project(&project, &manifest, "html", &out).expect("export");
        assert_eq!(result.section_count, 1);
        let html = std::fs::read_to_string(&out).unwrap();
        assert!(html.contains("<strong>time</strong>"));
    }

    #[test]
    fn pdf_export_writes_a_file_with_cyrillic_text() {
        // Regression: load_pdf_font_family() used to scan OS font
        // directories by name, which found nothing usable on macOS
        // (different naming convention) and would have lacked Cyrillic
        // outlines even where a candidate matched. This project's chapter
        // text is deliberately Cyrillic to exercise exactly that gap.
        let sandbox = Sandbox::new("pdf");
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
            "Глава".into(),
        )
        .expect("chapter");
        let chapter_id = manifest.manuscript_roots[0].clone();
        let relative = manifest.nodes.get(&chapter_id).unwrap().file.as_ref().unwrap();
        let path = project.join(relative);
        let raw = std::fs::read_to_string(&path).unwrap();
        let mut parsed = super::super::frontmatter::split_document(&raw).unwrap();
        parsed.body = "Это тестовая глава на кириллице.".into();
        std::fs::write(
            &path,
            super::super::frontmatter::compose_document(&parsed.frontmatter, &parsed.body),
        )
        .unwrap();

        let manifest = WritingProjectManifest::load(&project).unwrap();
        let out = project.join("export.pdf");
        let result = export_writing_project(&project, &manifest, "pdf", &out).expect("pdf export");
        assert_eq!(result.section_count, 1);
        let bytes = std::fs::read(&out).unwrap();
        assert!(!bytes.is_empty());
        assert!(bytes.starts_with(b"%PDF-"));
    }
}
