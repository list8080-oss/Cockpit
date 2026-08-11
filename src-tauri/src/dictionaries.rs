//! Spell-check dictionaries are NOT bundled into the app — they're fetched
//! on demand from the public repo's `dictionaries/` folder (raw.githubusercontent)
//! and cached under app-data. Keeps the default install small; the user picks
//! which languages they actually want in Settings.

use serde::Serialize;
use std::path::PathBuf;

const LANGS: &[&str] = &["en", "ru", "uk", "cs"];
const RAW_BASE: &str =
    "https://raw.githubusercontent.com/list8080-oss/InPrincipio/main/dictionaries";

#[derive(Debug, Clone, Serialize)]
pub struct DictionaryStatus {
    pub lang: String,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct DictionaryFiles {
    pub aff: String,
    pub dic: String,
}

fn dictionaries_dir() -> Result<PathBuf, String> {
    let dir = dirs::data_dir()
        .ok_or("data directory unavailable")?
        .join("yar-cockpit")
        .join("dictionaries");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn require_known_lang(lang: &str) -> Result<(), String> {
    if LANGS.contains(&lang) {
        Ok(())
    } else {
        Err(format!("unknown dictionary language: {lang}"))
    }
}

fn is_installed(dir: &std::path::Path, lang: &str) -> bool {
    dir.join(format!("{lang}.aff")).is_file() && dir.join(format!("{lang}.dic")).is_file()
}

#[tauri::command]
pub fn list_dictionary_status() -> Result<Vec<DictionaryStatus>, String> {
    let dir = dictionaries_dir()?;
    Ok(LANGS
        .iter()
        .map(|&lang| DictionaryStatus {
            lang: lang.to_string(),
            installed: is_installed(&dir, lang),
        })
        .collect())
}

#[tauri::command]
pub async fn download_dictionary(lang: String) -> Result<(), String> {
    require_known_lang(&lang)?;
    let dir = dictionaries_dir()?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("http client: {e}"))?;

    for ext in ["aff", "dic"] {
        let url = format!("{RAW_BASE}/{lang}.{ext}");
        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("failed to download {lang}.{ext}: {e}"))?;
        if !resp.status().is_success() {
            return Err(format!(
                "failed to download {lang}.{ext}: HTTP {}",
                resp.status()
            ));
        }
        let bytes = resp
            .bytes()
            .await
            .map_err(|e| format!("failed to read {lang}.{ext}: {e}"))?;
        std::fs::write(dir.join(format!("{lang}.{ext}")), &bytes)
            .map_err(|e| format!("failed to save {lang}.{ext}: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_dictionary(lang: String) -> Result<(), String> {
    require_known_lang(&lang)?;
    let dir = dictionaries_dir()?;
    for ext in ["aff", "dic"] {
        let path = dir.join(format!("{lang}.{ext}"));
        if path.is_file() {
            std::fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn read_dictionary(lang: String) -> Result<DictionaryFiles, String> {
    require_known_lang(&lang)?;
    let dir = dictionaries_dir()?;
    if !is_installed(&dir, &lang) {
        return Err(format!("dictionary not installed: {lang}"));
    }
    let aff = std::fs::read_to_string(dir.join(format!("{lang}.aff")))
        .map_err(|e| format!("failed to read {lang}.aff: {e}"))?;
    let dic = std::fs::read_to_string(dir.join(format!("{lang}.dic")))
        .map_err(|e| format!("failed to read {lang}.dic: {e}"))?;
    Ok(DictionaryFiles { aff, dic })
}
