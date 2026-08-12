//! Read-only access to the user's connected project — either a folder of
//! chapter files or a single manuscript file. Never writes — chapter edits
//! stay a manual, deliberate step the author does themselves after comparing
//! agent variants.

use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ChapterInfo {
    file: String,
    title: String,
}

/// Was hardcoded to the `"manuscript"` profile specifically — meaning the
/// Chat sidebar's chapters list silently kept reading from whatever was
/// connected to "Рукопись" even while a different profile (e.g.
/// "Разработка") was active, out of step with `chapters_dir()` below (which
/// already correctly resolves its subfolder via the active profile) and
/// with `editor_project.rs`'s equivalent (`active_editor_project_dir`,
/// profile-aware from the start). Found by independent review (`VERA.md`),
/// confirmed by reading the code directly.
fn configured_path() -> Result<PathBuf, String> {
    let path = crate::profiles::project_path_for(&crate::profiles::active_profile_id())
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    Ok(root)
}

/// Stable app-data sandbox for Orchestrator "free chat" context (phase 4).
/// Not the manuscript — agents run here when the user chose free conversation
/// so a connected project is not required and the manuscript stays untouched.
///
/// Honors `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` (same override `engines.rs`'s
/// `orchestrator_data_dir()` uses for the propose/apply journal) so tests that
/// exercise real file writes through this sandbox never touch the real
/// Application Support tree.
pub fn free_chat_root() -> Result<PathBuf, String> {
    let base = match std::env::var("YAR_COCKPIT_ORCHESTRATOR_DATA_DIR") {
        Ok(dir) => PathBuf::from(dir),
        Err(_) => dirs::data_dir().ok_or("data directory unavailable")?.join("yar-cockpit"),
    };
    let dir = base.join("orchestrator-free");
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("cannot create free-chat working directory: {e}"))?;
    Ok(dir)
}

/// Resolve the engine working directory for Orchestrator context.
/// `free` → app-data sandbox (always available).
/// anything else (including `"project"`) → active profile workdir.
pub fn agent_workdir(context: &str) -> Result<PathBuf, String> {
    match context {
        "free" => free_chat_root(),
        _ => crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id()),
    }
}

/// Only meaningful in folder mode. Some profiles (e.g. manuscript) keep
/// chapters in a named subfolder; fall back to the project root so an
/// arbitrary folder of `.txt` files also works.
///
/// `pub(crate)` so `editor_project` can resolve the same directory when
/// listing documents the writing editor can open — one source of truth for
/// "where do this profile's chapters live" shared between the read-only
/// Orchestrator view and the editor's real read/write view.
/// `std::fs::read_dir` can fail with `ErrorKind::Interrupted` (EINTR) when a
/// signal arrives mid-syscall — observed in practice against a folder under
/// heavy concurrent disk activity. It's not a real failure, just needs
/// reissuing; shared with `editor_project::list_documents`, which reads the
/// same `chapters_dir` for the same profile.
pub(crate) fn read_dir_retrying(dir: &std::path::Path) -> std::io::Result<std::fs::ReadDir> {
    loop {
        match std::fs::read_dir(dir) {
            Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
            other => return other,
        }
    }
}

pub(crate) fn chapters_dir(root: &std::path::Path) -> PathBuf {
    if let Some(sub) = crate::profiles::chapters_subfolder(&crate::profiles::active_profile_id()) {
        let nested = root.join(sub);
        if nested.is_dir() {
            return nested;
        }
    }
    root.to_path_buf()
}

#[tauri::command]
pub fn list_chapters() -> Result<Vec<ChapterInfo>, String> {
    let root = configured_path()?;
    if root.is_file() {
        let title = root
            .file_stem()
            .map(|s| s.to_string_lossy().replace('_', " "))
            .unwrap_or_else(|| "Manuscript".into());
        let file = root.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        return Ok(vec![ChapterInfo { file, title }]);
    }

    let dir = chapters_dir(&root);
    let mut files: Vec<String> = read_dir_retrying(&dir)
        .map_err(|e| format!("failed to read {}: {e}", dir.display()))?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|name| name.ends_with(".txt"))
        .collect();
    files.sort();
    Ok(files
        .into_iter()
        .map(|file| {
            let title = file
                .trim_end_matches(".txt")
                .replace('_', " ");
            ChapterInfo { file, title }
        })
        .collect())
}

/// `file` must be a bare filename (no path separators) from `list_chapters` —
/// blocks textual `../` traversal, but not a symlink already sitting inside
/// the chapters folder under an innocent name (`std::fs::read_to_string`
/// follows symlinks by default) — canonicalizing and checking the result
/// stays under the chapters directory closes that, same pattern as
/// `editor_project.rs::resolve_document_path`. In single-file mode `file` is
/// ignored: there is only ever one chapter, the connected file itself.
#[tauri::command]
pub fn read_chapter(file: String) -> Result<String, String> {
    if file.contains('/') || file.contains('\\') || file == ".." {
        return Err("invalid chapter filename".into());
    }
    let root = configured_path()?;
    if root.is_file() {
        return std::fs::read_to_string(&root)
            .map_err(|e| format!("failed to read {}: {e}", root.display()));
    }
    let dir = chapters_dir(&root);
    let canonical_dir = dir
        .canonicalize()
        .map_err(|e| format!("failed to resolve chapters directory: {e}"))?;
    let path = dir.join(&file);
    let canonical_path = path
        .canonicalize()
        .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
    if !canonical_path.starts_with(&canonical_dir) {
        return Err(format!("failed to read {}: chapter escapes chapters directory", path.display()));
    }
    std::fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Whether a project happens to be connected, and which profile happens
    // to be active, on the machine running `cargo test` is not something a
    // test should depend on — this compares `agent_workdir`'s routing
    // against resolving THE SAME active profile directly (not a hardcoded
    // one), so it holds either way (Ok or Err, whichever profile is active)
    // instead of requiring a specific real connection to pass.

    #[test]
    fn project_context_routes_through_active_profile() {
        // Reads process-global config (active profile / project_paths) that
        // other tests mutate via YAR_COCKPIT_CONFIG_DIR and
        // set_active_profile_id/set_project_path — without this guard the
        // two reads below can straddle a concurrent mutation from another
        // test and disagree with each other. Flaky under the default
        // parallel `cargo test`, always green under --test-threads=1;
        // confirmed independently twice today before this fix.
        let _guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
        let via_context = agent_workdir("project");
        let via_profile =
            crate::profiles::resolve_profile_workdir(&crate::profiles::active_profile_id());
        match (via_context, via_profile) {
            (Ok(a), Ok(b)) => assert_eq!(a, b),
            (Err(a), Err(b)) => assert_eq!(a, b),
            other => panic!("agent_workdir(\"project\") and resolve_profile_workdir(active_profile_id()) disagree: {other:?}"),
        }
    }

    #[test]
    fn free_context_uses_app_data_sandbox() {
        // Asserts the real default location, so it must not run concurrently
        // with a test elsewhere that points YAR_COCKPIT_ORCHESTRATOR_DATA_DIR
        // at a temp sandbox instead — that env var is process-global.
        let _guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
        // Always available regardless of manuscript connection state.
        let got = agent_workdir("free").expect("free chat sandbox should always be creatable");
        assert!(got.ends_with("yar-cockpit/orchestrator-free"));
        assert!(got.is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn read_chapter_rejects_a_symlink_escaping_the_chapters_directory() {
        // "01_intro.txt" passes the bare-filename check but if that name is
        // a symlink pointing outside the chapters folder, read_to_string
        // would silently follow it — exactly the gap the canonicalize check
        // in read_chapter closes.
        let guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
        let config_dir = std::env::temp_dir().join(format!(
            "inprincipio-manuscript-test-symlink-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_dir_all(&config_dir);
        std::fs::create_dir_all(&config_dir).unwrap();
        std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &config_dir);

        let project = config_dir.join("my-book");
        let chapters = project.join("Главы");
        std::fs::create_dir_all(&chapters).unwrap();
        let outside = config_dir.join("outside-secret.txt");
        std::fs::write(&outside, "not part of the manuscript").unwrap();
        std::os::unix::fs::symlink(&outside, chapters.join("01_intro.txt")).unwrap();

        crate::profiles::set_project_path("manuscript".into(), project.to_string_lossy().into())
            .expect("connect project");

        let err = read_chapter("01_intro.txt".into())
            .expect_err("reading through an escaping symlink must be rejected");
        assert!(err.contains("escapes chapters directory"), "{err}");

        std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
        let _ = std::fs::remove_dir_all(&config_dir);
        drop(guard);
    }

    #[test]
    fn list_chapters_follows_the_active_profile_not_always_manuscript() {
        // Regression: configured_path() used to hardcode the "manuscript"
        // profile regardless of which one was actually active — found by
        // independent review (VERA.md). Connect two profiles to two
        // different folders, make "development" active, and confirm
        // list_chapters() reads development's folder, not manuscript's.
        let guard = crate::test_env_lock::ENV_LOCK.lock().unwrap();
        let config_dir = std::env::temp_dir().join(format!(
            "inprincipio-manuscript-test-active-profile-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::remove_dir_all(&config_dir);
        std::fs::create_dir_all(&config_dir).unwrap();
        std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &config_dir);

        let manuscript_dir = config_dir.join("the-book");
        std::fs::create_dir_all(manuscript_dir.join("Главы")).unwrap();
        std::fs::write(manuscript_dir.join("Главы").join("01_intro.txt"), "chapter one").unwrap();

        let dev_dir = config_dir.join("the-code");
        std::fs::create_dir_all(&dev_dir).unwrap();
        std::fs::write(dev_dir.join("notes.txt"), "dev notes").unwrap();

        crate::profiles::set_project_path("manuscript".into(), manuscript_dir.to_string_lossy().into())
            .expect("connect manuscript");
        crate::profiles::set_project_path("development".into(), dev_dir.to_string_lossy().into())
            .expect("connect development");
        crate::profiles::set_active_profile_id("development".into()).expect("activate development");

        let chapters = list_chapters().expect("list chapters for active profile");
        assert!(
            chapters.iter().any(|c| c.file == "notes.txt"),
            "expected development's notes.txt, got {:?}",
            chapters.iter().map(|c| &c.file).collect::<Vec<_>>()
        );
        assert!(
            !chapters.iter().any(|c| c.file == "01_intro.txt"),
            "must not read manuscript's chapter while development is active"
        );

        std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
        let _ = std::fs::remove_dir_all(&config_dir);
        drop(guard);
    }
}
