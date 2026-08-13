//! Persistent per-entity memory for the fixed "Entities" chat (Orchestrator,
//! Argus, Vera) — each entity accumulates its own plain-text memory file,
//! read back into its prompt on every call and appended to after every reply
//! it gives. Deliberately just flat Markdown files, same treatment as the
//! transcript archive in `transcripts.rs` — no database, easy to read/edit
//! by hand if needed.

use crate::bin_paths::{gh_bin, git_bin};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tokio::process::Command;

/// Fixed allowlist — never trust a caller-supplied id as a path segment.
const ENTITY_IDS: [&str; 3] = ["orchestrator", "argus", "vera"];

fn validate_entity_id(id: &str) -> Result<(), String> {
    if ENTITY_IDS.contains(&id) {
        Ok(())
    } else {
        Err(format!("unknown entity id: {id}"))
    }
}

/// entity id -> (owner/repo, subpath within that repo, or None if the whole
/// repo IS the entity's personality). Read from local `config.json`
/// (`entity_repos`), never from source: the source is published verbatim to
/// the public repo on release, and these are private personal repo names
/// (BACKLOG п.14). Never accepted from the frontend as an arbitrary URL
/// either — the config file on disk is the only writable place, same trust
/// model as `project_paths`. An entity with no entry simply isn't
/// downloadable until the user configures one.
fn entity_repo_config(entity_id: &str) -> Result<(String, Option<String>), String> {
    validate_entity_id(entity_id)?;
    crate::config::load()
        .entity_repos
        .get(entity_id)
        .map(|c| (c.repo.clone(), c.subpath.clone()))
        .ok_or_else(|| {
            format!("no personality repo configured for {entity_id} — add an \"entity_repos\" entry to config.json")
        })
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
/// growing log, same append-only spirit as the transcripts archive
/// (`transcripts.rs`), just per-entity instead of per-conversation.
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

/// Portrait bytes embedded at compile time (`include_bytes!`, not a runtime
/// resource lookup) — works identically in `cargo tauri dev` and in a
/// packaged `.app`, no `tauri.conf.json` `bundle.resources` entry needed.
/// Picked by the user (Оркестратор) or by the entities themselves
/// independently (Аргус/Вера), 2026-08-13.
const AVATAR_BYTES: [(&str, &[u8]); 3] = [
    ("orchestrator", include_bytes!("../../src/assets/entities/orchestrator.png")),
    ("argus", include_bytes!("../../src/assets/entities/argus.png")),
    ("vera", include_bytes!("../../src/assets/entities/vera.png")),
];

fn avatar_file(entity_id: &str) -> Result<PathBuf, String> {
    validate_entity_id(entity_id)?;
    Ok(entities_memory_dir()?.join("avatars").join(format!("{entity_id}.png")))
}

/// Writes the embedded portrait to a real file on disk (if not already
/// there — the bytes are static, so an existing file is already correct)
/// and returns its absolute path. This is what makes "an entity can look at
/// a portrait" a real capability rather than a description: `run_claude`
/// only disallows Bash/Write/Edit/NotebookEdit, so the CLI process still has
/// its Read tool — and Read can open image files, same as it already does
/// for screenshots elsewhere in this app. A prompt that hands the model this
/// absolute path and tells it to Read the file is a genuine tool call, not
/// simulated description.
#[tauri::command]
pub fn ensure_entity_avatar(entity_id: String) -> Result<String, String> {
    let path = avatar_file(&entity_id)?;
    if !path.exists() {
        let bytes = AVATAR_BYTES
            .iter()
            .find(|(id, _)| *id == entity_id)
            .map(|(_, b)| *b)
            .ok_or_else(|| format!("no embedded avatar for {entity_id}"))?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("failed to create avatars dir: {e}"))?;
        }
        fs::write(&path, bytes).map_err(|e| format!("failed to write avatar for {entity_id}: {e}"))?;
    }
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| "avatar path is not valid UTF-8".to_string())
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

// ---------------------------------------------------------------------------
// Downloaded "personality" — each entity's own portable identity archive,
// pulled on demand from its own git repo (see ENTITY_REPOS above) into a
// local copy the live chat can actually read from. Separate from the flat
// memory.md file above: that one is written automatically by this app;
// this one is written by the entity itself, in its own repo, and only
// enters the app when the user explicitly asks for it.
// ---------------------------------------------------------------------------

fn entity_root_dir(entity_id: &str) -> Result<PathBuf, String> {
    validate_entity_id(entity_id)?;
    Ok(entities_memory_dir()?.join(entity_id))
}

fn personality_dir(entity_id: &str) -> Result<PathBuf, String> {
    Ok(entity_root_dir(entity_id)?.join("personality"))
}

fn meta_path(entity_id: &str) -> Result<PathBuf, String> {
    Ok(entity_root_dir(entity_id)?.join("meta.json"))
}

fn inbox_local_dir(entity_id: &str) -> Result<PathBuf, String> {
    Ok(entity_root_dir(entity_id)?.join("inbox"))
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EntityMeta {
    pub source_repo: String,
    pub subpath: Option<String>,
    pub commit_sha: String,
    pub downloaded_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityPersonalityStatus {
    /// Whether this entity has an `entity_repos` entry in local config.json
    /// at all — in a build without one (any copy other than the author's,
    /// unless its user configures their own), the download feature is
    /// dormant, not broken, and the UI should say so instead of offering a
    /// button that can only fail.
    pub configured: bool,
    pub downloaded: bool,
    pub downloaded_at: Option<String>,
    pub commit_sha: Option<String>,
    pub has_bootstrap: bool,
}

/// Read-only — no git, no network. Safe to call often (e.g. on every
/// Settings screen mount).
#[tauri::command]
pub fn entity_personality_status(entity_id: String) -> Result<EntityPersonalityStatus, String> {
    validate_entity_id(&entity_id)?;
    let configured = entity_repo_config(&entity_id).is_ok();
    let meta: Option<EntityMeta> = fs::read_to_string(meta_path(&entity_id)?)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok());
    let has_bootstrap = personality_dir(&entity_id)?.join("bootstrap.json").is_file();
    Ok(match meta {
        Some(m) => EntityPersonalityStatus {
            configured,
            downloaded: true,
            downloaded_at: Some(m.downloaded_at),
            commit_sha: Some(m.commit_sha),
            has_bootstrap,
        },
        None => EntityPersonalityStatus {
            configured,
            downloaded: false,
            downloaded_at: None,
            commit_sha: None,
            has_bootstrap: false,
        },
    })
}

async fn run_git(args: &[&str], cwd: Option<&Path>) -> Result<String, String> {
    let mut cmd = Command::new(git_bin());
    cmd.args(args);
    // Fail fast instead of hanging if the credential helper (set up by
    // `gh auth login`) isn't configured, rather than blocking forever on an
    // interactive credential prompt with no terminal to answer it.
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    // Belt-and-suspenders alongside GIT_TERMINAL_PROMPT: a stalled connection
    // (not just a credential prompt) would otherwise hang this Tauri command
    // forever, with no way to recover from the UI short of restarting the app.
    let output = tokio::time::timeout(std::time::Duration::from_secs(60), cmd.output())
        .await
        .map_err(|_| format!("git {} timed out after 60s — check your network connection", args.join(" ")))?
        .map_err(|e| format!("failed to run git: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git {} failed: {}", args.join(" "), stderr.trim()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Copies a directory tree, skipping `.git` — used to pull just the checked-
/// out working tree out of a throwaway clone into the entity's personality
/// folder, without dragging the whole `.git` history dir along too (that
/// stays in the temp clone, which gets deleted right after).
fn copy_dir_excluding_git(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("failed to create {}: {e}", dst.display()))?;
    for entry in fs::read_dir(src).map_err(|e| format!("failed to read {}: {e}", src.display()))? {
        let entry = entry.map_err(|e| format!("failed to read dir entry: {e}"))?;
        let name = entry.file_name();
        if name == ".git" {
            continue;
        }
        let src_path = entry.path();
        let dst_path = dst.join(&name);
        let file_type = entry.file_type().map_err(|e| format!("failed to stat entry: {e}"))?;
        if file_type.is_symlink() {
            // `fs::copy` dereferences a symlink and copies whatever it
            // points to, not the link itself — a personality repo should
            // never legitimately contain one, so skip rather than risk
            // pulling in an arbitrary local file the link happens to point
            // at (it would then be eligible for `bootstrap.json` injection
            // into a live prompt, and from there `export_entity_chat` could
            // push it to a real GitHub repo).
            continue;
        }
        if file_type.is_dir() {
            copy_dir_excluding_git(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("failed to copy {}: {e}", src_path.display()))?;
        }
    }
    Ok(())
}

/// RAII guard for the throwaway clone directory: removed on drop no matter
/// how the function returns — including a panic between the clone and the
/// point cleanup used to happen explicitly, which would otherwise leave a
/// full copy of a private personality repo sitting in the shared system
/// temp directory. The path is suffixed with a random UUID (not just the
/// entity id and this process's pid, both constant for the life of the
/// process) so two concurrent downloads of the *same* entity never collide
/// on the same directory.
struct TempCloneDir(PathBuf);

impl TempCloneDir {
    fn new(entity_id: &str) -> Self {
        Self(std::env::temp_dir().join(format!(
            "inprincipio-entity-clone-{entity_id}-{}",
            uuid::Uuid::new_v4()
        )))
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempCloneDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

/// Downloads (or refreshes) one entity's personality from its own repo —
/// sparse checkout for an entity whose personality is a subfolder of a
/// shared repo (only Вера today), a plain shallow clone for an entity with
/// a dedicated repo of her own (Аргус, Оркестратор). Overwrites whatever
/// was there before; this is also how "Обновить" works, not just first-time
/// download.
#[tauri::command]
pub async fn download_entity_personality(entity_id: String) -> Result<EntityMeta, String> {
    validate_entity_id(&entity_id)?;
    let (repo, subpath) = entity_repo_config(&entity_id)?;
    let url = format!("https://github.com/{repo}.git");

    let tmp = TempCloneDir::new(&entity_id);
    let tmp_str = tmp.path().to_str().ok_or("temp clone path is not valid UTF-8")?.to_string();

    if let Some(sp) = subpath.as_deref() {
        run_git(&["clone", "--filter=blob:none", "--sparse", "--depth", "1", &url, &tmp_str], None).await?;
        run_git(&["sparse-checkout", "set", sp], Some(tmp.path())).await?;
    } else {
        run_git(&["clone", "--depth", "1", &url, &tmp_str], None).await?;
    }

    let sha = run_git(&["rev-parse", "HEAD"], Some(tmp.path())).await?;

    let source_dir = match subpath.as_deref() {
        Some(sp) => tmp.path().join(sp),
        None => tmp.path().to_path_buf(),
    };
    if !source_dir.is_dir() {
        return Err(format!(
            "expected subpath '{}' not found in {repo}",
            subpath.as_deref().unwrap_or("")
        ));
    }

    let dest = personality_dir(&entity_id)?;
    let _ = fs::remove_dir_all(&dest);
    copy_dir_excluding_git(&source_dir, &dest)?;
    // `tmp` drops here (function end, or any `?` early return above) and
    // removes itself — no explicit cleanup call needed anymore.

    let meta = EntityMeta {
        source_repo: repo,
        subpath,
        commit_sha: sha,
        downloaded_at: iso8601_now(),
    };
    let meta_file = meta_path(&entity_id)?;
    if let Some(parent) = meta_file.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("failed to create entity dir: {e}"))?;
    }
    let meta_json = serde_json::to_string_pretty(&meta).map_err(|e| format!("failed to serialize meta: {e}"))?;
    fs::write(&meta_file, meta_json).map_err(|e| format!("failed to write meta.json: {e}"))?;

    Ok(meta)
}

/// Reads `personality/bootstrap.json` (a flat `{"inject_by_default": [...]}`
/// list of relative paths the entity has chosen to have injected into a live
/// chat by default) and concatenates the listed files, each under a heading
/// naming its path. Returns "" — not an error, not "read everything instead"
/// — if bootstrap.json is missing or malformed: an entity that hasn't
/// written this file yet participates with a blank slate until it does.
/// Deliberately no fallback to reading the whole personality folder — that
/// would defeat the point of `load_policy`-gated content (e.g. Аргус's
/// `blind-holdout/`) ever being meaningful.
#[tauri::command]
pub fn load_entity_context(entity_id: String) -> Result<String, String> {
    validate_entity_id(&entity_id)?;
    let bootstrap_path = personality_dir(&entity_id)?.join("bootstrap.json");
    let raw = match fs::read_to_string(&bootstrap_path) {
        Ok(s) => s,
        Err(_) => return Ok(String::new()),
    };
    #[derive(Deserialize)]
    struct Bootstrap {
        inject_by_default: Vec<String>,
    }
    let bootstrap: Bootstrap = match serde_json::from_str(&raw) {
        Ok(b) => b,
        Err(_) => return Ok(String::new()),
    };

    let base = personality_dir(&entity_id)?;
    let mut parts = Vec::new();
    for rel in &bootstrap.inject_by_default {
        // Same guard as any user-adjacent path join in this app: no escaping
        // the personality dir via `..` or an absolute path, even though
        // these paths come from the entity's own bootstrap.json, not the
        // frontend — defense in depth costs nothing here.
        if rel.contains("..") || Path::new(rel).is_absolute() {
            continue;
        }
        let file_path = base.join(rel);
        if let Ok(contents) = fs::read_to_string(&file_path) {
            parts.push(format!("### {rel}\n\n{contents}"));
        }
    }
    Ok(parts.join("\n\n"))
}

/// Commits and pushes one new file straight to the entity's own repo's
/// `main` (no branch, no PR) — `inbox/` is append-only by construction, so
/// there's nothing to review before it lands: every export is a brand new
/// file, nothing is ever overwritten or deleted this way. The filename
/// carries the full time, not just the date — a date-only name made every
/// second export of the same day fail: the GitHub contents API refuses a
/// PUT to an existing path without its current `sha`, so the "brand new
/// file" promise only holds if the name is actually unique per export.
#[tauri::command]
pub async fn export_entity_chat(entity_id: String, transcript_markdown: String) -> Result<String, String> {
    validate_entity_id(&entity_id)?;
    let (repo, subpath) = entity_repo_config(&entity_id)?;
    let date = iso8601_now();
    let date_only = date.split('T').next().unwrap_or(&date);
    let file_stamp = export_file_stamp(&date);
    let rel_path = export_rel_path(subpath.as_deref(), &file_stamp);
    let api_path = format!("repos/{repo}/contents/{rel_path}");
    let encoded = STANDARD.encode(transcript_markdown.as_bytes());
    let message = format!("Chat export from InPrincipio Entities ({entity_id}, {date_only})");

    let output = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        Command::new(gh_bin())
            .args(["api", &api_path, "-X", "PUT", "-f", &format!("message={message}"), "-f"])
            .arg(format!("content={encoded}"))
            .output(),
    )
    .await
    .map_err(|_| "export timed out after 30s — check your network connection".to_string())?
    .map_err(|e| format!("failed to run gh: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("export failed: {}", stderr.trim()));
    }

    // Best-effort local copy too, under inbox/ next to the rest of this
    // entity's local state — never blocks the real (remote) export on a
    // local disk hiccup.
    if let Ok(local_dir) = inbox_local_dir(&entity_id) {
        let _ = fs::create_dir_all(&local_dir);
        let _ = fs::write(local_dir.join(format!("{file_stamp}-session.md")), &transcript_markdown);
    }

    Ok(rel_path)
}

/// Pure path-building logic pulled out of `export_entity_chat` so it's
/// testable without a real `gh api` network call.
fn export_rel_path(subpath: Option<&str>, stamp: &str) -> String {
    match subpath {
        Some(sp) => format!("{sp}/inbox/{stamp}-session.md"),
        None => format!("inbox/{stamp}-session.md"),
    }
}

/// `2026-08-13T15:45:02Z` → `2026-08-13-154502` — a filename-safe, unique-
/// per-second stamp (no `:`, which is unsafe in filenames on macOS Finder
/// and Windows alike).
fn export_file_stamp(iso: &str) -> String {
    iso.trim_end_matches('Z').replace(':', "").replace('T', "-")
}

/// Minimal dependency-free UTC ISO-8601 formatter (`YYYY-MM-DDTHH:MM:SSZ`) —
/// same reasoning as `chrono_like_timestamp` above: this crate doesn't
/// depend on `chrono` directly, and a full calendar library isn't worth
/// pulling in just to format the current time. Civil-from-days conversion
/// is Howard Hinnant's well-known constant-time algorithm.
fn iso8601_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0) as i64;
    let days = secs.div_euclid(86_400);
    let time_of_day = secs.rem_euclid(86_400);
    let (hour, minute, second) = (time_of_day / 3600, (time_of_day / 60) % 60, time_of_day % 60);
    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z")
}

/// Howard Hinnant's `civil_from_days` — days since the Unix epoch to a
/// proleptic-Gregorian (year, month, day), correct for the whole range this
/// app will ever see. Public-domain algorithm, reimplemented here rather
/// than pulled in as a dependency.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env_lock::ENV_LOCK;
    use std::sync::MutexGuard;
    use std::time::{SystemTime, UNIX_EPOCH};

    /// Same `ENV_LOCK` pattern as `transcripts.rs`/`profiles.rs`/`engines.rs`
    /// — serializes every test across the crate that touches
    /// `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` / `YAR_COCKPIT_CONFIG_DIR`, not
    /// just within this module. The config dir is sandboxed too because
    /// `entity_repo_config` now reads `config.json` — without the override
    /// these tests would read (and depend on) the developer's real config.
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
            std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &dir);
            Sandbox { _guard: guard, dir }
        }
    }

    impl<'a> Drop for Sandbox<'a> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR");
            std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    /// Seeds the sandboxed config with neutral example repo addresses —
    /// deliberately NOT the author's real repo names, which exist only in
    /// the real local `config.json` and never in source (BACKLOG п.14).
    /// `orchestrator` is left unconfigured on purpose so tests can cover
    /// the dormant state alongside the configured one.
    fn seed_example_repo_config() {
        let mut cfg = crate::config::AppConfig::default();
        cfg.entity_repos.insert(
            "vera".into(),
            crate::config::EntityRepoConfig { repo: "example/shared-memory".into(), subpath: Some("vera".into()) },
        );
        cfg.entity_repos.insert(
            "argus".into(),
            crate::config::EntityRepoConfig { repo: "example/argus-memory".into(), subpath: None },
        );
        crate::config::save(&cfg).unwrap();
    }

    /// For the `#[ignore]`d real-network tests only: copies the machine's
    /// real `config.json` (with its private `entity_repos`) into the
    /// sandbox — the real addresses deliberately exist nowhere in source,
    /// so a real clone can only be driven by the real local config.
    fn seed_real_config_from_machine() {
        let real = dirs::config_dir().unwrap().join("Cockpit").join("config.json");
        let dst_dir = PathBuf::from(std::env::var("YAR_COCKPIT_CONFIG_DIR").unwrap());
        fs::create_dir_all(&dst_dir).unwrap();
        fs::copy(&real, dst_dir.join("config.json"))
            .expect("this ignored test needs the real local config.json with entity_repos filled in");
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
    fn ensure_entity_avatar_writes_a_real_readable_file() {
        with_temp_data_dir(|| {
            let path = ensure_entity_avatar("orchestrator".into()).unwrap();
            let bytes = fs::read(&path).unwrap();
            assert!(!bytes.is_empty());
            // PNG magic bytes — this is a real image file, not a stub.
            assert_eq!(&bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
        });
    }

    #[test]
    fn ensure_entity_avatar_rejects_unknown_entity() {
        with_temp_data_dir(|| {
            assert!(ensure_entity_avatar("mallory".into()).is_err());
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

    /// Real network + real `git`, against the actual private repo — not
    /// mocked, same reasoning as `auth.rs` not mocking real CLI spawns.
    /// Ignored by default (not run by `cargo test`/CI); run deliberately
    /// with `cargo test -- --ignored` when this logic changes, with `gh
    /// auth login` already done.
    #[test]
    #[ignore]
    fn download_entity_personality_real_clone_of_argus() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        with_temp_data_dir(|| {
            seed_real_config_from_machine();
            let expected = crate::config::load().entity_repos["argus"].clone();
            let meta = rt.block_on(download_entity_personality("argus".into())).unwrap();
            assert_eq!(meta.source_repo, expected.repo);
            assert_eq!(meta.subpath, expected.subpath);
            assert_eq!(meta.commit_sha.len(), 40);

            let personality = personality_dir("argus").unwrap();
            assert!(personality.join("README.md").is_file());
            assert!(personality.join("avatar.png").is_file());
            assert!(!personality.join(".git").exists());

            let status = entity_personality_status("argus".into()).unwrap();
            assert!(status.downloaded);
            assert_eq!(status.commit_sha, Some(meta.commit_sha));
        });
    }

    /// Same as above but the sparse-checkout path (Вера, subpath = "vera")
    /// — the one code path meaningfully different from a plain clone.
    #[test]
    #[ignore]
    fn download_entity_personality_real_sparse_clone_of_vera() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        with_temp_data_dir(|| {
            seed_real_config_from_machine();
            let expected = crate::config::load().entity_repos["vera"].clone();
            let meta = rt.block_on(download_entity_personality("vera".into())).unwrap();
            assert_eq!(meta.source_repo, expected.repo);
            assert_eq!(meta.subpath, expected.subpath);
            assert_eq!(meta.commit_sha.len(), 40);

            let personality = personality_dir("vera").unwrap();
            assert!(personality.join("README.md").is_file());
            assert!(personality.join("bootstrap.json").is_file());
            // The other entity's folder must not have leaked in via the
            // sparse checkout — only "vera/" was requested.
            assert!(!personality.join("argus").exists());

            let context = load_entity_context("vera".into()).unwrap();
            assert!(!context.is_empty(), "real vera/bootstrap.json should inject something");
        });
    }

    // -- entity_repo_config ---------------------------------------------

    #[test]
    fn entity_repo_config_reads_from_local_config() {
        with_temp_data_dir(|| {
            seed_example_repo_config();
            assert_eq!(
                entity_repo_config("vera").unwrap(),
                ("example/shared-memory".to_string(), Some("vera".to_string()))
            );
            assert_eq!(
                entity_repo_config("argus").unwrap(),
                ("example/argus-memory".to_string(), None)
            );
        });
    }

    #[test]
    fn entity_repo_config_unconfigured_entity_errors_clearly() {
        with_temp_data_dir(|| {
            seed_example_repo_config();
            // Known entity, but no entry in config — dormant, with an error
            // message that says what to do, not a crash or a wrong repo.
            let err = entity_repo_config("orchestrator").unwrap_err();
            assert!(err.contains("no personality repo configured"), "got: {err}");
        });
    }

    #[test]
    fn entity_repo_config_rejects_unknown() {
        with_temp_data_dir(|| {
            seed_example_repo_config();
            assert!(entity_repo_config("mallory").is_err());
        });
    }

    // -- entity_personality_status ---------------------------------------

    #[test]
    fn status_reports_not_downloaded_when_no_meta() {
        with_temp_data_dir(|| {
            let status = entity_personality_status("argus".into()).unwrap();
            assert!(!status.downloaded);
            assert!(status.downloaded_at.is_none());
            assert!(status.commit_sha.is_none());
            assert!(!status.has_bootstrap);
        });
    }

    #[test]
    fn status_reports_configured_only_for_entities_with_a_repo_entry() {
        with_temp_data_dir(|| {
            // No config at all — everything dormant.
            assert!(!entity_personality_status("argus".into()).unwrap().configured);

            seed_example_repo_config();
            assert!(entity_personality_status("argus".into()).unwrap().configured);
            assert!(entity_personality_status("vera".into()).unwrap().configured);
            // Deliberately absent from the seed — stays dormant.
            assert!(!entity_personality_status("orchestrator".into()).unwrap().configured);
        });
    }

    #[test]
    fn status_reads_meta_and_detects_bootstrap() {
        with_temp_data_dir(|| {
            let meta = EntityMeta {
                source_repo: "example/argus-memory".into(),
                subpath: None,
                commit_sha: "deadbeef".into(),
                downloaded_at: "2026-08-13T12:00:00Z".into(),
            };
            let meta_file = meta_path("argus").unwrap();
            fs::create_dir_all(meta_file.parent().unwrap()).unwrap();
            fs::write(&meta_file, serde_json::to_string(&meta).unwrap()).unwrap();

            let status_before_bootstrap = entity_personality_status("argus".into()).unwrap();
            assert!(status_before_bootstrap.downloaded);
            assert_eq!(status_before_bootstrap.commit_sha.as_deref(), Some("deadbeef"));
            assert!(!status_before_bootstrap.has_bootstrap);

            let personality = personality_dir("argus").unwrap();
            fs::create_dir_all(&personality).unwrap();
            fs::write(personality.join("bootstrap.json"), "{}").unwrap();

            let status_after = entity_personality_status("argus".into()).unwrap();
            assert!(status_after.has_bootstrap);
        });
    }

    #[test]
    fn status_rejects_unknown_entity() {
        with_temp_data_dir(|| {
            assert!(entity_personality_status("mallory".into()).is_err());
        });
    }

    // -- copy_dir_excluding_git --------------------------------------------

    #[test]
    fn copy_dir_excluding_git_skips_git_and_copies_rest() {
        with_temp_data_dir(|| {
            let src = std::env::temp_dir().join(format!("copy-src-test-{}", std::process::id()));
            let dst = std::env::temp_dir().join(format!("copy-dst-test-{}", std::process::id()));
            let _ = fs::remove_dir_all(&src);
            let _ = fs::remove_dir_all(&dst);

            fs::create_dir_all(src.join(".git")).unwrap();
            fs::write(src.join(".git").join("config"), "should not be copied").unwrap();
            fs::write(src.join("README.md"), "top level").unwrap();
            fs::create_dir_all(src.join("nested")).unwrap();
            fs::write(src.join("nested").join("file.md"), "nested content").unwrap();

            copy_dir_excluding_git(&src, &dst).unwrap();

            assert!(!dst.join(".git").exists());
            assert_eq!(fs::read_to_string(dst.join("README.md")).unwrap(), "top level");
            assert_eq!(fs::read_to_string(dst.join("nested").join("file.md")).unwrap(), "nested content");

            let _ = fs::remove_dir_all(&src);
            let _ = fs::remove_dir_all(&dst);
        });
    }

    /// Regression test for a real review finding: `fs::copy` dereferences a
    /// symlink and copies whatever it points to, not the link itself — a
    /// symlink in a downloaded personality repo pointing at an arbitrary
    /// local file (e.g. `~/.ssh/id_rsa`) must never have its target's
    /// content silently pulled into `personality/`.
    #[test]
    fn copy_dir_excluding_git_skips_symlinks() {
        with_temp_data_dir(|| {
            let src = std::env::temp_dir().join(format!("copy-symlink-src-test-{}", std::process::id()));
            let dst = std::env::temp_dir().join(format!("copy-symlink-dst-test-{}", std::process::id()));
            let secret = std::env::temp_dir().join(format!("copy-symlink-secret-test-{}", std::process::id()));
            let _ = fs::remove_dir_all(&src);
            let _ = fs::remove_dir_all(&dst);
            let _ = fs::remove_file(&secret);

            fs::create_dir_all(&src).unwrap();
            fs::write(&secret, "not for the personality archive").unwrap();
            #[cfg(unix)]
            std::os::unix::fs::symlink(&secret, src.join("sneaky-link")).unwrap();
            fs::write(src.join("real-file.md"), "genuinely part of the archive").unwrap();

            copy_dir_excluding_git(&src, &dst).unwrap();

            assert!(!dst.join("sneaky-link").exists(), "symlink must not be followed or copied");
            assert_eq!(
                fs::read_to_string(dst.join("real-file.md")).unwrap(),
                "genuinely part of the archive"
            );

            let _ = fs::remove_dir_all(&src);
            let _ = fs::remove_dir_all(&dst);
            let _ = fs::remove_file(&secret);
        });
    }

    // -- load_entity_context ----------------------------------------------

    #[test]
    fn load_entity_context_empty_when_no_bootstrap() {
        with_temp_data_dir(|| {
            assert_eq!(load_entity_context("vera".into()).unwrap(), "");
        });
    }

    #[test]
    fn load_entity_context_empty_when_bootstrap_malformed() {
        with_temp_data_dir(|| {
            let personality = personality_dir("vera").unwrap();
            fs::create_dir_all(&personality).unwrap();
            fs::write(personality.join("bootstrap.json"), "{not json").unwrap();
            assert_eq!(load_entity_context("vera".into()).unwrap(), "");
        });
    }

    #[test]
    fn load_entity_context_concatenates_listed_files_with_headers() {
        with_temp_data_dir(|| {
            let personality = personality_dir("vera").unwrap();
            fs::create_dir_all(personality.join("identity")).unwrap();
            fs::write(personality.join("identity").join("current.md"), "who I am").unwrap();
            fs::write(personality.join("README.md"), "top level readme").unwrap();
            fs::write(
                personality.join("bootstrap.json"),
                r#"{"inject_by_default": ["identity/current.md", "README.md"]}"#,
            )
            .unwrap();

            let context = load_entity_context("vera".into()).unwrap();
            assert!(context.contains("identity/current.md"));
            assert!(context.contains("who I am"));
            assert!(context.contains("README.md"));
            assert!(context.contains("top level readme"));
        });
    }

    #[test]
    fn load_entity_context_skips_missing_listed_file_without_failing() {
        with_temp_data_dir(|| {
            let personality = personality_dir("vera").unwrap();
            fs::create_dir_all(&personality).unwrap();
            fs::write(
                personality.join("bootstrap.json"),
                r#"{"inject_by_default": ["does-not-exist.md"]}"#,
            )
            .unwrap();
            assert_eq!(load_entity_context("vera".into()).unwrap(), "");
        });
    }

    #[test]
    fn load_entity_context_rejects_path_traversal() {
        with_temp_data_dir(|| {
            let personality = personality_dir("vera").unwrap();
            fs::create_dir_all(&personality).unwrap();
            // A real secret this repo actually protects — proves traversal
            // isn't just "file not found", it's refused before the read.
            let secret_dir = entities_memory_dir().unwrap();
            fs::write(secret_dir.join("vera.md"), "private local memory notes").unwrap();
            fs::write(
                personality.join("bootstrap.json"),
                r#"{"inject_by_default": ["../vera.md", "/etc/passwd"]}"#,
            )
            .unwrap();
            assert_eq!(load_entity_context("vera".into()).unwrap(), "");
        });
    }

    // -- export_rel_path ----------------------------------------------------

    #[test]
    fn export_rel_path_with_subpath() {
        assert_eq!(
            export_rel_path(Some("vera"), "2026-08-13-154502"),
            "vera/inbox/2026-08-13-154502-session.md"
        );
    }

    #[test]
    fn export_rel_path_without_subpath() {
        assert_eq!(
            export_rel_path(None, "2026-08-13-154502"),
            "inbox/2026-08-13-154502-session.md"
        );
    }

    /// Two exports on the same day must never target the same path — the
    /// GitHub contents API rejects a sha-less PUT to an existing file, so a
    /// date-only stamp made every second same-day export fail outright.
    #[test]
    fn export_file_stamp_is_filename_safe_and_second_precise() {
        assert_eq!(export_file_stamp("2026-08-13T15:45:02Z"), "2026-08-13-154502");
        assert!(!export_file_stamp(&iso8601_now()).contains(':'));
    }

    // -- iso8601_now / civil_from_days --------------------------------------

    #[test]
    fn civil_from_days_known_reference_points() {
        assert_eq!(civil_from_days(0), (1970, 1, 1));
        assert_eq!(civil_from_days(1), (1970, 1, 2));
        // 2026-08-13 is 20,678 days after the epoch (independently verified
        // via Python's datetime, not hand-computed).
        assert_eq!(civil_from_days(20_678), (2026, 8, 13));
        // A leap-year boundary: 2024-02-29 exists, 2024-03-01 follows it.
        assert_eq!(civil_from_days(19_782), (2024, 2, 29));
        assert_eq!(civil_from_days(19_783), (2024, 3, 1));
    }

    #[test]
    fn iso8601_now_has_the_expected_shape() {
        let ts = iso8601_now();
        // "YYYY-MM-DDTHH:MM:SSZ" — 20 chars, fixed positions for separators.
        assert_eq!(ts.len(), 20);
        assert_eq!(ts.as_bytes()[4], b'-');
        assert_eq!(ts.as_bytes()[7], b'-');
        assert_eq!(ts.as_bytes()[10], b'T');
        assert_eq!(ts.as_bytes()[13], b':');
        assert_eq!(ts.as_bytes()[16], b':');
        assert_eq!(ts.as_bytes()[19], b'Z');
        assert!(ts.starts_with("20"));
    }
}
