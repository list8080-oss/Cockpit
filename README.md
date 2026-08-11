# InPrincipio

Desktop app (macOS) for working on text or code in parallel: one prompt, several
AI models answer side by side, so you can compare and pick the best.

*Русская версия — ниже.*

## Features

- Three built-in project profiles — Manuscript, Development, Free project —
  each with its own connected folder/file and agent roles.
- One click fans a prompt out to Claude, Codex, Cursor, and OpenCode in
  parallel.
- Orchestrator modes: plain fan-out with configurable per-engine roles,
  side-by-side comparison, read-only Plan, Propose-changes with a file diff
  preview, Apply with a per-file journal and rollback, and a Full-access mode
  where an agent can read/write files and delegate to the other CLIs itself.
- Full writing editor (Editor mode): real project documents, markdown,
  images, spell-check, disk-persisted version history (autosave backups +
  named snapshots).
- Readiness indicator per engine, Codex usage-limit display; sign-in/out for
  every engine in Settings → Agents.
- Settings: interface language (en/ru/uk/cs), appearance (Normal/Night/Book),
  per-profile project path.
- Auto-update: the app checks for and installs new versions itself.

## Requirements

Each engine needs its CLI installed and signed in, on its own subscription:

- [`claude`](https://claude.com/claude-code) (Claude Code)
- `codex` (ChatGPT)
- `cursor-agent` (Cursor)
- `opencode` (OpenCode)

## Development

```bash
pnpm install
pnpm tauri dev
```

Build:

```bash
pnpm tauri build
```

## Stack

Tauri v2 (Rust) + React + TypeScript.

---

# InPrincipio (Русский)

Настольное приложение (macOS) для параллельной работы с текстом или кодом:
один запрос — сразу несколько вариантов от разных ИИ-моделей, чтобы сравнивать
и выбирать лучший.

## Возможности

- Три встроенных профиля проекта — Рукопись, Разработка, Свободный проект —
  у каждого свой подключаемый файл/папка и свой набор ролей агентов.
- Один клик — параллельный запрос к Claude, Codex, Cursor и OpenCode.
- Режимы Оркестратора: обычный фан-аут с настраиваемыми ролями агентов,
  сравнение результатов, режим «План» (только чтение), «Предложение
  изменений» с превью diff по файлам, «Применение» с журналом по файлам и
  откатом, режим «Полный доступ», где агент сам читает/пишет файлы и может
  делегировать подзадачи другим CLI.
- Полноценный текстовый редактор (режим «Редактор»): реальные документы
  проекта, markdown, картинки, проверка орфографии, история версий на диске
  (автосохранения и именованные снимки).
- Лампочка готовности по каждому движку, индикатор лимита Codex; вход/выход
  для каждого движка — в Настройки → Агенты.
- Настройки: язык интерфейса (en/ru/uk/cs), оформление (Светлое/Тёмное/
  Сепия), путь к проекту на каждый профиль.
- Автообновление: приложение само проверяет новые версии и обновляется.

## Требования

Для каждого движка нужен установленный и авторизованный CLI, каждый на своей
подписке:

- [`claude`](https://claude.com/claude-code) (Claude Code)
- `codex` (ChatGPT)
- `cursor-agent` (Cursor)
- `opencode` (OpenCode)

## Разработка

```bash
pnpm install
pnpm tauri dev
```

Сборка:

```bash
pnpm tauri build
```

## Стек

Tauri v2 (Rust) + React + TypeScript.
