//! Read-only access to Apple Notes via osascript (macOS only).
//! Triggers the system Automation permission prompt on first use.

use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppleNotesFolder {
    pub id: String,
    pub name: String,
    pub account: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppleNotesItem {
    pub id: String,
    pub title: String,
}

#[cfg(target_os = "macos")]
fn run_jxa(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .args(["-l", "JavaScript", "-e", script])
        .output()
        .map_err(|e| format!("failed to run osascript: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    if !output.status.success() {
        let detail = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "osascript failed".into()
        };
        // Common TCC denial wording
        if detail.to_lowercase().contains("not allowed")
            || detail.to_lowercase().contains("not authorized")
            || detail.to_lowercase().contains("(-1743)")
        {
            return Err(
                "access_denied: allow Cockpit to control Notes in System Settings → Privacy & Security → Automation"
                    .into(),
            );
        }
        return Err(detail);
    }
    Ok(stdout)
}

#[cfg(not(target_os = "macos"))]
fn run_jxa(_script: &str) -> Result<String, String> {
    Err("Apple Notes is only available on macOS".into())
}

/// Activate Notes and list folders (account + folder). First call may show the
/// macOS Automation permission dialog.
#[tauri::command]
pub fn list_apple_notes_folders() -> Result<Vec<AppleNotesFolder>, String> {
    let script = r#"
function run() {
  const Notes = Application("Notes");
  Notes.includeStandardAdditions = true;
  try { Notes.activate(); } catch (e) {}
  const out = [];
  const accounts = Notes.accounts();
  for (let ai = 0; ai < accounts.length; ai++) {
    const acc = accounts[ai];
    const accName = String(acc.name());
    const folders = acc.folders();
    for (let fi = 0; fi < folders.length; fi++) {
      const f = folders[fi];
      out.push({
        id: String(f.id()),
        name: String(f.name()),
        account: accName
      });
    }
  }
  return JSON.stringify(out);
}
"#;
    let raw = run_jxa(script)?;
    serde_json::from_str(&raw).map_err(|e| format!("bad folders JSON from Notes: {e}: {raw}"))
}

/// List notes in a folder (id from `list_apple_notes_folders`). Titles only.
#[tauri::command]
pub fn list_apple_notes(folder_id: String) -> Result<Vec<AppleNotesItem>, String> {
    if folder_id.is_empty() || folder_id.contains('\n') || folder_id.contains('"') {
        return Err("invalid folder id".into());
    }
    let script = format!(
        r#"
function run() {{
  const folderId = {folder_id:?};
  const Notes = Application("Notes");
  const accounts = Notes.accounts();
  let folder = null;
  for (let ai = 0; ai < accounts.length; ai++) {{
    const folders = accounts[ai].folders();
    for (let fi = 0; fi < folders.length; fi++) {{
      if (String(folders[fi].id()) === folderId) {{
        folder = folders[fi];
        break;
      }}
    }}
    if (folder) break;
  }}
  if (!folder) throw new Error("folder_not_found");
  const notes = folder.notes();
  const out = [];
  const limit = Math.min(notes.length, 300);
  for (let i = 0; i < limit; i++) {{
    const n = notes[i];
    out.push({{
      id: String(n.id()),
      title: String(n.name() || "(untitled)")
    }});
  }}
  return JSON.stringify(out);
}}
"#
    );
    let raw = run_jxa(&script)?;
    serde_json::from_str(&raw).map_err(|e| format!("bad notes JSON from Notes: {e}: {raw}"))
}

/// Read plaintext body of a note by Core Data id.
#[tauri::command]
pub fn read_apple_note(note_id: String) -> Result<String, String> {
    if note_id.is_empty() || note_id.contains('\n') || note_id.contains('"') {
        return Err("invalid note id".into());
    }
    let script = format!(
        r#"
function run() {{
  const noteId = {note_id:?};
  const Notes = Application("Notes");
  let note = null;
  try {{
    note = Notes.notes.byId(noteId);
  }} catch (e) {{
    note = null;
  }}
  if (!note) {{
    const all = Notes.notes();
    for (let i = 0; i < all.length; i++) {{
      if (String(all[i].id()) === noteId) {{
        note = all[i];
        break;
      }}
    }}
  }}
  if (!note) throw new Error("note_not_found");
  try {{
    if (note.passwordProtected && note.passwordProtected()) {{
      throw new Error("note_locked");
    }}
  }} catch (e) {{
    if (String(e).indexOf("note_locked") >= 0) throw e;
  }}
  return String(note.plaintext());
}}
"#
    );
    let raw = run_jxa(&script)?;
    if raw.is_empty() {
        return Err("note is empty or locked".into());
    }
    Ok(raw)
}
