//! Disk-persisted Markdown archive of chat transcripts (Simple Chat and
//! Orchestrator). Purely a write-only archival copy — for a readable record
//! now, and as potential training data later — the WebView's localStorage
//! stays the UI's own source of truth; nothing here is read back by the
//! frontend. Full-file rewrite on every save (same treatment
//! `persistConversations` already gives localStorage), not an append log, so
//! there's no partial-write corruption or "turn deleted from history"
//! mismatch to reconcile.

use std::path::PathBuf;

/// App-data root for transcript archives, overridable via
/// `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` — the same env var `engines.rs`'s
/// `orchestrator_data_dir()` and `manuscript.rs`'s `free_chat_root()` use —
/// so tests never touch the real Application Support tree.
fn transcripts_root() -> Result<PathBuf, String> {
    let base = match std::env::var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR") {
        Ok(dir) => PathBuf::from(dir),
        Err(_) => dirs::data_dir().ok_or("data directory unavailable")?.join("yar-cockpit"),
    };
    Ok(base.join("conversations"))
}

/// `conversation_id` is a frontend-generated UUID used as a path segment —
/// reject anything that isn't shape-safe, same rule
/// `editor_project::require_project_and_safe_id` applies to document ids.
fn validate_conversation_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err("invalid conversation id".into());
    }
    Ok(())
}

/// Destination subfolder for a bucket. `"project"` is keyed by the ACTIVE
/// PROFILE ID, resolved here server-side — not a caller-supplied profile id
/// or a hash of the connected path — the simplest option, and it matches how
/// the rest of the app already scopes per-profile state (only three built-in
/// profiles exist today). Which real folder the profile was connected to at
/// save time is provenance the frontend serializer writes into the Markdown
/// content itself, not something encoded in the directory structure.
fn bucket_dir(bucket: &str) -> Result<PathBuf, String> {
    let root = transcripts_root()?;
    match bucket {
        "free" => Ok(root.join("free")),
        "project" => Ok(root.join("projects").join(crate::profiles::active_profile_id())),
        other => Err(format!("unknown transcript bucket: {other}")),
    }
}

/// One subfolder per engine within a bucket — a fixed allowlist rather than
/// trusting an arbitrary caller-supplied path segment. `"orchestrator"`
/// covers every Orchestrator conversation (regular fan-out, Full
/// access/Plan/Propose-changes): those genuinely span multiple engines in
/// one file, so they don't have a single engine to file under the way a
/// Simple Chat conversation (always exactly one engine) does.
const KNOWN_ENGINES: [&str; 5] = ["claude", "codex", "cursor", "opencode", "orchestrator"];

fn engine_dir(bucket: &str, engine: &str) -> Result<PathBuf, String> {
    if !KNOWN_ENGINES.contains(&engine) {
        return Err(format!("unknown transcript engine: {engine}"));
    }
    Ok(bucket_dir(bucket)?.join(engine))
}

fn ensure_transcripts_root() -> Result<PathBuf, String> {
    let dir = transcripts_root()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create transcripts directory: {e}"))?;
    Ok(dir)
}

/// Resolves (and ensures) the root folder all transcripts are archived
/// under, and opens it in Finder directly via the `open` binary — done
/// entirely on the Rust side rather than resolving the path here and
/// handing it to `@tauri-apps/plugin-opener`'s `openPath` in JS, which
/// needs its own separate `opener:allow-open-path` capability grant beyond
/// `opener:default`; one fewer moving part to get wrong for a single button.
#[tauri::command]
pub fn open_transcripts_dir() -> Result<(), String> {
    let dir = ensure_transcripts_root()?;
    std::process::Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("failed to open Finder: {e}"))?;
    Ok(())
}

/// Writes the full current transcript for one conversation, overwriting any
/// previous save under the same id. `markdown` is fully pre-rendered by the
/// frontend (a small serializer each for Simple Chat and Orchestrator) —
/// this command only validates the id/engine and writes the file, the same
/// division of labor as `version_history::create_backup`.
#[tauri::command]
pub fn save_conversation_transcript(
    bucket: String,
    engine: String,
    conversation_id: String,
    markdown: String,
) -> Result<(), String> {
    validate_conversation_id(&conversation_id)?;
    let dir = engine_dir(&bucket, &engine)?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("cannot create transcripts directory: {e}"))?;
    std::fs::write(dir.join(format!("{conversation_id}.md")), &markdown)
        .map_err(|e| format!("cannot write transcript: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env_lock::ENV_LOCK;
    use std::sync::MutexGuard;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Sandboxes both `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` (transcript root)
    /// and `YAR_COCKPIT_CONFIG_DIR` (so `active_profile_id()` reads an
    /// isolated config, not the real one) under the shared process-global
    /// `ENV_LOCK` — same pattern as `profiles.rs`'s `ConfigSandbox` and
    /// `engines.rs`'s `FreeSandbox`.
    struct Sandbox<'a> {
        _guard: MutexGuard<'a, ()>,
        pub data_root: PathBuf,
        config_root: PathBuf,
    }

    impl Sandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
            let pid = std::process::id();
            let data_root = std::env::temp_dir().join(format!("inprincipio-transcripts-data-{label}-{pid}-{stamp}"));
            let config_root =
                std::env::temp_dir().join(format!("inprincipio-transcripts-config-{label}-{pid}-{stamp}"));
            std::fs::create_dir_all(&data_root).unwrap();
            std::fs::create_dir_all(&config_root).unwrap();
            std::env::set_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR", &data_root);
            std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &config_root);
            Self { _guard: guard, data_root, config_root }
        }
    }

    impl Drop for Sandbox<'_> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR");
            std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
            let _ = std::fs::remove_dir_all(&self.data_root);
            let _ = std::fs::remove_dir_all(&self.config_root);
        }
    }

    #[test]
    fn free_bucket_round_trips() {
        let sandbox = Sandbox::new("free-roundtrip");
        save_conversation_transcript("free".into(), "claude".into(), "abc123".into(), "# Hello\n".into())
            .unwrap();
        let path = sandbox
            .data_root
            .join("conversations")
            .join("free")
            .join("claude")
            .join("abc123.md");
        assert_eq!(std::fs::read_to_string(path).unwrap(), "# Hello\n");
    }

    #[test]
    fn each_engine_gets_its_own_subfolder() {
        let sandbox = Sandbox::new("engine-subfolders");
        for engine in KNOWN_ENGINES {
            save_conversation_transcript("free".into(), engine.into(), "id".into(), engine.into())
                .unwrap();
        }
        for engine in KNOWN_ENGINES {
            let path = sandbox.data_root.join("conversations").join("free").join(engine).join("id.md");
            assert_eq!(std::fs::read_to_string(&path).unwrap(), engine, "{}", path.display());
        }
    }

    #[test]
    fn rejects_unknown_engine() {
        let _sandbox = Sandbox::new("bad-engine");
        let err =
            save_conversation_transcript("free".into(), "gemini".into(), "abc".into(), "x".into())
                .unwrap_err();
        assert!(err.contains("unknown transcript engine"), "{err}");
    }

    #[test]
    fn project_bucket_defaults_to_manuscript_profile() {
        let sandbox = Sandbox::new("project-default");
        // No config.json written yet -> active_profile_id() falls back to "manuscript".
        save_conversation_transcript("project".into(), "orchestrator".into(), "def456".into(), "# Chat\n".into())
            .unwrap();
        let path = sandbox
            .data_root
            .join("conversations")
            .join("projects")
            .join("manuscript")
            .join("orchestrator")
            .join("def456.md");
        assert_eq!(std::fs::read_to_string(path).unwrap(), "# Chat\n");
    }

    #[test]
    fn project_bucket_follows_the_active_profile() {
        let sandbox = Sandbox::new("project-switch");
        crate::profiles::set_active_profile_id("development".into()).unwrap();
        save_conversation_transcript(
            "project".into(),
            "orchestrator".into(),
            "ghi789".into(),
            "# Dev chat\n".into(),
        )
        .unwrap();
        let path = sandbox
            .data_root
            .join("conversations")
            .join("projects")
            .join("development")
            .join("orchestrator")
            .join("ghi789.md");
        assert!(path.is_file(), "{}", path.display());
    }

    #[test]
    fn ensure_transcripts_root_resolves_and_creates_the_root() {
        // Doesn't call open_transcripts_dir itself — that spawns real Finder.
        let sandbox = Sandbox::new("ensure-root");
        let dir = ensure_transcripts_root().unwrap();
        let expected = sandbox.data_root.join("conversations");
        assert_eq!(dir, expected);
        assert!(expected.is_dir());
    }

    #[test]
    fn rejects_path_unsafe_conversation_ids() {
        let _sandbox = Sandbox::new("bad-ids");
        for bad in ["", "../escape", "a/b", "a\\b", ".."] {
            let err =
                save_conversation_transcript("free".into(), "claude".into(), bad.into(), "x".into())
                    .unwrap_err();
            assert!(err.contains("invalid conversation id"), "{bad:?}: {err}");
        }
    }

    #[test]
    fn rejects_unknown_bucket() {
        let _sandbox = Sandbox::new("bad-bucket");
        let err =
            save_conversation_transcript("bogus".into(), "claude".into(), "abc".into(), "x".into())
                .unwrap_err();
        assert!(err.contains("unknown transcript bucket"), "{err}");
    }

    #[test]
    fn resave_overwrites_rather_than_appends() {
        let sandbox = Sandbox::new("resave");
        save_conversation_transcript("free".into(), "claude".into(), "same-id".into(), "first version".into())
            .unwrap();
        save_conversation_transcript("free".into(), "claude".into(), "same-id".into(), "second version".into())
            .unwrap();
        let path = sandbox
            .data_root
            .join("conversations")
            .join("free")
            .join("claude")
            .join("same-id.md");
        assert_eq!(std::fs::read_to_string(path).unwrap(), "second version");
    }
}
