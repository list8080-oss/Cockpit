/** Sidebar filter grammar — `type:scene status:draft tag:urgent` */

export type FilterKey = "type" | "status" | "tag" | "title";

export interface FilterClause {
  key: FilterKey;
  value: string;
}

export interface NodeFilterMeta {
  docType: string;
  status: string;
  tags: string[];
  title: string;
}

const KEY_ALIASES: Record<string, FilterKey> = {
  type: "type",
  t: "type",
  status: "status",
  s: "status",
  tag: "tag",
  tags: "tag",
};

/** Parse a filter query into AND-clauses. Empty query matches everything. */
export function parseFilterQuery(input: string): FilterClause[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const clauses: FilterClause[] = [];
  let i = 0;

  while (i < trimmed.length) {
    while (i < trimmed.length && trimmed[i] === " ") i++;
    if (i >= trimmed.length) break;

    const keyMatch = /^([a-zA-Z]+):/.exec(trimmed.slice(i));
    if (keyMatch) {
      const rawKey = keyMatch[1].toLowerCase();
      const key = KEY_ALIASES[rawKey];
      i += keyMatch[0].length;
      const { value, next } = readValue(trimmed, i);
      i = next;
      if (key) {
        clauses.push({ key, value: value.toLowerCase() });
      } else {
        clauses.push({ key: "title", value: `${rawKey}:${value}`.toLowerCase() });
      }
      continue;
    }

    const { value, next } = readValue(trimmed, i);
    i = next;
    if (value) clauses.push({ key: "title", value: value.toLowerCase() });
  }

  return clauses;
}

function readValue(input: string, start: number): { value: string; next: number } {
  if (start >= input.length) return { value: "", next: start };

  const ch = input[start];
  if (ch === '"' || ch === "'") {
    let value = "";
    let i = start + 1;
    while (i < input.length) {
      if (input[i] === "\\" && i + 1 < input.length) {
        value += input[i + 1];
        i += 2;
        continue;
      }
      if (input[i] === ch) return { value, next: i + 1 };
      value += input[i];
      i++;
    }
    return { value, next: input.length };
  }

  let i = start;
  while (i < input.length && input[i] !== " ") i++;
  return { value: input.slice(start, i), next: i };
}

export function matchesFilter(meta: NodeFilterMeta, clauses: FilterClause[]): boolean {
  if (clauses.length === 0) return true;
  return clauses.every((clause) => matchesClause(meta, clause));
}

function matchesClause(meta: NodeFilterMeta, clause: FilterClause): boolean {
  const needle = clause.value;
  switch (clause.key) {
    case "type":
      return meta.docType.toLowerCase() === needle;
    case "status":
      return meta.status.toLowerCase() === needle;
    case "tag":
      return meta.tags.some((tag) => tag.toLowerCase() === needle);
    case "title":
      return meta.title.toLowerCase().includes(needle);
    default:
      return true;
  }
}
