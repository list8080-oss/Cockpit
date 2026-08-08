import type { BackupEntry, DocumentContent, SnapshotEntry } from "../types";

const BACKUPS_KEY = "yar-cockpit.editor.backups";
const SNAPSHOTS_KEY = "yar-cockpit.editor.snapshots";
const MAX_BACKUPS = 20;

type Store<T> = Record<string, T[]>;

function readStore<T>(key: string): Store<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Store<T>;
  } catch {
    return {};
  }
}

function writeStore<T>(key: string, store: Store<T>) {
  try {
    localStorage.setItem(key, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function stamp(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function pushLocalBackup(nodeId: string, content: string) {
  const store = readStore<BackupEntry & { content: string }>(BACKUPS_KEY);
  const list = store[nodeId] ?? [];
  const entry = {
    node_id: nodeId,
    timestamp: stamp(),
    size_bytes: new Blob([content]).size,
    preview: content.slice(0, 160),
    content,
  };
  store[nodeId] = [entry, ...list].slice(0, MAX_BACKUPS);
  writeStore(BACKUPS_KEY, store);
}

export function listLocalBackups(nodeId: string): BackupEntry[] {
  const store = readStore<BackupEntry & { content: string }>(BACKUPS_KEY);
  return (store[nodeId] ?? []).map(({ content: _c, ...rest }) => rest);
}

export function restoreLocalBackup(
  nodeId: string,
  timestamp: string,
  title: string,
): DocumentContent | null {
  const store = readStore<BackupEntry & { content: string }>(BACKUPS_KEY);
  const hit = (store[nodeId] ?? []).find((b) => b.timestamp === timestamp);
  if (!hit) return null;
  return {
    id: nodeId,
    title,
    doc_type: "note",
    content: hit.content,
    file: `${nodeId}.md`,
  };
}

export function listLocalSnapshots(nodeId: string): SnapshotEntry[] {
  const store = readStore<SnapshotEntry & { content: string }>(SNAPSHOTS_KEY);
  return (store[nodeId] ?? []).map(({ content: _c, ...rest }) => rest);
}

export function pinLocalSnapshot(
  nodeId: string,
  timestamp: string,
  name: string,
): SnapshotEntry | null {
  const backups = readStore<BackupEntry & { content: string }>(BACKUPS_KEY);
  const source = (backups[nodeId] ?? []).find((b) => b.timestamp === timestamp);
  if (!source) return null;
  const store = readStore<SnapshotEntry & { content: string }>(SNAPSHOTS_KEY);
  const entry = {
    node_id: nodeId,
    timestamp: stamp(),
    name,
    size_bytes: source.size_bytes,
    preview: source.preview,
    content: source.content,
  };
  store[nodeId] = [entry, ...(store[nodeId] ?? [])];
  writeStore(SNAPSHOTS_KEY, store);
  const { content: _c, ...rest } = entry;
  return rest;
}

export function unpinLocalSnapshot(nodeId: string, snapshotTimestamp: string) {
  const store = readStore<SnapshotEntry & { content: string }>(SNAPSHOTS_KEY);
  store[nodeId] = (store[nodeId] ?? []).filter((s) => s.timestamp !== snapshotTimestamp);
  writeStore(SNAPSHOTS_KEY, store);
}

export function restoreLocalSnapshot(
  nodeId: string,
  snapshotTimestamp: string,
  title: string,
): DocumentContent | null {
  const store = readStore<SnapshotEntry & { content: string }>(SNAPSHOTS_KEY);
  const hit = (store[nodeId] ?? []).find((s) => s.timestamp === snapshotTimestamp);
  if (!hit) return null;
  return {
    id: nodeId,
    title,
    doc_type: "note",
    content: hit.content,
    file: `${nodeId}.md`,
  };
}
