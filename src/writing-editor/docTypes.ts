/** Built-in document types — synced with `src-tauri/src/editor/doc_types.rs`. */

export type DocTypeCategory = "manuscript" | "planning";

export interface DocTypeDefinition {
  id: string;
  label: string;
  category: DocTypeCategory;
  icon: string;
  heading_level: number;
  builtin: boolean;
}

export const DOC_TYPES: DocTypeDefinition[] = [
  { id: "part", label: "Part", category: "manuscript", icon: "P", heading_level: 1, builtin: true },
  { id: "chapter", label: "Chapter", category: "manuscript", icon: "C", heading_level: 1, builtin: true },
  { id: "scene", label: "Scene", category: "manuscript", icon: "S", heading_level: 2, builtin: true },
  { id: "character", label: "Character", category: "planning", icon: "H", heading_level: 2, builtin: true },
  { id: "location", label: "Location", category: "planning", icon: "L", heading_level: 2, builtin: true },
  { id: "lore", label: "Lore", category: "planning", icon: "O", heading_level: 2, builtin: true },
  { id: "item", label: "Item", category: "planning", icon: "I", heading_level: 2, builtin: true },
  { id: "faction", label: "Faction", category: "planning", icon: "F", heading_level: 2, builtin: true },
  { id: "event", label: "Event", category: "planning", icon: "E", heading_level: 2, builtin: true },
  { id: "quest", label: "Quest", category: "planning", icon: "Q", heading_level: 2, builtin: true },
  { id: "note", label: "Note", category: "planning", icon: "N", heading_level: 3, builtin: true },
  { id: "timeline", label: "Timeline", category: "planning", icon: "T", heading_level: 2, builtin: true },
  { id: "theme", label: "Theme", category: "planning", icon: "M", heading_level: 3, builtin: true },
  { id: "folder", label: "Folder", category: "planning", icon: "D", heading_level: 1, builtin: true },
];

export function docTypesForSection(section: DocTypeCategory): DocTypeDefinition[] {
  return DOC_TYPES.filter((d) => d.category === section);
}

export function defaultDocTypeForSection(section: DocTypeCategory): string {
  return section === "manuscript" ? "chapter" : "note";
}
