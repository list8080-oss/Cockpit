//! Legacy vs structured project detection.

use std::path::Path;

use super::paths::project_manifest_path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectMode {
    Legacy,
    Structured,
}

impl ProjectMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Legacy => "legacy",
            Self::Structured => "structured",
        }
    }
}

pub fn detect_project_mode(project_root: &Path) -> ProjectMode {
    if project_manifest_path(project_root).is_file() {
        ProjectMode::Structured
    } else {
        ProjectMode::Legacy
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::editor::paths::{ensure_project_layout, INPRINCIPIO_DIR, PROJECT_JSON};

    #[test]
    fn detects_legacy_and_structured() {
        let root = std::env::temp_dir().join(format!(
            "inprincipio-mode-test-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        assert_eq!(detect_project_mode(&root), ProjectMode::Legacy);

        ensure_project_layout(&root).unwrap();
        std::fs::write(
            root.join(INPRINCIPIO_DIR).join(PROJECT_JSON),
            r#"{"version":1,"root":"","nodes":{}}"#,
        )
        .unwrap();
        assert_eq!(detect_project_mode(&root), ProjectMode::Structured);

        let _ = std::fs::remove_dir_all(&root);
    }
}
