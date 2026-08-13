//! Resolve absolute paths to CLI binaries.
//!
//! GUI-launched apps on macOS don't inherit a login shell's PATH, so Homebrew
//! binaries can be invisible even though a Terminal `which` finds them. Try
//! known install locations before falling back to bare `PATH` lookup.

pub fn resolve_bin(candidates: &[&str], fallback: &str) -> String {
    for c in candidates {
        if std::path::Path::new(c).is_file() {
            return c.to_string();
        }
    }
    fallback.to_string()
}

pub fn claude_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/claude", "/usr/local/bin/claude"], "claude")
}

pub fn codex_bin() -> String {
    resolve_bin(
        &[
            "/Applications/ChatGPT.app/Contents/Resources/codex",
            "/opt/homebrew/bin/codex",
            "/usr/local/bin/codex",
        ],
        "codex",
    )
}

pub fn cursor_bin() -> String {
    if let Some(home) = dirs::home_dir() {
        let p = home.join(".local/bin/cursor-agent");
        if p.is_file() {
            return p.to_string_lossy().to_string();
        }
    }
    resolve_bin(
        &["/opt/homebrew/bin/cursor-agent", "/usr/local/bin/cursor-agent"],
        "cursor-agent",
    )
}

pub fn gh_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/gh", "/usr/local/bin/gh"], "gh")
}

pub fn git_bin() -> String {
    resolve_bin(&["/usr/bin/git", "/opt/homebrew/bin/git", "/usr/local/bin/git"], "git")
}

pub fn opencode_bin() -> String {
    resolve_bin(&["/opt/homebrew/bin/opencode", "/usr/local/bin/opencode"], "opencode")
}
