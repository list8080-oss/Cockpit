mod auth;
mod codex_limits;
mod config;
mod dictionaries;
mod editor_assets;
mod engines;
mod manuscript;

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
            manuscript::get_manuscript_path,
            manuscript::set_manuscript_path,
            engines::run_claude,
            engines::run_codex,
            engines::run_cursor,
            auth::list_auth_status,
            auth::start_auth_login,
            auth::start_auth_logout,
            codex_limits::get_codex_limits,
            editor_assets::get_editor_project_dir,
            editor_assets::import_image,
            editor_assets::import_image_bytes,
            editor_assets::read_image_base64,
            dictionaries::list_dictionary_status,
            dictionaries::download_dictionary,
            dictionaries::delete_dictionary,
            dictionaries::read_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
