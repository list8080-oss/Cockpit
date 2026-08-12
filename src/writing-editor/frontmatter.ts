/** Document frontmatter and body — mirrors `src-tauri/src/editor/frontmatter.rs`. */

export interface DocumentFrontmatter {
  id: string;
  type: string;
  title: string;
  created: string;
  modified: string;
  synopsis?: string | null;
  tags: string[];
  status: string;
}

export interface ParsedDocument {
  frontmatter: DocumentFrontmatter;
  body: string;
}

export function splitDocument(raw: string): ParsedDocument | null {
  const trimmed = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  if (!trimmed.startsWith("---")) return null;
  const afterOpen = trimmed.slice(3).replace(/^\r?\n/, "");
  const closeIdx = afterOpen.search(/\r?\n---(\r?\n|$)/);
  if (closeIdx === -1) return null;
  const yaml = afterOpen.slice(0, closeIdx);
  const body = afterOpen
    .slice(closeIdx)
    .replace(/^\r?\n---\r?\n?/, "")
    .trimStart();
  const frontmatter = parseFrontmatterYaml(yaml);
  if (!frontmatter) return null;
  return { frontmatter, body };
}

export function composeDocument(frontmatter: DocumentFrontmatter, body: string): string {
  return `---\n${serializeFrontmatterYaml(frontmatter)}\n---\n\n${body.trimEnd()}`;
}

function parseFrontmatterYaml(yaml: string): DocumentFrontmatter | null {
  let id: string | undefined;
  let type: string | undefined;
  let title: string | undefined;
  let created: string | undefined;
  let modified: string | undefined;
  let synopsis: string | null | undefined;
  const tags: string[] = [];
  let status: string | undefined;
  let inTags = false;

  for (const line of yaml.split("\n")) {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      inTags = false;
      continue;
    }
    if (inTags) {
      const tag = trimmed.startsWith("- ") ? trimmed.slice(2).trim() : null;
      if (tag) tags.push(unquote(tag));
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    switch (key) {
      case "id":
        id = value;
        break;
      case "type":
        type = value;
        break;
      case "title":
        title = unquote(value);
        break;
      case "created":
        created = value;
        break;
      case "modified":
        modified = value;
        break;
      case "synopsis":
        synopsis = !value || value === "null" ? null : unquote(value);
        break;
      case "status":
        status = unquote(value);
        break;
      case "tags":
        if (value === "[]") {
          inTags = false;
        } else if (!value) {
          inTags = true;
        } else {
          tags.push(unquote(value));
          inTags = false;
        }
        break;
      default:
        break;
    }
  }

  if (!id || !type || !title || !created || !modified) return null;
  return {
    id,
    type,
    title,
    created,
    modified,
    synopsis: synopsis ?? null,
    tags,
    status: status ?? "draft",
  };
}

function serializeFrontmatterYaml(fm: DocumentFrontmatter): string {
  const lines = [
    `id: ${fm.id}`,
    `type: ${fm.type}`,
    `title: ${yamlQuote(fm.title)}`,
    `created: ${fm.created}`,
    `modified: ${fm.modified}`,
  ];
  if (fm.synopsis) lines.push(`synopsis: ${yamlQuote(fm.synopsis)}`);
  lines.push(`status: ${fm.status}`);
  if (fm.tags.length === 0) {
    lines.push("tags: []");
  } else {
    lines.push("tags:");
    for (const tag of fm.tags) lines.push(`  - ${yamlQuote(tag)}`);
  }
  return lines.join("\n");
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  return value;
}

function yamlQuote(value: string): string {
  if (!value || value.includes(":") || value.includes("#")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}
