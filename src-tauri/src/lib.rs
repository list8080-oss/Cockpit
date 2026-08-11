mod apple_notes;
mod auth;
mod bin_paths;
mod codex_limits;
mod config;
mod dictionaries;
mod editor_assets;
mod editor_project;
mod engines;
mod manuscript;
mod profiles;
mod transcripts;
mod version_history;

/// Shared across different modules' tests that set process-global env vars
/// (`YAR_COCKPIT_ORCHESTRATOR_DATA_DIR`, `YAR_COCKPIT_CONFIG_DIR`) — a
/// module-private lock only serializes tests within that same module, so a
/// test in another module reading the real default location can still race
/// against it under `cargo test`'s default parallel execution. All tests
/// that set either of those vars take this same lock first.
#[cfg(test)]
pub(crate) mod test_env_lock {
    use std::sync::Mutex;
    pub static ENV_LOCK: Mutex<()> = Mutex::new(());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            manuscript::list_chapters,
            manuscript::read_chapter,
            engines::run_claude,
            engines::run_orchestrator_agent,
            engines::run_orchestrator_propose,
            engines::apply_orchestrator_change,
            engines::rollback_orchestrator_change,
            engines::list_orchestrator_journal,
            engines::run_codex,
            engines::run_cursor,
            engines::run_opencode,
            engines::list_cursor_models,
            engines::list_opencode_models,
            auth::list_auth_status,
            auth::start_auth_login,
            auth::start_auth_logout,
            codex_limits::get_codex_limits,
            editor_assets::import_image,
            editor_assets::import_image_bytes,
            editor_assets::read_image_base64,
            editor_project::get_editor_project_dir,
            editor_project::list_editor_documents,
            editor_project::load_document,
            editor_project::save_document,
            editor_project::get_manuscript_word_count,
            version_history::create_backup,
            version_history::list_document_backups,
            version_history::restore_backup,
            version_history::list_document_snapshots,
            version_history::pin_snapshot,
            version_history::unpin_snapshot,
            version_history::restore_snapshot,
            dictionaries::list_dictionary_status,
            dictionaries::download_dictionary,
            dictionaries::delete_dictionary,
            dictionaries::read_dictionary,
            apple_notes::list_apple_notes_folders,
            apple_notes::list_apple_notes,
            apple_notes::read_apple_note,
            profiles::list_profiles,
            profiles::get_active_profile_id,
            profiles::set_active_profile_id,
            profiles::get_project_path,
            profiles::set_project_path,
            profiles::clear_project_path,
            transcripts::save_conversation_transcript,
            transcripts::open_transcripts_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
