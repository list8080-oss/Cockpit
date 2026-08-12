/** Writing editor types — synced with `src-tauri/src/editor/`. */

export const STATUS_VALUES = [
  "draft",
  "in-revision",
  "revised",
  "final",
  "stuck",
  "cut",
] as const;

export type Status = (typeof STATUS_VALUES)[number];

export interface ProjectNode {
  title?: string;
  file?: string;
  doc_type?: string;
  children: string[];
}

export interface DocTypeDefinition {
  id: string;
  label: string;
  category: "manuscript" | "planning";
  icon: string;
  heading_level: number;
  builtin: boolean;
}

export interface ProjectManifest {
  version: number;
  root: string;
  nodes: Record<string, ProjectNode>;
  doc_types: DocTypeDefinition[];
  manuscript_roots?: string[];
  planning_roots?: string[];
  tag_colors?: Record<string, string>;
  status_colors?: Record<string, string>;
  /** `"legacy"` flat files, `"structured"` `.inprincipio/project.json` */
  mode?: EditorProjectMode;
}

export type EditorProjectMode = "legacy" | "structured";

export interface DocumentContent {
  id: string;
  title: string;
  doc_type: string;
  content: string;
  file: string;
  synopsis?: string | null;
  tags?: string[];
  status?: string;
}

export interface NodeMetadata {
  synopsis: string | null;
  tags: string[];
  status: Status;
}

export type ProjectMetadata = Record<string, NodeMetadata>;

export interface SearchResult {
  id: string;
  title: string;
  doc_type: string;
  file: string;
  snippet?: string;
}

export interface BacklinkResult {
  id: string;
  title: string;
  doc_type: string;
  snippet?: string;
}

export interface WordCountResult {
  total_words: number;
  total_chars: number;
}

export interface ExportResult {
  format: string;
  output_path: string;
  word_count: number;
  section_count: number;
}

export interface ReadThroughSection {
  id: string;
  title: string;
  doc_type: string;
  body: string;
  body_html: string;
  heading_level: number;
  word_count: number;
}

export interface ReadThroughData {
  sections: ReadThroughSection[];
  total_words: number;
}

export type ExportFormat = "html" | "pdf";

export interface BackupEntry {
  node_id: string;
  timestamp: string;
  size_bytes: number;
  preview: string;
}

export type DocType = string;

// Corkboard (phase 4+)

export interface CorkboardCard {
  id: string;
  title: string;
  doc_type: string;
  synopsis: string;
  word_count: number;
  status: Status;
  tags: string[];
}

export interface CorkboardColumn {
  id: string;
  title: string;
  doc_type: string;
  cards: string[];
}

export interface CorkboardView {
  columns: CorkboardColumn[];
  cards: Record<string, CorkboardCard>;
}

/** Virtual column for scenes attached directly to manuscript roots. */
export const LOOSE_COLUMN_ID = "__manuscript_root__";

export interface CorkboardData {
  cards: Record<string, CorkboardCard>;
}

// Project templates (phase 6+)

export type TemplateId = "blank" | "novel" | "short-story" | "game-narrative" | "screenplay";

export const TEMPLATE_IDS: TemplateId[] = [
  "blank",
  "novel",
  "short-story",
  "game-narrative",
  "screenplay",
];

// Named snapshots — see VersionHistory panel

export interface SnapshotEntry {
  node_id: string;
  timestamp: string;
  name: string;
  size_bytes: number;
  preview: string;
}
