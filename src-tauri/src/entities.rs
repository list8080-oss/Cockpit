//! Persistent per-entity memory for the fixed "Entities" chat (Orchestrator,
//! Argus, Vera) — each entity accumulates its own plain-text memory file,
//! read back into its prompt on every call and appended to after every reply
//! it gives. Deliberately just flat Markdown files, same treatment as the
//! transcript archive in `transcripts.rs` — no database, easy to read/edit
//! by hand if needed.

use std::fs;
use std::path::PathBuf;

/// Fixed allowlist — never trust a caller-supplied id as a path segment.
const ENTITY_IDS: [&str; 3] = ["orchestrator", "argus", "vera"];

fn validate_entity_id(id: &str) -> Result<(), String> {
    if ENTITY_IDS.contains(&id) {
        Ok(())
    } else {
        Err(format!("unknown entity id: {id}"))
    }
}

/// Same override var and base path as `transcripts.rs`'s `transcripts_root()`
/// so tests never touch the real Application Support tree.
fn entities_memory_dir() -> Result<PathBuf, String> {
    let base = match std::env::var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR") {
        Ok(dir) => PathBuf::from(dir),
        Err(_) => dirs::data_dir().ok_or("data directory unavailable")?.join("yar-cockpit"),
    };
    Ok(base.join("entities"))
}

fn memory_file(entity_id: &str) -> Result<PathBuf, String> {
    validate_entity_id(entity_id)?;
    Ok(entities_memory_dir()?.join(format!("{entity_id}.md")))
}

/// Returns "" if the entity hasn't written anything yet — not an error, a
/// fresh entity simply has no memory.
#[tauri::command]
pub fn read_entity_memory(entity_id: String) -> Result<String, String> {
    let path = memory_file(&entity_id)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(contents),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("failed to read memory for {entity_id}: {e}")),
    }
}

/// Appends one dated entry. Never truncates or rewrites prior entries — a
/// growing log, same append-only spirit as `ARGUS.md`, just
/// local to this app instead of a git branch.
#[tauri::command]
pub fn append_entity_memory(entity_id: String, note: String) -> Result<(), String> {
    let path = memory_file(&entity_id)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("failed to create entities dir: {e}"))?;
    }
    let timestamp = chrono_like_timestamp();
    let entry = format!("\n## {timestamp}\n\n{}\n", note.trim());
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("failed to open memory file for {entity_id}: {e}"))?;
    file.write_all(entry.as_bytes())
        .map_err(|e| format!("failed to write memory for {entity_id}: {e}"))
}

/// No `chrono` dependency in this crate today — a plain UNIX-epoch-seconds
/// stamp is enough to keep entries ordered and distinguishable; not meant to
/// be pretty, just a stable append marker.
fn chrono_like_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("t{secs}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env_lock::ENV_LOCK;
    use std::sync::MutexGuard;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Same `ENV_LOCK` pattern as `transcripts.rs`/`profiles.rs`/`engines.rs`
    /// — serializes every test across the crate that touches
    /// `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR`, not just within this module.
    struct Sandbox<'a> {
        _guard: MutexGuard<'a, ()>,
        dir: PathBuf,
    }

    impl<'a> Sandbox<'a> {
        fn new() -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
            let dir = std::env::temp_dir().join(format!("inprincipio-entities-test-{}-{stamp}", std::process::id()));
            let _ = fs::remove_dir_all(&dir);
            std::env::set_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR", &dir);
            Sandbox { _guard: guard, dir }
        }
    }

    impl<'a> Drop for Sandbox<'a> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR");
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    fn with_temp_data_dir<F: FnOnce()>(f: F) {
        let _sandbox = Sandbox::new();
        f();
    }

    #[test]
    fn unknown_entity_rejected() {
        with_temp_data_dir(|| {
            assert!(read_entity_memory("mallory".into()).is_err());
            assert!(append_entity_memory("mallory".into(), "x".into()).is_err());
        });
    }

    #[test]
    fn fresh_entity_has_empty_memory() {
        with_temp_data_dir(|| {
            assert_eq!(read_entity_memory("vera".into()).unwrap(), "");
        });
    }

    #[test]
    fn append_then_read_roundtrips() {
        with_temp_data_dir(|| {
            append_entity_memory("argus".into(), "first note".into()).unwrap();
            append_entity_memory("argus".into(), "second note".into()).unwrap();
            let contents = read_entity_memory("argus".into()).unwrap();
            assert!(contents.contains("first note"));
            assert!(contents.contains("second note"));
            // Other entities stay untouched.
            assert_eq!(read_entity_memory("vera".into()).unwrap(), "");
        });
    }
}
