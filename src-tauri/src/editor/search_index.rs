//! SQLite FTS5 project search and wiki-link backlinks.

use std::collections::HashMap;
use std::path::Path;

use rusqlite::{params, Connection};
use serde::Serialize;

use super::frontmatter::split_document;
use super::manifest::WritingProjectManifest;
use super::mode::{detect_project_mode, ProjectMode};
use super::paths::{resolve_project_relative_file, search_index_path};

const DEFAULT_SEARCH_LIMIT: usize = 40;

#[derive(Debug, Clone, Serialize)]
pub struct SearchResultDto {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    pub file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BacklinkResultDto {
    pub id: String,
    pub title: String,
    pub doc_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snippet: Option<String>,
}

pub fn extract_wiki_links(body: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut rest = body;
    while let Some(start) = rest.find("[[") {
        let after = &rest[start + 2..];
        if let Some(end) = after.find("]]") {
            let title = after[..end].trim();
            if !title.is_empty() {
                links.push(title.to_string());
            }
            rest = &after[end + 2..];
        } else {
            break;
        }
    }
    links
}

fn title_map(manifest: &WritingProjectManifest) -> HashMap<String, String> {
    manifest
        .nodes
        .iter()
        .filter_map(|(id, node)| {
            node.title
                .as_ref()
                .map(|title| (title.to_lowercase(), id.clone()))
        })
        .collect()
}

fn resolve_target_id(title_map: &HashMap<String, String>, title: &str) -> Option<String> {
    title_map.get(&title.to_lowercase()).cloned()
}

fn open_db(project_root: &Path) -> Result<Connection, String> {
    let path = search_index_path(project_root);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("cannot create {}: {e}", parent.display()))?;
    }
    Connection::open(&path).map_err(|e| format!("cannot open search index: {e}"))
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS index_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS documents (
            rowid INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            modified TEXT NOT NULL,
            body TEXT NOT NULL,
            synopsis TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT ''
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
            title,
            body,
            synopsis,
            tags,
            content='documents',
            content_rowid='rowid',
            tokenize='unicode61'
        );

        CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
            INSERT INTO documents_fts(rowid, title, body, synopsis, tags)
            VALUES (new.rowid, new.title, new.body, new.synopsis, new.tags);
        END;

        CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, body, synopsis, tags)
            VALUES('delete', old.rowid, old.title, old.body, old.synopsis, old.tags);
        END;

        CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
            INSERT INTO documents_fts(documents_fts, rowid, title, body, synopsis, tags)
            VALUES('delete', old.rowid, old.title, old.body, old.synopsis, old.tags);
            INSERT INTO documents_fts(rowid, title, body, synopsis, tags)
            VALUES (new.rowid, new.title, new.body, new.synopsis, new.tags);
        END;

        CREATE TABLE IF NOT EXISTS outbound_links (
            source_id TEXT NOT NULL,
            target_title TEXT NOT NULL,
            target_id TEXT,
            PRIMARY KEY (source_id, target_title)
        );

        CREATE INDEX IF NOT EXISTS idx_outbound_target_id ON outbound_links(target_id);
        CREATE INDEX IF NOT EXISTS idx_outbound_target_title ON outbound_links(target_title COLLATE NOCASE);
        ",
    )
    .map_err(|e| format!("search index schema error: {e}"))
}

fn indexed_node_count(conn: &Connection) -> Result<usize, String> {
    conn.query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
        .map_err(|e| format!("search index count error: {e}"))
}

fn set_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO index_meta(key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| format!("search index meta error: {e}"))?;
    Ok(())
}

struct IndexedDocument {
    node_id: String,
    title: String,
    doc_type: String,
    file_path: String,
    modified: String,
    body: String,
    synopsis: String,
    tags: String,
    outbound: Vec<(String, Option<String>)>,
}

fn load_indexed_document(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    title_map: &HashMap<String, String>,
    node_id: &str,
) -> Result<Option<IndexedDocument>, String> {
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
    if parsed.frontmatter.id != node_id {
        return Err("document id mismatch".into());
    }
    let outbound = extract_wiki_links(&parsed.body)
        .into_iter()
        .map(|title| {
            let target_id = resolve_target_id(title_map, &title);
            (title, target_id)
        })
        .collect();
    Ok(Some(IndexedDocument {
        node_id: node_id.to_string(),
        title: parsed.frontmatter.title,
        doc_type: parsed.frontmatter.doc_type,
        file_path: relative.clone(),
        modified: parsed.frontmatter.modified,
        body: parsed.body,
        synopsis: parsed.frontmatter.synopsis.unwrap_or_default(),
        tags: parsed.frontmatter.tags.join(" "),
        outbound,
    }))
}

fn upsert_document(conn: &Connection, doc: &IndexedDocument) -> Result<(), String> {
    conn.execute(
        "INSERT INTO documents(node_id, title, doc_type, file_path, modified, body, synopsis, tags)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(node_id) DO UPDATE SET
            title = excluded.title,
            doc_type = excluded.doc_type,
            file_path = excluded.file_path,
            modified = excluded.modified,
            body = excluded.body,
            synopsis = excluded.synopsis,
            tags = excluded.tags",
        params![
            doc.node_id,
            doc.title,
            doc.doc_type,
            doc.file_path,
            doc.modified,
            doc.body,
            doc.synopsis,
            doc.tags,
        ],
    )
    .map_err(|e| format!("search index upsert error: {e}"))?;

    conn.execute(
        "DELETE FROM outbound_links WHERE source_id = ?1",
        params![doc.node_id],
    )
    .map_err(|e| format!("search index link cleanup error: {e}"))?;

    for (target_title, target_id) in &doc.outbound {
        conn.execute(
            "INSERT INTO outbound_links(source_id, target_title, target_id)
             VALUES (?1, ?2, ?3)",
            params![doc.node_id, target_title, target_id],
        )
        .map_err(|e| format!("search index link insert error: {e}"))?;
    }
    Ok(())
}

fn remove_document(conn: &Connection, node_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM documents WHERE node_id = ?1", params![node_id])
        .map_err(|e| format!("search index delete error: {e}"))?;
    conn.execute(
        "DELETE FROM outbound_links WHERE source_id = ?1",
        params![node_id],
    )
    .map_err(|e| format!("search index link delete error: {e}"))?;
    Ok(())
}

pub fn rebuild_writing_search_index(project_root: &Path, manifest: &WritingProjectManifest) -> Result<(), String> {
    let conn = open_db(project_root)?;
    init_schema(&conn)?;
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("search index transaction error: {e}"))?;
    tx.execute("DELETE FROM outbound_links", [])
        .map_err(|e| format!("search index clear links error: {e}"))?;
    tx.execute("DELETE FROM documents", [])
        .map_err(|e| format!("search index clear documents error: {e}"))?;
    let title_map = title_map(manifest);
    for node_id in manifest.nodes.keys() {
        if let Some(doc) = load_indexed_document(project_root, manifest, &title_map, node_id)? {
            upsert_document(&tx, &doc)?;
        }
    }
    set_meta(
        &tx,
        "node_count",
        &manifest.nodes.len().to_string(),
    )?;
    tx.commit()
        .map_err(|e| format!("search index commit error: {e}"))
}

pub fn ensure_writing_search_index(project_root: &Path, manifest: &WritingProjectManifest) -> Result<(), String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(());
    }
    let conn = open_db(project_root)?;
    init_schema(&conn)?;
    let indexed = indexed_node_count(&conn)?;
    if indexed != manifest.nodes.len() {
        rebuild_writing_search_index(project_root, manifest)?;
    }
    Ok(())
}

pub fn index_writing_node(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    node_id: &str,
) -> Result<(), String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(());
    }
    let conn = open_db(project_root)?;
    init_schema(&conn)?;
    let title_map = title_map(manifest);
    if let Some(doc) = load_indexed_document(project_root, manifest, &title_map, node_id)? {
        upsert_document(&conn, &doc)?;
    } else {
        remove_document(&conn, node_id)?;
    }
    set_meta(
        &conn,
        "node_count",
        &manifest.nodes.len().to_string(),
    )?;
    Ok(())
}

pub fn remove_writing_node_from_index(project_root: &Path, node_id: &str) -> Result<(), String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(());
    }
    let conn = open_db(project_root)?;
    init_schema(&conn)?;
    remove_document(&conn, node_id)?;
    Ok(())
}

fn fts_query(user_query: &str) -> Option<String> {
    let terms: Vec<String> = user_query
        .split_whitespace()
        .filter(|term| !term.is_empty())
        .map(|term| {
            let escaped = term.replace('"', "\"\"");
            format!("\"{escaped}\"*")
        })
        .collect();
    if terms.is_empty() {
        None
    } else {
        Some(terms.join(" AND "))
    }
}

pub fn search_writing_project(
    project_root: &Path,
    query: &str,
    limit: Option<usize>,
) -> Result<Vec<SearchResultDto>, String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(Vec::new());
    }
    let fts = match fts_query(query) {
        Some(q) if !q.is_empty() => q,
        _ => return Ok(Vec::new()),
    };
    let limit = limit.unwrap_or(DEFAULT_SEARCH_LIMIT).min(100) as i64;
    let conn = open_db(project_root)?;
    init_schema(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT d.node_id, d.title, d.doc_type, d.file_path,
                    snippet(documents_fts, 1, '<mark>', '</mark>', '…', 24) AS snippet
             FROM documents_fts
             JOIN documents d ON d.rowid = documents_fts.rowid
             WHERE documents_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2",
        )
        .map_err(|e| format!("search prepare error: {e}"))?;

    let rows = stmt
        .query_map(params![fts, limit], |row| {
            Ok(SearchResultDto {
                id: row.get(0)?,
                title: row.get(1)?,
                doc_type: row.get(2)?,
                file: row.get(3)?,
                snippet: row.get(4)?,
            })
        })
        .map_err(|e| format!("search query error: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("search result error: {e}"))
}

fn snippet_around_link(body: &str, target_title: &str) -> Option<String> {
    let needle = format!("[[{target_title}]]");
    let idx = body.to_lowercase().find(&needle.to_lowercase())?;
    let start = body[..idx].char_indices().nth_back(40).map(|(i, _)| i).unwrap_or(0);
    let end = (idx + needle.len() + 40).min(body.len());
    let mut snippet = body[start..end].replace('\n', " ");
    if start > 0 {
        snippet = format!("…{snippet}");
    }
    if end < body.len() {
        snippet.push('…');
    }
    Some(snippet)
}

pub fn get_writing_backlinks(
    project_root: &Path,
    manifest: &WritingProjectManifest,
    node_id: &str,
) -> Result<Vec<BacklinkResultDto>, String> {
    if detect_project_mode(project_root) != ProjectMode::Structured {
        return Ok(Vec::new());
    }
    let node = manifest
        .nodes
        .get(node_id)
        .ok_or_else(|| format!("unknown node: {node_id}"))?;
    let title = node
        .title
        .clone()
        .ok_or_else(|| format!("node has no title: {node_id}"))?;

    let conn = open_db(project_root)?;
    init_schema(&conn)?;

    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT source_id
             FROM outbound_links
             WHERE target_id = ?1 OR (target_id IS NULL AND lower(target_title) = lower(?2))",
        )
        .map_err(|e| format!("backlinks prepare error: {e}"))?;

    let source_ids: Vec<String> = stmt
        .query_map(params![node_id, title], |row| row.get(0))
        .map_err(|e| format!("backlinks query error: {e}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("backlinks result error: {e}"))?;

    let mut out = Vec::new();
    for source_id in source_ids {
        let Some(source) = manifest.nodes.get(&source_id) else {
            continue;
        };
        let body = conn
            .query_row(
                "SELECT body FROM documents WHERE node_id = ?1",
                params![source_id],
                |row| row.get::<_, String>(0),
            )
            .unwrap_or_default();
        let link_title = conn
            .query_row(
                "SELECT target_title FROM outbound_links
                 WHERE source_id = ?1 AND (target_id = ?2 OR lower(target_title) = lower(?3))
                 LIMIT 1",
                params![source_id, node_id, title],
                |row| row.get::<_, String>(0),
            )
            .unwrap_or_else(|_| title.clone());
        out.push(BacklinkResultDto {
            id: source_id.clone(),
            title: source.title.clone().unwrap_or(source_id),
            doc_type: source.doc_type.clone().unwrap_or_else(|| "note".into()),
            snippet: snippet_around_link(&body, &link_title),
        });
    }
    out.sort_by_key(|a| a.title.to_lowercase());
    Ok(out)
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
                "inprincipio-editor-search-{label}-{}-{}",
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
    fn extract_wiki_links_finds_multiple() {
        assert_eq!(
            extract_wiki_links("See [[Hero]] and also [[Tavern]]."),
            vec!["Hero".to_string(), "Tavern".to_string()]
        );
    }

    #[test]
    fn search_and_backlinks_roundtrip() {
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
            "chapter".into(),
            "Hero Journey".into(),
        )
        .expect("create chapter");
        let chapter_id = manifest.manuscript_roots[0].clone();

        let manifest = create_writing_node(
            &dir,
            Some(chapter_id.clone()),
            "manuscript".into(),
            "scene".into(),
            "Tavern Scene".into(),
        )
        .expect("create scene");
        let scene_id = manifest
            .nodes
            .get(&chapter_id)
            .unwrap()
            .children[0]
            .clone();

        // Add body with wiki link via save - use nodes path: read file and write
        let scene_relative = manifest.nodes.get(&scene_id).unwrap().file.as_ref().unwrap();
        let scene_path = project.join(scene_relative);
        let raw = std::fs::read_to_string(&scene_path).unwrap();
        let mut parsed = split_document(&raw).unwrap();
        parsed.body = "The hero enters [[Hero Journey]] quietly.".into();
        std::fs::write(
            &scene_path,
            super::super::frontmatter::compose_document(&parsed.frontmatter, &parsed.body),
        )
        .unwrap();

        rebuild_writing_search_index(&project, &manifest).expect("rebuild");

        let hits = search_writing_project(&project, "hero enters", None).expect("search");
        assert!(!hits.is_empty(), "expected search hit");
        assert!(hits.iter().any(|hit| hit.id == scene_id));

        let backlinks = get_writing_backlinks(&project, &manifest, &chapter_id).expect("backlinks");
        assert_eq!(backlinks.len(), 1);
        assert_eq!(backlinks[0].id, scene_id);
    }
}
