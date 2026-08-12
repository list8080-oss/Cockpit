// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: () => Promise.resolve(() => {}) }),
}));

import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { Editor } from "./Editor";
import type { DocumentContent } from "../types";
import { AUTOSAVE_INTERVAL_MS } from "../constants";
import { callsTo, clearTestStorage, mockInvoke } from "../../testSupport/tauriInvokeMock";
import { weT } from "../i18n";

function doc(overrides: Partial<DocumentContent> = {}): DocumentContent {
  return {
    id: "doc-1",
    title: "Глава 1",
    doc_type: "chapter",
    content: "Изначальный текст.",
    file: "doc-1.md",
    ...overrides,
  };
}

/** Real CodeMirror instance mounted by <Editor>, found via its own public
 * `findFromDOM` API — driving edits this way avoids jsdom's incomplete
 * contenteditable/Selection support while still going through the exact
 * same update-listener path a real keystroke would. */
function view(container: HTMLElement): EditorView {
  const found = EditorView.findFromDOM(container);
  if (!found) throw new Error("CodeMirror view not found in container");
  return found;
}

function typeInto(container: HTMLElement, text: string) {
  const v = view(container);
  v.dispatch({ changes: { from: v.state.doc.length, insert: text } });
}

function statusClass(container: HTMLElement): "saving" | "unsaved" | "saved" | null {
  if (container.querySelector(".editor-status.saving")) return "saving";
  if (container.querySelector(".editor-status.unsaved")) return "unsaved";
  if (container.querySelector(".editor-status.saved")) return "saved";
  return null;
}

beforeEach(() => {
  clearTestStorage();
  mockInvoke();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Editor — автосейв", () => {
  it("монтируется без исключений и создаёт CodeMirror DOM", () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(<Editor doc={doc()} onSave={onSave} />);
    const cmContent = container.querySelector(".cm-content");
    expect(cmContent).not.toBeNull();
    expect(cmContent?.textContent).toContain("Изначальный текст.");
  });

  it("правка помечает документ как unsaved, кнопка «Сохранить» вызывает onSave", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(<Editor doc={doc()} onSave={onSave} />);

    act(() => {
      typeInto(container, " плюс правка");
    });
    expect(statusClass(container)).toBe("unsaved");

    const saveBtn = container.querySelector(".save-btn") as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(statusClass(container)).toBe("saved");
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("doc-1", expect.stringContaining("плюс правка"));
  });

  it("периодический автосейв срабатывает сам, без клика", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(<Editor doc={doc()} onSave={onSave} />);

    act(() => {
      typeInto(container, " автосейв-правка");
    });
    expect(statusClass(container)).toBe("unsaved");
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS);
    });

    expect(onSave).toHaveBeenCalledWith("doc-1", expect.stringContaining("автосейв-правка"));
    expect(statusClass(container)).toBe("saved");
  });

  it("при projectPath успешный save создаёт бэкап и обновляет счётчик слов", async () => {
    mockInvoke({
      get_manuscript_word_count: () => ({ total_words: 42, total_chars: 250 }),
      create_backup: () => null,
    });
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(
      <Editor doc={doc()} onSave={onSave} projectPath="/tmp/project" />,
    );

    act(() => {
      typeInto(container, " с бэкапом");
    });
    const saveBtn = container.querySelector(".save-btn") as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(statusClass(container)).toBe("saved");
    });

    const backupCalls = callsTo("create_backup");
    expect(backupCalls).toHaveLength(1);
    expect(backupCalls[0]).toMatchObject({
      projectPath: "/tmp/project",
      nodeId: "doc-1",
    });
    expect(String((backupCalls[0] as { content?: string })?.content)).toContain("с бэкапом");
  });

  it("отказ onSave: остаётся unsaved (не застревает в saving), показывает тост", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const onToast = vi.fn();
    const { container } = render(<Editor doc={doc()} onSave={onSave} onToast={onToast} />);

    act(() => {
      typeInto(container, " будет ошибка");
    });
    const saveBtn = container.querySelector(".save-btn") as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(onToast).toHaveBeenCalled();
    });
    // Editor's LocaleContext defaults to "ru" when unwrapped (see LocaleContext.tsx);
    // derived from the real translation rather than a second hardcoded copy of the
    // string, so this doesn't drift if the wording changes.
    expect(onToast).toHaveBeenCalledWith(weT("ru", "autosaveFailedRetrying"), "error");
    // Не осталось "зависшим" в состоянии saving — вернулось в unsaved,
    // изменения по-прежнему считаются несохранёнными.
    expect(statusClass(container)).toBe("unsaved");
  });

  it("переключение документа при dirty сохраняет СТАРЫЙ документ со старым содержимым", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { container, rerender } = render(<Editor doc={doc()} onSave={onSave} />);

    act(() => {
      typeInto(container, " несохранённая правка");
    });
    expect(statusClass(container)).toBe("unsaved");
    expect(onSave).not.toHaveBeenCalled();

    rerender(
      <Editor
        doc={doc({ id: "doc-2", title: "Глава 2", content: "Текст главы 2." })}
        onSave={onSave}
      />,
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        "doc-1",
        expect.stringContaining("несохранённая правка"),
      );
    });
  });

  it("нет правок — ни ручной, ни периодический save не вызывается", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn().mockResolvedValue(true);
    const { container } = render(<Editor doc={doc()} onSave={onSave} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS * 2);
    });
    expect(onSave).not.toHaveBeenCalled();

    const saveBtn = container.querySelector(".save-btn") as HTMLButtonElement;
    act(() => {
      fireEvent.click(saveBtn);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
