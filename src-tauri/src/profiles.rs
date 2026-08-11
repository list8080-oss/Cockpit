//! Built-in project profiles.
//!
//! Stage 2 of the Cabin + Profile refactor: the active profile is the source
//! of truth for project working-directory resolution (`resolve_profile_workdir`).
//! Free-chat context still bypasses profiles (see `manuscript::agent_workdir`).
//!
//! Display labels are resolved on the frontend via i18n (`profileLabel`) —
//! Rust only exposes stable profile ids.

use std::path::PathBuf;

#[derive(serde::Serialize, Clone)]
pub struct ProjectProfile {
    pub id: String,
}

#[tauri::command]
pub fn list_profiles() -> Vec<ProjectProfile> {
    vec![
        ProjectProfile {
            id: "manuscript".into(),
        },
        ProjectProfile {
            id: "development".into(),
        },
        ProjectProfile {
            id: "free_project".into(),
        },
    ]
}

/// Currently selected profile id — defaults to `"manuscript"` when unset.
pub fn active_profile_id() -> String {
    crate::config::load()
        .active_profile_id
        .unwrap_or_else(|| "manuscript".to_string())
}

#[tauri::command]
pub fn get_active_profile_id() -> String {
    active_profile_id()
}

#[tauri::command]
pub fn set_active_profile_id(profile_id: String) -> Result<(), String> {
    if !list_profiles().iter().any(|p| p.id == profile_id) {
        return Err(format!("unknown profile: {profile_id}"));
    }
    let mut cfg = crate::config::load();
    cfg.active_profile_id = Some(profile_id);
    crate::config::save(&cfg)
}

pub fn project_path_for(profile_id: &str) -> Option<String> {
    crate::config::load()
        .project_paths
        .get(profile_id)
        .cloned()
}

#[tauri::command]
pub fn get_project_path(profile_id: String) -> Option<String> {
    project_path_for(&profile_id)
}

#[tauri::command]
pub fn set_project_path(profile_id: String, path: String) -> Result<(), String> {
    if !list_profiles().iter().any(|p| p.id == profile_id) {
        return Err(format!("unknown profile: {profile_id}"));
    }
    let root = std::path::Path::new(&path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Not a folder or file: {}", root.display()));
    }
    let mut cfg = crate::config::load();
    cfg.project_paths.insert(profile_id, path);
    crate::config::save(&cfg)
}

#[tauri::command]
pub fn clear_project_path(profile_id: String) -> Result<(), String> {
    let mut cfg = crate::config::load();
    cfg.project_paths.remove(&profile_id);
    crate::config::save(&cfg)
}

/// Resolve a profile id to its working directory from `project_paths`.
pub fn resolve_profile_workdir(profile_id: &str) -> Result<PathBuf, String> {
    if !list_profiles().iter().any(|p| p.id == profile_id) {
        return Err(format!("unknown profile: {profile_id}"));
    }
    let path = project_path_for(profile_id)
        .ok_or("No project connected — choose a folder or file.")?;
    let root = PathBuf::from(path);
    if !root.is_dir() && !root.is_file() {
        return Err(format!("Project path not found: {}", root.display()));
    }
    if root.is_file() {
        root.parent()
            .map(PathBuf::from)
            .ok_or_else(|| format!("no parent directory for {}", root.display()))
    } else {
        Ok(root)
    }
}

/// Subfolder (relative to the profile's project root) where per-file
/// chapters live, if this profile's projects use one at all. `None` means
/// chapters (if any) live directly in the project root.
pub fn chapters_subfolder(profile_id: &str) -> Option<&'static str> {
    match profile_id {
        "manuscript" => Some("Главы"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_env_lock::ENV_LOCK;
    use std::path::PathBuf;
    use std::sync::MutexGuard;

    /// Points `YAR_COCKPIT_CONFIG_DIR` at a fresh temp directory so profile
    /// get/set tests never touch the real Cockpit config.json. Shares
    /// `ENV_LOCK` with the `YAR_COCKPIT_ORCHESTRATOR_DATA_DIR` sandbox in
    /// `engines.rs` and the plain read in `manuscript.rs` — these env vars
    /// are process-global, so any test touching either one must serialise
    /// against every other test that does, not just ones in the same module.
    struct ConfigSandbox<'a> {
        _guard: MutexGuard<'a, ()>,
        pub root: PathBuf,
    }

    impl ConfigSandbox<'_> {
        fn new(label: &str) -> Self {
            let guard = ENV_LOCK.lock().unwrap();
            let root = std::env::temp_dir().join(format!(
                "cockpit-config-{label}-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_nanos())
                    .unwrap_or(0)
            ));
            let _ = std::fs::remove_dir_all(&root);
            std::fs::create_dir_all(&root).unwrap();
            std::env::set_var("YAR_COCKPIT_CONFIG_DIR", &root);
            Self {
                _guard: guard,
                root,
            }
        }

        fn config_file(&self) -> PathBuf {
            self.root.join("config.json")
        }
    }

    impl Drop for ConfigSandbox<'_> {
        fn drop(&mut self) {
            std::env::remove_var("YAR_COCKPIT_CONFIG_DIR");
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn active_profile_defaults_to_manuscript() {
        assert_eq!(active_profile_id(), "manuscript");
    }

    #[test]
    fn unknown_profile_is_hard_error() {
        let err = resolve_profile_workdir("nope").unwrap_err();
        assert!(err.contains("unknown profile: nope"), "{err}");
    }

    #[test]
    fn manuscript_profile_uses_glavy_subfolder() {
        assert_eq!(chapters_subfolder("manuscript"), Some("Главы"));
        assert_eq!(chapters_subfolder("other"), None);
    }

    #[test]
    fn set_active_profile_id_persists_known_profile() {
        let sandbox = ConfigSandbox::new("set-ok");
        set_active_profile_id("manuscript".into()).expect("set ok");
        assert_eq!(get_active_profile_id(), "manuscript");
        let text = std::fs::read_to_string(sandbox.config_file()).expect("config written");
        assert!(text.contains("\"active_profile_id\""), "{text}");
        assert!(text.contains("manuscript"), "{text}");
    }

    #[test]
    fn set_active_profile_id_rejects_unknown_without_corrupting_config() {
        let sandbox = ConfigSandbox::new("set-bad");
        // Seed a real config so we can prove it was not overwritten with junk.
        let mut cfg = crate::config::load();
        cfg.manuscript_path = Some("/tmp/seed-manuscript".into());
        crate::config::save(&cfg).expect("seed save");
        let before = std::fs::read_to_string(sandbox.config_file()).expect("seeded");

        let err = set_active_profile_id("nonexistent".into()).unwrap_err();
        assert!(err.contains("unknown profile: nonexistent"), "{err}");

        let after = std::fs::read_to_string(sandbox.config_file()).expect("still there");
        assert_eq!(before, after);
        assert!(!after.contains("nonexistent"), "{after}");
        assert_eq!(get_active_profile_id(), "manuscript");
    }

    #[test]
    fn list_profiles_includes_manuscript_and_development() {
        let ids: Vec<_> = list_profiles().into_iter().map(|p| p.id).collect();
        assert!(ids.contains(&"manuscript".to_string()), "{ids:?}");
        assert!(ids.contains(&"development".to_string()), "{ids:?}");
    }

    #[test]
    fn list_profiles_includes_free_project() {
        let ids: Vec<_> = list_profiles().into_iter().map(|p| p.id).collect();
        assert!(ids.contains(&"free_project".to_string()), "{ids:?}");
    }

    #[test]
    fn project_path_round_trip_for_development() {
        let sandbox = ConfigSandbox::new("dev-roundtrip");
        let project = sandbox.root.join("godot-project");
        std::fs::create_dir_all(&project).unwrap();

        set_project_path("development".into(), project.to_string_lossy().into())
            .expect("set ok");
        assert_eq!(
            get_project_path("development".into()),
            Some(project.to_string_lossy().into())
        );

        clear_project_path("development".into()).expect("clear ok");
        assert_eq!(get_project_path("development".into()), None);
    }

    #[test]
    fn set_project_path_rejects_unknown_profile() {
        let _sandbox = ConfigSandbox::new("set-unknown");
        let err = set_project_path("nope".into(), "/tmp".into()).unwrap_err();
        assert!(err.contains("unknown profile: nope"), "{err}");
    }

    #[test]
    fn set_project_path_rejects_nonexistent_path() {
        let sandbox = ConfigSandbox::new("set-missing");
        let missing = sandbox.root.join("does-not-exist");
        let err = set_project_path("development".into(), missing.to_string_lossy().into())
            .unwrap_err();
        assert!(err.contains("Not a folder or file"), "{err}");
        assert_eq!(get_project_path("development".into()), None);
    }

    #[test]
    fn resolve_development_without_path_is_not_connected() {
        let _sandbox = ConfigSandbox::new("resolve-empty");
        let err = resolve_profile_workdir("development").unwrap_err();
        assert!(err.contains("No project connected"), "{err}");
    }

    #[test]
    fn resolve_development_with_connected_path() {
        let sandbox = ConfigSandbox::new("resolve-ok");
        let project = sandbox.root.join("my-godot");
        std::fs::create_dir_all(&project).unwrap();
        set_project_path("development".into(), project.to_string_lossy().into()).unwrap();
        let got = resolve_profile_workdir("development").expect("resolve");
        assert_eq!(got, project);
    }

    #[test]
    fn load_migrates_legacy_manuscript_path_into_project_paths() {
        let sandbox = ConfigSandbox::new("migrate-legacy");
        std::fs::write(
            sandbox.config_file(),
            r#"{"manuscript_path": "/some/legacy/path"}"#,
        )
        .unwrap();
        let cfg = crate::config::load();
        assert_eq!(
            cfg.project_paths.get("manuscript").map(String::as_str),
            Some("/some/legacy/path")
        );
        assert!(cfg.manuscript_path.is_none());
    }
}
