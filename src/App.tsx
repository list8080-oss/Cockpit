import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import "./App.css";

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date" }
  | { status: "downloading"; version: string }
  | { status: "restarting" }
  | { status: "error"; message: string };

function UpdateBar() {
  const [version, setVersion] = useState("");
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const run = async () => {
    setState({ status: "checking" });
    try {
      const update = await checkForUpdate();
      if (!update) {
        setState({ status: "up-to-date" });
        return;
      }
      setState({ status: "downloading", version: update.version });
      await update.downloadAndInstall();
      setState({ status: "restarting" });
      await relaunch();
    } catch (e) {
      setState({ status: "error", message: String(e) });
    }
  };

  const busy = state.status === "checking" || state.status === "downloading" || state.status === "restarting";

  let statusText = "";
  if (state.status === "up-to-date") statusText = "актуальная версия";
  if (state.status === "checking") statusText = "проверяем…";
  if (state.status === "downloading") statusText = `скачиваем ${state.version}…`;
  if (state.status === "restarting") statusText = "перезапуск…";
  if (state.status === "error") statusText = state.message;

  return (
    <div className="update-bar">
      <span className="version">v{version}</span>
      <button onClick={run} disabled={busy}>
        {busy ? "…" : "Проверить обновление"}
      </button>
      {statusText && (
        <span className={state.status === "error" ? "error-text" : "muted"}>{statusText}</span>
      )}
    </div>
  );
}

interface ChapterInfo {
  file: string;
  title: string;
}

type VariantState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

function Variant({ label, state }: { label: string; state: VariantState }) {
  const copy = () => {
    if (state.status === "done") navigator.clipboard.writeText(state.text);
  };
  return (
    <div className="variant">
      <div className="variant-head">
        <span className="variant-label">{label}</span>
        {state.status === "running" && <span className="badge badge-running">пишет…</span>}
        {state.status === "error" && <span className="badge badge-error">ошибка</span>}
        {state.status === "done" && (
          <button className="copy-btn" onClick={copy} title="Скопировать">
            копировать
          </button>
        )}
      </div>
      <div className="variant-body">
        {state.status === "idle" && <span className="muted">—</span>}
        {state.status === "running" && <span className="muted">Ждём ответ…</span>}
        {state.status === "error" && <span className="error-text">{state.message}</span>}
        {state.status === "done" && <pre>{state.text}</pre>}
      </div>
    </div>
  );
}

export default function App() {
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [claude, setClaude] = useState<VariantState>({ status: "idle" });
  const [codex, setCodex] = useState<VariantState>({ status: "idle" });

  useEffect(() => {
    invoke<ChapterInfo[]>("list_chapters")
      .then(setChapters)
      .catch((e) => setChaptersError(String(e)));
  }, []);

  const loadChapter = async (file: string) => {
    try {
      const text = await invoke<string>("read_chapter", { file });
      setPrompt(text);
    } catch (e) {
      setPrompt(`[не удалось загрузить главу: ${String(e)}]`);
    }
  };

  const send = () => {
    if (!prompt.trim()) return;
    setClaude({ status: "running" });
    setCodex({ status: "running" });
    invoke<string>("run_claude", { prompt })
      .then((text) => setClaude({ status: "done", text }))
      .catch((e) => setClaude({ status: "error", message: String(e) }));
    invoke<string>("run_codex", { prompt })
      .then((text) => setCodex({ status: "done", text }))
      .catch((e) => setCodex({ status: "error", message: String(e) }));
  };

  const busy = claude.status === "running" || codex.status === "running";

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Главы</h2>
        {chaptersError && <p className="error-text">{chaptersError}</p>}
        <ul>
          {chapters.map((c) => (
            <li key={c.file}>
              <button onClick={() => loadChapter(c.file)}>{c.title}</button>
            </li>
          ))}
        </ul>
        <UpdateBar />
      </aside>

      <main className="main">
        <textarea
          className="prompt-box"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Вставь фрагмент или выбери главу слева. Можно писать как обычно с агентом — например «проза/стиль: оживи этот диалог» плюс текст."
        />
        <button className="send-btn" onClick={send} disabled={busy || !prompt.trim()}>
          {busy ? "Ждём агентов…" : "Отправить Claude + Codex"}
        </button>

        <div className="variants">
          <Variant label="Claude" state={claude} />
          <Variant label="Codex (Sol)" state={codex} />
        </div>
      </main>
    </div>
  );
}
