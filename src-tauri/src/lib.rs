mod auth;
mod engines;
mod manuscript;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            manuscript::list_chapters,
            manuscript::read_chapter,
            engines::run_claude,
            engines::run_codex,
            engines::run_cursor,
            auth::list_auth_status,
            auth::start_auth_login,
            auth::start_auth_logout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
