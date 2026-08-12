import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocTypeIcon } from "../components/DocTypeIcon";
import { useWeT } from "../LocaleContext";
import type { SearchResult } from "../types";

function renderSnippet(snippet?: string) {
  if (!snippet) return null;
  const parts = snippet.split(/(<mark>.*?<\/mark>)/g);
  return parts.map((part, index) => {
    if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
      return (
        <mark key={index}>{part.slice(6, -7)}</mark>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function ProjectSearch({
  projectPath,
  onSelectNode,
  onToast,
}: {
  projectPath: string;
  onSelectNode: (id: string) => void;
  onToast: (message: string, type: "success" | "error") => void;
}) {
  const t = useWeT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setBusy(true);
      void invoke<SearchResult[]>("search_writing_project_command", {
        projectPath,
        query: trimmed,
        limit: 20,
      })
        .then((hits) => {
          if (!cancelled) setResults(hits);
        })
        .catch((err) => {
          if (!cancelled) onToast(String(err), "error");
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [onToast, projectPath, query]);

  return (
    <div className="we-project-search" data-tour="search">
      <button
        type="button"
        className="we-project-search-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? t("projectSearchClose") : t("projectSearchOpen")}
      </button>
      {open && (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("projectSearchPlaceholder")}
            aria-label={t("projectSearchPlaceholder")}
          />
          <div className="we-project-search-results" aria-busy={busy}>
            {query.trim().length < 2 && (
              <p className="we-project-search-hint">{t("projectSearchHint")}</p>
            )}
            {query.trim().length >= 2 && !busy && results.length === 0 && (
              <p className="we-project-search-hint">{t("projectSearchEmpty")}</p>
            )}
            {results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                className="we-project-search-hit"
                onClick={() => onSelectNode(hit.id)}
              >
                <span className="we-project-search-hit-title">
                  <DocTypeIcon docType={hit.doc_type} size={14} />
                  {hit.title}
                </span>
                {hit.snippet && (
                  <span className="we-project-search-hit-snippet">{renderSnippet(hit.snippet)}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
