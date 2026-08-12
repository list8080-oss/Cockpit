import type { Locale } from "../i18n";

type Dict = {
  // Header / save
  saving: string;
  autosaveFailedRetrying: string;
  unsavedChanges: string;
  savedAt: string;
  history: string;
  versionHistory: string;
  save: string;

  // Toolbar — edit
  undo: string;
  redo: string;
  cut: string;
  copy: string;
  paste: string;
  selectAll: string;
  find: string;
  findReplace: string;

  // Toolbar — format
  bold: string;
  italic: string;
  inlineCode: string;
  heading1: string;
  heading2: string;
  heading3: string;
  bulletedList: string;
  numberedList: string;
  blockquote: string;
  codeBlock: string;
  listBulletLabel: string;
  listNumberLabel: string;
  quoteLabel: string;
  codeBlockLabel: string;

  // Toolbar — insert
  insertLink: string;
  linkLabel: string;
  linkPlaceholder: string;
  linkNoMatches: string;
  showingOf: string;
  insertImage: string;
  imageLabel: string;
  openLink: string;
  originalSize: string;
  autoSize: string;

  // Toolbar — modes
  outline: string;
  outlineTooltip: string;
  typewriter: string;
  typewriterTooltip: string;
  focus: string;
  focusTooltip: string;
  distractionFree: string;
  distractionFreeTooltip: string;
  wrap: string;
  wrapTooltip: string;
  manuscript: string;
  manuscriptTooltip: string;
  spell: string;
  spellTooltip: string;
  closeDistractionFree: string;

  // Outline
  headings: string;
  noHeadings: string;

  // Status bar
  lineCol: string;
  selection: string;
  words: string;
  chars: string;
  minRead: string;
  setGoal: string;
  goal: string;
  setGoalTitle: string;
  wordsPlaceholder: string;
  manuscriptWords: string;

  // Version history
  loading: string;
  pinned: string;
  autosaves: string;
  restore: string;
  unpin: string;
  pin: string;
  pinNamePlaceholder: string;
  pinnedDefaultName: string;
  noVersions: string;
  draftTitle: string;

  // Image preview
  preview: string;
  width: string;
  height: string;

  // Shortcuts dialog
  shortcutsTitle: string;
  shortcutsGroupEditor: string;
  shortcutsGroupModes: string;
  shortcutSave: string;
  shortcutUndo: string;
  shortcutRedo: string;
  shortcutBold: string;
  shortcutItalic: string;
  shortcutFind: string;
  shortcutShortcuts: string;
  shortcutDistractionFree: string;
  shortcutTypewriter: string;
  shortcutFocus: string;
  shortcutWrap: string;

  // Misc
  loadingImage: string;

  // Project / document connection
  noProjectConnected: string;
  noDocuments: string;
  chapterLabel: string;
  projectModeLegacy: string;
  projectModeStructured: string;
  initStructuredProject: string;
  migrateToStructuredProject: string;
  structuredProjectReady: string;
  structuredActionFailed: string;
  editorPlaceholder: string;
  sidebarManuscript: string;
  sidebarPlanning: string;
  addDocument: string;
  addChild: string;
  renameDocument: string;
  deleteDocument: string;
  deleteDocumentConfirm: string;
  documentType: string;
  documentTitle: string;
  cancel: string;
  moveUp: string;
  moveDown: string;

  // Metadata panel (phase 2)
  metadataPanelTitle: string;
  metadataSynopsis: string;
  metadataSynopsisPlaceholder: string;
  metadataTags: string;
  metadataTagsPlaceholder: string;
  metadataStatus: string;
  sidebarFilterPlaceholder: string;
  sidebarFilterHint: string;
  statusDraft: string;
  statusInRevision: string;
  statusRevised: string;
  statusFinal: string;
  statusStuck: string;
  statusCut: string;

  // Project search & backlinks (phase 3)
  projectSearchOpen: string;
  projectSearchClose: string;
  projectSearchPlaceholder: string;
  projectSearchHint: string;
  projectSearchEmpty: string;
  backlinksTitle: string;
  backlinksEmpty: string;

  // Corkboard (phase 4)
  viewEditor: string;
  viewCorkboard: string;
  corkboardHint: string;
  corkboardRefresh: string;
  corkboardEmpty: string;
  corkboardNoSynopsis: string;
  corkboardWordCount: string;

  // Export & read-through (phase 5)
  viewReadThrough: string;
  exportTitle: string;
  exportDescription: string;
  exportFormatHtml: string;
  exportFormatHtmlDesc: string;
  exportFormatPdf: string;
  exportFormatPdfDesc: string;
  exportAction: string;
  exportInProgress: string;
  exportSuccess: string;
  readThroughEmpty: string;
  readThroughBackToEditor: string;
  readThroughPrev: string;
  readThroughNext: string;
  readThroughProgress: string;
  readThroughSectionEmpty: string;

  // Themes, templates, onboarding (phase 6)
  themePickerAction: string;
  themePickerTitle: string;
  themePickerBuiltin: string;
  themeAppearanceDark: string;
  themeAppearanceLight: string;
  onboardingHelp: string;
  onboardingProgress: string;
  onboardingSkip: string;
  onboardingBack: string;
  onboardingNext: string;
  onboardingDone: string;
  onboardingWelcomeTitle: string;
  onboardingWelcomeBody: string;
  onboardingSidebarTitle: string;
  onboardingSidebarBody: string;
  onboardingViewsTitle: string;
  onboardingViewsBody: string;
  onboardingMetadataTitle: string;
  onboardingMetadataBody: string;
  onboardingSearchTitle: string;
  onboardingSearchBody: string;
  onboardingExportTitle: string;
  onboardingExportBody: string;
  onboardingThemeTitle: string;
  onboardingThemeBody: string;
  onboardingWikiLinksTitle: string;
  onboardingWikiLinksBody: string;
  onboardingWritingModesTitle: string;
  onboardingWritingModesBody: string;
  onboardingShortcutsTitle: string;
  onboardingShortcutsBody: string;
  metadataSelectDocument: string;
  onboardingReplayFromShortcuts: string;
  templatePickerTitle: string;
  templatePickerDescription: string;
  templatePickerCreate: string;
  templateBlankLabel: string;
  templateBlankDesc: string;
  templateNovelLabel: string;
  templateNovelDesc: string;
  templateShortStoryLabel: string;
  templateShortStoryDesc: string;
  templateGameNarrativeLabel: string;
  templateGameNarrativeDesc: string;
  templateScreenplayLabel: string;
  templateScreenplayDesc: string;
  themeNameDark: string;
  themeNameLight: string;
  themeNameMidnightJazz: string;
  themeNameForestCanopy: string;
  themeNameSunsetDrift: string;
  themeNameArcticFog: string;
  themeNameSepiaStudy: string;
};

const en: Dict = {
  saving: "Saving…",
  autosaveFailedRetrying: "Failed to save — retrying on next autosave",
  unsavedChanges: "Unsaved changes",
  savedAt: "Saved at {time}",
  history: "History",
  versionHistory: "Version history",
  save: "Save",

  undo: "Undo",
  redo: "Redo",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  selectAll: "Select all",
  find: "Find",
  findReplace: "Find / Replace",

  bold: "Bold",
  italic: "Italic",
  inlineCode: "Inline code",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  bulletedList: "Bulleted list",
  numberedList: "Numbered list",
  blockquote: "Blockquote",
  codeBlock: "Code block",
  listBulletLabel: "• List",
  listNumberLabel: "1. List",
  quoteLabel: "Quote",
  codeBlockLabel: "Code block",

  insertLink: "Insert or edit internal link",
  linkLabel: "Link",
  linkPlaceholder: "Type node title…",
  linkNoMatches: "No matches. Press Enter to insert typed title.",
  showingOf: "Showing {shown} of {total}",
  insertImage: "Insert image",
  imageLabel: "Image",
  openLink: "Open →",
  originalSize: "Original: {w} × {h}",
  autoSize: "Auto",

  outline: "Outline",
  outlineTooltip: "Outline navigator",
  typewriter: "Typewriter",
  typewriterTooltip: "Typewriter mode",
  focus: "Focus",
  focusTooltip: "Focus mode",
  distractionFree: "Distraction-free",
  distractionFreeTooltip: "Distraction-free mode",
  wrap: "Wrap",
  wrapTooltip: "Soft wrap",
  manuscript: "Manuscript",
  manuscriptTooltip: "Manuscript mode — centered column",
  spell: "Spell",
  spellTooltip: "Spell check",
  closeDistractionFree: "Close distraction free",

  headings: "Headings",
  noHeadings: "No H1–H3 headings in this document",

  lineCol: "Ln {line}, Col {col}",
  selection: "Sel: {words}w {chars}c",
  words: "{n} words",
  chars: "{n} chars",
  minRead: "{n} min read",
  setGoal: "Set goal",
  goal: "Goal",
  setGoalTitle: "Set word count goal",
  wordsPlaceholder: "Words…",
  manuscriptWords: "Manuscript: {n}w",

  loading: "Loading…",
  pinned: "Pinned",
  autosaves: "Autosaves",
  restore: "Restore",
  unpin: "Unpin",
  pin: "Pin",
  pinNamePlaceholder: "Name this snapshot",
  pinnedDefaultName: "Pinned",
  noVersions: "No versions yet — they appear after you save.",
  draftTitle: "Draft",

  preview: "Preview",
  width: "Width",
  height: "Height",

  shortcutsTitle: "Keyboard Shortcuts",
  shortcutsGroupEditor: "Editor",
  shortcutsGroupModes: "Writing Modes",
  shortcutSave: "Save",
  shortcutUndo: "Undo",
  shortcutRedo: "Redo",
  shortcutBold: "Bold",
  shortcutItalic: "Italic",
  shortcutFind: "Find in document",
  shortcutShortcuts: "Keyboard shortcuts",
  shortcutDistractionFree: "Distraction-free mode",
  shortcutTypewriter: "Typewriter mode",
  shortcutFocus: "Focus mode",
  shortcutWrap: "Soft wrap",

  loadingImage: "Loading image…",

  noProjectConnected: "No project connected — connect a folder or file in Settings > Projects.",
  noDocuments: "This project has no chapters yet.",
  chapterLabel: "Chapter",
  projectModeLegacy: "Simple file list",
  projectModeStructured: "Structured writing project",
  initStructuredProject: "Set up structured project",
  migrateToStructuredProject: "Upgrade to structured project",
  structuredProjectReady: "Structured project is ready.",
  structuredActionFailed: "Could not update the project layout.",
  editorPlaceholder: "Start writing… Use [[Title]] to link to another document.",
  sidebarManuscript: "Manuscript",
  sidebarPlanning: "Planning",
  addDocument: "Add",
  addChild: "Add child document",
  renameDocument: "Rename",
  deleteDocument: "Delete",
  deleteDocumentConfirm: "Delete this document and all its children?",
  documentType: "Type",
  documentTitle: "Title",
  cancel: "Cancel",
  moveUp: "Move up",
  moveDown: "Move down",

  metadataPanelTitle: "Document info",
  metadataSynopsis: "Synopsis",
  metadataSynopsisPlaceholder: "Short summary for corkboard and search…",
  metadataTags: "Tags",
  metadataTagsPlaceholder: "comma, separated, tags",
  metadataStatus: "Status",
  sidebarFilterPlaceholder: "Filter: type:scene status:draft tag:name",
  sidebarFilterHint: "Use type:, status:, tag: or plain text for title.",
  statusDraft: "Draft",
  statusInRevision: "In revision",
  statusRevised: "Revised",
  statusFinal: "Final",
  statusStuck: "Stuck",
  statusCut: "Cut",

  projectSearchOpen: "Search project",
  projectSearchClose: "Hide search",
  projectSearchPlaceholder: "Search title, body, synopsis, tags…",
  projectSearchHint: "Type at least 2 characters.",
  projectSearchEmpty: "No matches.",
  backlinksTitle: "Backlinks",
  backlinksEmpty: "No documents link here yet.",

  viewEditor: "Editor",
  viewCorkboard: "Corkboard",
  corkboardHint: "Drag cards between chapters to reorder scenes.",
  corkboardRefresh: "Refresh",
  corkboardEmpty: "Add chapters and scenes to use the corkboard.",
  corkboardNoSynopsis: "No synopsis yet.",
  corkboardWordCount: "{n} words",

  viewReadThrough: "Read-through",
  exportTitle: "Export manuscript",
  exportDescription: "Export the full manuscript in reading order (parts, chapters, scenes).",
  exportFormatHtml: "HTML",
  exportFormatHtmlDesc: "Styled web page — good for sharing or printing from a browser.",
  exportFormatPdf: "PDF",
  exportFormatPdfDesc: "Portable document with headings and plain-text body.",
  exportAction: "Export…",
  exportInProgress: "Exporting…",
  exportSuccess: "Exported {sections} sections, {words} words.",
  readThroughEmpty: "Nothing to read yet — add manuscript sections first.",
  readThroughBackToEditor: "Back to editor",
  readThroughPrev: "Previous",
  readThroughNext: "Next",
  readThroughProgress: "{current} / {total} · {percent}%",
  readThroughSectionEmpty: "This section has no body text yet.",

  themePickerAction: "Theme",
  themePickerTitle: "Editor theme",
  themePickerBuiltin: "Built-in themes",
  themeAppearanceDark: "dark",
  themeAppearanceLight: "light",
  onboardingHelp: "Tour",
  onboardingProgress: "Step {current} of {total}",
  onboardingSkip: "Skip tour",
  onboardingBack: "Back",
  onboardingNext: "Next",
  onboardingDone: "Done",
  onboardingWelcomeTitle: "Welcome to the writing editor",
  onboardingWelcomeBody:
    "This quick tour walks through the structured project: sidebar, views, metadata, search, wiki-links, writing modes, export, themes, and shortcuts.",
  onboardingSidebarTitle: "Project sidebar",
  onboardingSidebarBody:
    "Organize manuscript and planning documents in a tree. Add, rename, reorder, and filter by type, status, or tags.",
  onboardingViewsTitle: "Editor, corkboard, read-through",
  onboardingViewsBody:
    "Switch between editing, drag-and-drop scene cards, and continuous read-through of the full manuscript.",
  onboardingMetadataTitle: "Document metadata",
  onboardingMetadataBody:
    "Set synopsis, tags, and status for the active document — used on the corkboard, in search, and filters.",
  onboardingSearchTitle: "Project search",
  onboardingSearchBody: "Full-text search across titles, body, synopsis, and tags. Open a result to jump to that document.",
  onboardingExportTitle: "Export manuscript",
  onboardingExportBody: "Export the full manuscript to HTML or PDF in reading order whenever you need a snapshot.",
  onboardingThemeTitle: "Editor themes",
  onboardingThemeBody: "Pick one of seven built-in color themes. Your choice is remembered for the next session.",
  onboardingWikiLinksTitle: "Wiki-links",
  onboardingWikiLinksBody:
    "Type [[Document Title]] in the editor to cross-reference another file. Click to jump, hover to preview; backlinks appear in the sidebar.",
  onboardingWritingModesTitle: "Writing modes",
  onboardingWritingModesBody:
    "Toolbar toggles: typewriter, focus, distraction-free, manuscript column, outline, spell check, and soft wrap.",
  onboardingShortcutsTitle: "Keyboard shortcuts",
  onboardingShortcutsBody:
    "Press Ctrl+/ (Cmd+/ on Mac) anytime for the shortcut list. Use the Tour button in the project bar to replay this guide.",
  metadataSelectDocument: "Select a document in the tree to edit synopsis, tags, and status.",
  onboardingReplayFromShortcuts: "Replay tour",
  templatePickerTitle: "New structured project",
  templatePickerDescription: "Choose a starter layout. You can rename or delete any document afterward.",
  templatePickerCreate: "Create project",
  templateBlankLabel: "Blank",
  templateBlankDesc: "Empty project — start from scratch.",
  templateNovelLabel: "Novel",
  templateNovelDesc: "3 parts, 3 chapters each, 2 scenes per chapter.",
  templateShortStoryLabel: "Short story",
  templateShortStoryDesc: "5 scenes and two character sheets.",
  templateGameNarrativeLabel: "Game narrative",
  templateGameNarrativeDesc: "Quests, NPCs, lore, items — for videogame writers.",
  templateScreenplayLabel: "Screenplay",
  templateScreenplayDesc: "3 acts, 3 scenes per act, a lead character and a location.",
  themeNameDark: "Dark",
  themeNameLight: "Light",
  themeNameMidnightJazz: "Midnight Jazz",
  themeNameForestCanopy: "Forest Canopy",
  themeNameSunsetDrift: "Sunset Drift",
  themeNameArcticFog: "Arctic Fog",
  themeNameSepiaStudy: "Sepia Study",
};

const ru: Dict = {
  saving: "Сохранение…",
  autosaveFailedRetrying: "Не удалось сохранить — повторим при следующем автосохранении",
  unsavedChanges: "Есть несохранённые изменения",
  savedAt: "Сохранено в {time}",
  history: "История",
  versionHistory: "История версий",
  save: "Сохранить",

  undo: "Отменить",
  redo: "Повторить",
  cut: "Вырезать",
  copy: "Копировать",
  paste: "Вставить",
  selectAll: "Выделить всё",
  find: "Найти",
  findReplace: "Найти / Заменить",

  bold: "Жирный",
  italic: "Курсив",
  inlineCode: "Код в строке",
  heading1: "Заголовок 1",
  heading2: "Заголовок 2",
  heading3: "Заголовок 3",
  bulletedList: "Маркированный список",
  numberedList: "Нумерованный список",
  blockquote: "Цитата",
  codeBlock: "Блок кода",
  listBulletLabel: "• Список",
  listNumberLabel: "1. Список",
  quoteLabel: "Цитата",
  codeBlockLabel: "Код",

  insertLink: "Вставить или изменить внутреннюю ссылку",
  linkLabel: "Ссылка",
  linkPlaceholder: "Название узла…",
  linkNoMatches: "Нет совпадений. Enter — вставить введённый текст.",
  showingOf: "Показано {shown} из {total}",
  insertImage: "Вставить изображение",
  imageLabel: "Картинка",
  openLink: "Открыть →",
  originalSize: "Оригинал: {w} × {h}",
  autoSize: "Авто",

  outline: "Оглавление",
  outlineTooltip: "Навигация по заголовкам",
  typewriter: "Пишущая машинка",
  typewriterTooltip: "Режим пишущей машинки",
  focus: "Фокус",
  focusTooltip: "Режим фокуса",
  distractionFree: "Без отвлечений",
  distractionFreeTooltip: "Режим без отвлечений",
  wrap: "Перенос",
  wrapTooltip: "Мягкий перенос строк",
  manuscript: "Рукопись",
  manuscriptTooltip: "Режим рукописи — колонка по центру",
  spell: "Орфография",
  spellTooltip: "Проверка орфографии",
  closeDistractionFree: "Выйти из режима без отвлечений",

  headings: "Заголовки",
  noHeadings: "В документе нет заголовков H1–H3",

  lineCol: "Стр {line}, кол {col}",
  selection: "Выд: {words}сл {chars}зн",
  words: "{n} слов",
  chars: "{n} знаков",
  minRead: "{n} мин чтения",
  setGoal: "Цель",
  goal: "Цель",
  setGoalTitle: "Цель по числу слов",
  wordsPlaceholder: "Слов…",
  manuscriptWords: "Рукопись: {n} сл.",

  loading: "Загрузка…",
  pinned: "Закреплённые",
  autosaves: "Автосохранения",
  restore: "Восстановить",
  unpin: "Открепить",
  pin: "Закрепить",
  pinNamePlaceholder: "Название снимка",
  pinnedDefaultName: "Закреплено",
  noVersions: "Версий пока нет — они появятся после сохранения.",
  draftTitle: "Черновик",

  preview: "Просмотр",
  width: "Ширина",
  height: "Высота",

  shortcutsTitle: "Горячие клавиши",
  shortcutsGroupEditor: "Редактор",
  shortcutsGroupModes: "Режимы письма",
  shortcutSave: "Сохранить",
  shortcutUndo: "Отменить",
  shortcutRedo: "Повторить",
  shortcutBold: "Жирный",
  shortcutItalic: "Курсив",
  shortcutFind: "Найти в документе",
  shortcutShortcuts: "Горячие клавиши",
  shortcutDistractionFree: "Режим без отвлечений",
  shortcutTypewriter: "Режим пишущей машинки",
  shortcutFocus: "Режим фокуса",
  shortcutWrap: "Мягкий перенос",

  loadingImage: "Загрузка изображения…",

  noProjectConnected: "Проект не подключён — подключите папку или файл в Настройки > Проекты.",
  noDocuments: "В этом проекте пока нет глав.",
  chapterLabel: "Глава",
  projectModeLegacy: "Простой список файлов",
  projectModeStructured: "Структурированный проект",
  initStructuredProject: "Создать структурированный проект",
  migrateToStructuredProject: "Перевести в структурированный проект",
  structuredProjectReady: "Структурированный проект готов.",
  structuredActionFailed: "Не удалось обновить структуру проекта.",
  editorPlaceholder: "Начните писать… Используйте [[Заголовок]] для ссылки на другой документ.",
  sidebarManuscript: "Рукопись",
  sidebarPlanning: "Планирование",
  addDocument: "Добавить",
  addChild: "Добавить дочерний документ",
  renameDocument: "Переименовать",
  deleteDocument: "Удалить",
  deleteDocumentConfirm: "Удалить этот документ и все вложенные?",
  documentType: "Тип",
  documentTitle: "Название",
  cancel: "Отмена",
  moveUp: "Выше",
  moveDown: "Ниже",

  metadataPanelTitle: "Сведения о документе",
  metadataSynopsis: "Синопсис",
  metadataSynopsisPlaceholder: "Краткое описание для доски и поиска…",
  metadataTags: "Теги",
  metadataTagsPlaceholder: "теги, через, запятую",
  metadataStatus: "Статус",
  sidebarFilterPlaceholder: "Фильтр: type:scene status:draft tag:имя",
  sidebarFilterHint: "type:, status:, tag: или текст для поиска по названию.",
  statusDraft: "Черновик",
  statusInRevision: "На правке",
  statusRevised: "Правка завершена",
  statusFinal: "Финал",
  statusStuck: "Застряло",
  statusCut: "Вырезано",

  projectSearchOpen: "Поиск по проекту",
  projectSearchClose: "Скрыть поиск",
  projectSearchPlaceholder: "Искать в названии, тексте, синопсисе, тегах…",
  projectSearchHint: "Введите не меньше 2 символов.",
  projectSearchEmpty: "Ничего не найдено.",
  backlinksTitle: "Обратные ссылки",
  backlinksEmpty: "Пока никто не ссылается на этот документ.",

  viewEditor: "Редактор",
  viewCorkboard: "Доска",
  corkboardHint: "Перетаскивайте карточки между главами, чтобы менять порядок сцен.",
  corkboardRefresh: "Обновить",
  corkboardEmpty: "Добавьте главы и сцены для доски.",
  corkboardNoSynopsis: "Синопсис пока пуст.",
  corkboardWordCount: "{n} сл.",

  viewReadThrough: "Чтение",
  exportTitle: "Экспорт рукописи",
  exportDescription: "Экспорт всей рукописи в порядке чтения (части, главы, сцены).",
  exportFormatHtml: "HTML",
  exportFormatHtmlDesc: "Стилизованная веб-страница — для sharing или печати из браузера.",
  exportFormatPdf: "PDF",
  exportFormatPdfDesc: "PDF с заголовками и текстом без разметки.",
  exportAction: "Экспорт…",
  exportInProgress: "Экспорт…",
  exportSuccess: "Экспортировано {sections} разделов, {words} слов.",
  readThroughEmpty: "Пока нечего читать — добавьте разделы рукописи.",
  readThroughBackToEditor: "К редактору",
  readThroughPrev: "Назад",
  readThroughNext: "Далее",
  readThroughProgress: "{current} / {total} · {percent}%",
  readThroughSectionEmpty: "В этом разделе пока нет текста.",

  themePickerAction: "Тема",
  themePickerTitle: "Тема редактора",
  themePickerBuiltin: "Встроенные темы",
  themeAppearanceDark: "тёмная",
  themeAppearanceLight: "светлая",
  onboardingHelp: "Тур",
  onboardingProgress: "Шаг {current} из {total}",
  onboardingSkip: "Пропустить",
  onboardingBack: "Назад",
  onboardingNext: "Далее",
  onboardingDone: "Готово",
  onboardingWelcomeTitle: "Добро пожаловать в редактор",
  onboardingWelcomeBody:
    "Краткий тур по структурированному проекту: sidebar, режимы, метаданные, поиск, wiki-ссылки, режимы письма, экспорт, темы и shortcuts.",
  onboardingSidebarTitle: "Боковая панель проекта",
  onboardingSidebarBody:
    "Дерево рукописи и планирования. Добавление, переименование, порядок и фильтр по типу, статусу или тегам.",
  onboardingViewsTitle: "Редактор, доска, чтение",
  onboardingViewsBody:
    "Переключайтесь между редактированием, drag-and-drop карточками сцен и непрерывным чтением всей рукописи.",
  onboardingMetadataTitle: "Метаданные документа",
  onboardingMetadataBody:
    "Синопсис, теги и статус активного документа — для доски, поиска и фильтров.",
  onboardingSearchTitle: "Поиск по проекту",
  onboardingSearchBody: "Полнотекстовый поиск по названиям, тексту, синопсису и тегам. Откройте результат, чтобы перейти к документу.",
  onboardingExportTitle: "Экспорт рукописи",
  onboardingExportBody: "Экспорт всей рукописи в HTML или PDF в порядке чтения.",
  onboardingThemeTitle: "Темы редактора",
  onboardingThemeBody: "Семь встроенных цветовых тем. Выбор сохраняется между сессиями.",
  onboardingWikiLinksTitle: "Wiki-ссылки",
  onboardingWikiLinksBody:
    "Введите [[Название документа]] в редакторе для перекрёстной ссылки. Клик — переход, наведение — превью; обратные ссылки — в sidebar.",
  onboardingWritingModesTitle: "Режимы письма",
  onboardingWritingModesBody:
    "Панель инструментов: пишущая машинка, фокус, без отвлечений, колонка рукописи, оглавление, орфография, перенос строк.",
  onboardingShortcutsTitle: "Горячие клавиши",
  onboardingShortcutsBody:
    "Ctrl+/ (Cmd+/ на Mac) — список сочетаний. Кнопка «Тур» в панели проекта — повторить это руководство.",
  metadataSelectDocument: "Выберите документ в дереве, чтобы редактировать синопсис, теги и статус.",
  onboardingReplayFromShortcuts: "Повторить тур",
  templatePickerTitle: "Новый структурированный проект",
  templatePickerDescription: "Выберите стартовую структуру. Документы можно переименовать или удалить.",
  templatePickerCreate: "Создать проект",
  templateBlankLabel: "Пустой",
  templateBlankDesc: "Пустой проект — с нуля.",
  templateNovelLabel: "Роман",
  templateNovelDesc: "3 части, по 3 главы, по 2 сцены в каждой.",
  templateShortStoryLabel: "Рассказ",
  templateShortStoryDesc: "5 сцен и два листа персонажей.",
  templateGameNarrativeLabel: "Игровой нарратив",
  templateGameNarrativeDesc: "Квесты, NPC, лор, предметы — для сценаристов игр.",
  templateScreenplayLabel: "Сценарий",
  templateScreenplayDesc: "3 акта, по 3 сцены, главный герой и локация.",
  themeNameDark: "Тёмная",
  themeNameLight: "Светлая",
  themeNameMidnightJazz: "Полуночный джаз",
  themeNameForestCanopy: "Лесной полог",
  themeNameSunsetDrift: "Закатный дрейф",
  themeNameArcticFog: "Арктический туман",
  themeNameSepiaStudy: "Сепия",
};

const uk: Dict = {
  saving: "Збереження…",
  autosaveFailedRetrying: "Не вдалося зберегти — повторимо під час наступного автозбереження",
  unsavedChanges: "Є незбережені зміни",
  savedAt: "Збережено о {time}",
  history: "Історія",
  versionHistory: "Історія версій",
  save: "Зберегти",

  undo: "Скасувати",
  redo: "Повторити",
  cut: "Вирізати",
  copy: "Копіювати",
  paste: "Вставити",
  selectAll: "Виділити все",
  find: "Знайти",
  findReplace: "Знайти / Замінити",

  bold: "Жирний",
  italic: "Курсив",
  inlineCode: "Код у рядку",
  heading1: "Заголовок 1",
  heading2: "Заголовок 2",
  heading3: "Заголовок 3",
  bulletedList: "Маркований список",
  numberedList: "Нумерований список",
  blockquote: "Цитата",
  codeBlock: "Блок коду",
  listBulletLabel: "• Список",
  listNumberLabel: "1. Список",
  quoteLabel: "Цитата",
  codeBlockLabel: "Код",

  insertLink: "Вставити або змінити внутрішнє посилання",
  linkLabel: "Посилання",
  linkPlaceholder: "Назва вузла…",
  linkNoMatches: "Немає збігів. Enter — вставити введений текст.",
  showingOf: "Показано {shown} з {total}",
  insertImage: "Вставити зображення",
  imageLabel: "Зображення",
  openLink: "Відкрити →",
  originalSize: "Оригінал: {w} × {h}",
  autoSize: "Авто",

  outline: "Зміст",
  outlineTooltip: "Навігація за заголовками",
  typewriter: "Друкарська машинка",
  typewriterTooltip: "Режим друкарської машинки",
  focus: "Фокус",
  focusTooltip: "Режим фокусу",
  distractionFree: "Без відволікань",
  distractionFreeTooltip: "Режим без відволікань",
  wrap: "Перенесення",
  wrapTooltip: "М’яке перенесення рядків",
  manuscript: "Рукопис",
  manuscriptTooltip: "Режим рукопису — колонка по центру",
  spell: "Орфографія",
  spellTooltip: "Перевірка орфографії",
  closeDistractionFree: "Вийти з режиму без відволікань",

  headings: "Заголовки",
  noHeadings: "У документі немає заголовків H1–H3",

  lineCol: "Ряд {line}, кол {col}",
  selection: "Вид: {words}сл {chars}зн",
  words: "{n} слів",
  chars: "{n} знаків",
  minRead: "{n} хв читання",
  setGoal: "Мета",
  goal: "Мета",
  setGoalTitle: "Мета за кількістю слів",
  wordsPlaceholder: "Слів…",
  manuscriptWords: "Рукопис: {n} сл.",

  loading: "Завантаження…",
  pinned: "Закріплені",
  autosaves: "Автозбереження",
  restore: "Відновити",
  unpin: "Відкріпити",
  pin: "Закріпити",
  pinNamePlaceholder: "Назва знімка",
  pinnedDefaultName: "Закріплено",
  noVersions: "Версій ще немає — вони з’являться після збереження.",
  draftTitle: "Чернетка",

  preview: "Перегляд",
  width: "Ширина",
  height: "Висота",

  shortcutsTitle: "Гарячі клавіші",
  shortcutsGroupEditor: "Редактор",
  shortcutsGroupModes: "Режими письма",
  shortcutSave: "Зберегти",
  shortcutUndo: "Скасувати",
  shortcutRedo: "Повторити",
  shortcutBold: "Жирний",
  shortcutItalic: "Курсив",
  shortcutFind: "Знайти в документі",
  shortcutShortcuts: "Гарячі клавіші",
  shortcutDistractionFree: "Режим без відволікань",
  shortcutTypewriter: "Режим друкарської машинки",
  shortcutFocus: "Режим фокусу",
  shortcutWrap: "М’яке перенесення",

  loadingImage: "Завантаження зображення…",

  noProjectConnected: "Проєкт не підключено — підключіть теку або файл у Налаштування > Проєкти.",
  noDocuments: "У цьому проєкті поки немає розділів.",
  chapterLabel: "Розділ",
  projectModeLegacy: "Простий список файлів",
  projectModeStructured: "Структурований проєкт",
  initStructuredProject: "Створити структурований проєкт",
  migrateToStructuredProject: "Перевести в структурований проєкт",
  structuredProjectReady: "Структурований проєкт готовий.",
  structuredActionFailed: "Не вдалося оновити структуру проєкту.",
  editorPlaceholder: "Почніть писати… Використовуйте [[Заголовок]] для посилання на інший документ.",
  sidebarManuscript: "Рукопис",
  sidebarPlanning: "Планування",
  addDocument: "Додати",
  addChild: "Додати дочірній документ",
  renameDocument: "Перейменувати",
  deleteDocument: "Видалити",
  deleteDocumentConfirm: "Видалити цей документ і всі вкладені?",
  documentType: "Тип",
  documentTitle: "Назва",
  cancel: "Скасувати",
  moveUp: "Вище",
  moveDown: "Нижче",

  metadataPanelTitle: "Відомості про документ",
  metadataSynopsis: "Синопсис",
  metadataSynopsisPlaceholder: "Короткий опис для дошки та пошуку…",
  metadataTags: "Теги",
  metadataTagsPlaceholder: "теги, через, кому",
  metadataStatus: "Статус",
  sidebarFilterPlaceholder: "Фільтр: type:scene status:draft tag:назва",
  sidebarFilterHint: "type:, status:, tag: або текст для пошуку за назвою.",
  statusDraft: "Чернетка",
  statusInRevision: "На правці",
  statusRevised: "Правку завершено",
  statusFinal: "Фінал",
  statusStuck: "Застрягло",
  statusCut: "Вирізано",

  projectSearchOpen: "Пошук по проєкту",
  projectSearchClose: "Сховати пошук",
  projectSearchPlaceholder: "Шукати в назві, тексті, синопсисі, тегах…",
  projectSearchHint: "Введіть щонайменше 2 символи.",
  projectSearchEmpty: "Нічого не знайдено.",
  backlinksTitle: "Зворотні посилання",
  backlinksEmpty: "Поки ніхто не посилається на цей документ.",

  viewEditor: "Редактор",
  viewCorkboard: "Дошка",
  corkboardHint: "Перетягуйте картки між розділами, щоб змінювати порядок сцен.",
  corkboardRefresh: "Оновити",
  corkboardEmpty: "Додайте розділи та сцени для дошки.",
  corkboardNoSynopsis: "Синопсис поки порожній.",
  corkboardWordCount: "{n} сл.",

  viewReadThrough: "Читання",
  exportTitle: "Експорт рукопису",
  exportDescription: "Експорт усієї рукопису в порядку читання (частини, розділи, сцени).",
  exportFormatHtml: "HTML",
  exportFormatHtmlDesc: "Стилізована веб-сторінка — для поширення або друку з браузера.",
  exportFormatPdf: "PDF",
  exportFormatPdfDesc: "PDF із заголовками та простим текстом.",
  exportAction: "Експорт…",
  exportInProgress: "Експорт…",
  exportSuccess: "Експортовано {sections} розділів, {words} слів.",
  readThroughEmpty: "Поки нічого читати — додайте розділи рукопису.",
  readThroughBackToEditor: "До редактора",
  readThroughPrev: "Назад",
  readThroughNext: "Далі",
  readThroughProgress: "{current} / {total} · {percent}%",
  readThroughSectionEmpty: "У цьому розділі поки немає тексту.",

  themePickerAction: "Тема",
  themePickerTitle: "Тема редактора",
  themePickerBuiltin: "Вбудовані теми",
  themeAppearanceDark: "темна",
  themeAppearanceLight: "світла",
  onboardingHelp: "Тур",
  onboardingProgress: "Крок {current} з {total}",
  onboardingSkip: "Пропустити",
  onboardingBack: "Назад",
  onboardingNext: "Далі",
  onboardingDone: "Готово",
  onboardingWelcomeTitle: "Ласкаво просимо до редактора",
  onboardingWelcomeBody:
    "Короткий тур структурованим проєктом: sidebar, режими, метадані, пошук, wiki-посилання, режими письма, експорт, теми та shortcuts.",
  onboardingSidebarTitle: "Бічна панель проєкту",
  onboardingSidebarBody:
    "Дерево рукопису та планування. Додавання, перейменування, порядок і фільтр за типом, статусом або тегами.",
  onboardingViewsTitle: "Редактор, дошка, читання",
  onboardingViewsBody:
    "Перемикайтеся між редагуванням, drag-and-drop картками сцен і безперервним читанням усієї рукопису.",
  onboardingMetadataTitle: "Метадані документа",
  onboardingMetadataBody:
    "Синопсис, теги та статус активного документа — для дошки, пошуку та фільтрів.",
  onboardingSearchTitle: "Пошук по проєкту",
  onboardingSearchBody: "Повнотекстовий пошук за назвами, текстом, синопсисом і тегами. Відкрийте результат, щоб перейти до документа.",
  onboardingExportTitle: "Експорт рукопису",
  onboardingExportBody: "Експорт усієї рукопису в HTML або PDF у порядку читання.",
  onboardingThemeTitle: "Теми редактора",
  onboardingThemeBody: "Сім вбудованих кольорових тем. Вибір зберігається між сесіями.",
  onboardingWikiLinksTitle: "Wiki-посилання",
  onboardingWikiLinksBody:
    "Введіть [[Назва документа]] в редакторі для перехресного посилання. Клік — перехід, наведення — превʼю; зворотні посилання — у sidebar.",
  onboardingWritingModesTitle: "Режими письма",
  onboardingWritingModesBody:
    "Панель інструментів: машинка, фокус, без відволікань, колонка рукопису, зміст, орфографія, перенос рядків.",
  onboardingShortcutsTitle: "Гарячі клавіші",
  onboardingShortcutsBody:
    "Ctrl+/ (Cmd+/ на Mac) — список поєднань. Кнопка «Тур» на панелі проєкту — повторити цей гід.",
  metadataSelectDocument: "Оберіть документ у дереві, щоб редагувати синопсис, теги та статус.",
  onboardingReplayFromShortcuts: "Повторити тур",
  templatePickerTitle: "Новий структурований проєкт",
  templatePickerDescription: "Оберіть стартову структуру. Документи можна перейменувати або видалити.",
  templatePickerCreate: "Створити проєкт",
  templateBlankLabel: "Порожній",
  templateBlankDesc: "Порожній проєкт — з нуля.",
  templateNovelLabel: "Роман",
  templateNovelDesc: "3 частини, по 3 розділи, по 2 сцени в кожному.",
  templateShortStoryLabel: "Оповідання",
  templateShortStoryDesc: "5 сцен і два листи персонажів.",
  templateGameNarrativeLabel: "Ігровий наратив",
  templateGameNarrativeDesc: "Квести, NPC, лор, предмети — для сценаристів ігор.",
  templateScreenplayLabel: "Сценарій",
  templateScreenplayDesc: "3 акти, по 3 сцени, головний герой і локація.",
  themeNameDark: "Темна",
  themeNameLight: "Світла",
  themeNameMidnightJazz: "Опівнічний джаз",
  themeNameForestCanopy: "Лісовий намет",
  themeNameSunsetDrift: "Дрейф заходу сонця",
  themeNameArcticFog: "Арктичний туман",
  themeNameSepiaStudy: "Сепія",
};

const cs: Dict = {
  saving: "Ukládání…",
  autosaveFailedRetrying: "Uložení se nezdařilo — zkusíme to při dalším automatickém uložení",
  unsavedChanges: "Neuložené změny",
  savedAt: "Uloženo v {time}",
  history: "Historie",
  versionHistory: "Historie verzí",
  save: "Uložit",

  undo: "Zpět",
  redo: "Znovu",
  cut: "Vyjmout",
  copy: "Kopírovat",
  paste: "Vložit",
  selectAll: "Vybrat vše",
  find: "Najít",
  findReplace: "Najít / Nahradit",

  bold: "Tučné",
  italic: "Kurzíva",
  inlineCode: "Kód v řádku",
  heading1: "Nadpis 1",
  heading2: "Nadpis 2",
  heading3: "Nadpis 3",
  bulletedList: "Odrážkový seznam",
  numberedList: "Číslovaný seznam",
  blockquote: "Citace",
  codeBlock: "Blok kódu",
  listBulletLabel: "• Seznam",
  listNumberLabel: "1. Seznam",
  quoteLabel: "Citace",
  codeBlockLabel: "Kód",

  insertLink: "Vložit nebo upravit interní odkaz",
  linkLabel: "Odkaz",
  linkPlaceholder: "Název uzlu…",
  linkNoMatches: "Žádné shody. Enter vloží zadaný text.",
  showingOf: "Zobrazeno {shown} z {total}",
  insertImage: "Vložit obrázek",
  imageLabel: "Obrázek",
  openLink: "Otevřít →",
  originalSize: "Originál: {w} × {h}",
  autoSize: "Auto",

  outline: "Osnova",
  outlineTooltip: "Navigace podle nadpisů",
  typewriter: "Psací stroj",
  typewriterTooltip: "Režim psacího stroje",
  focus: "Fokus",
  focusTooltip: "Režim fokusu",
  distractionFree: "Bez rozptylování",
  distractionFreeTooltip: "Režim bez rozptylování",
  wrap: "Zalamovat",
  wrapTooltip: "Měkké zalamování řádků",
  manuscript: "Rukopis",
  manuscriptTooltip: "Režim rukopisu — sloupec na střed",
  spell: "Pravopis",
  spellTooltip: "Kontrola pravopisu",
  closeDistractionFree: "Ukončit režim bez rozptylování",

  headings: "Nadpisy",
  noHeadings: "V dokumentu nejsou nadpisy H1–H3",

  lineCol: "Řád {line}, sl {col}",
  selection: "Výb: {words}sl {chars}zn",
  words: "{n} slov",
  chars: "{n} znaků",
  minRead: "{n} min čtení",
  setGoal: "Cíl",
  goal: "Cíl",
  setGoalTitle: "Cíl počtu slov",
  wordsPlaceholder: "Slov…",
  manuscriptWords: "Rukopis: {n} sl.",

  loading: "Načítání…",
  pinned: "Připnuté",
  autosaves: "Automatické uložení",
  restore: "Obnovit",
  unpin: "Odepnout",
  pin: "Připnout",
  pinNamePlaceholder: "Název snímku",
  pinnedDefaultName: "Připnuto",
  noVersions: "Zatím žádné verze — objeví se po uložení.",
  draftTitle: "Koncept",

  preview: "Náhled",
  width: "Šířka",
  height: "Výška",

  shortcutsTitle: "Klávesové zkratky",
  shortcutsGroupEditor: "Editor",
  shortcutsGroupModes: "Režimy psaní",
  shortcutSave: "Uložit",
  shortcutUndo: "Zpět",
  shortcutRedo: "Znovu",
  shortcutBold: "Tučné",
  shortcutItalic: "Kurzíva",
  shortcutFind: "Najít v dokumentu",
  shortcutShortcuts: "Klávesové zkratky",
  shortcutDistractionFree: "Režim bez rozptylování",
  shortcutTypewriter: "Režim psacího stroje",
  shortcutFocus: "Režim fokusu",
  shortcutWrap: "Měkké zalamování",

  loadingImage: "Načítání obrázku…",

  noProjectConnected: "Žádný připojený projekt — připojte složku nebo soubor v Nastavení > Projekty.",
  noDocuments: "Tento projekt zatím nemá žádné kapitoly.",
  chapterLabel: "Kapitola",
  projectModeLegacy: "Jednoduchý seznam souborů",
  projectModeStructured: "Strukturovaný projekt",
  initStructuredProject: "Vytvořit strukturovaný projekt",
  migrateToStructuredProject: "Převést na strukturovaný projekt",
  structuredProjectReady: "Strukturovaný projekt je připraven.",
  structuredActionFailed: "Nepodařilo se aktualizovat strukturu projektu.",
  editorPlaceholder: "Začněte psát… Použijte [[Název]] pro odkaz na jiný dokument.",
  sidebarManuscript: "Rukopis",
  sidebarPlanning: "Plánování",
  addDocument: "Přidat",
  addChild: "Přidat podřízený dokument",
  renameDocument: "Přejmenovat",
  deleteDocument: "Smazat",
  deleteDocumentConfirm: "Smazat tento dokument a všechny podřízené?",
  documentType: "Typ",
  documentTitle: "Název",
  cancel: "Zrušit",
  moveUp: "Výše",
  moveDown: "Níže",

  metadataPanelTitle: "Informace o dokumentu",
  metadataSynopsis: "Synopse",
  metadataSynopsisPlaceholder: "Krátké shrnutí pro nástěnku a vyhledávání…",
  metadataTags: "Štítky",
  metadataTagsPlaceholder: "štítky, oddělené, čárkou",
  metadataStatus: "Stav",
  sidebarFilterPlaceholder: "Filtr: type:scene status:draft tag:název",
  sidebarFilterHint: "type:, status:, tag: nebo text pro hledání v názvu.",
  statusDraft: "Koncept",
  statusInRevision: "V revizi",
  statusRevised: "Revidováno",
  statusFinal: "Finální",
  statusStuck: "Zaseknuto",
  statusCut: "Vyřazeno",

  projectSearchOpen: "Hledat v projektu",
  projectSearchClose: "Skrýt hledání",
  projectSearchPlaceholder: "Hledat v názvu, textu, synopsi, štítcích…",
  projectSearchHint: "Zadejte alespoň 2 znaky.",
  projectSearchEmpty: "Nic nenalezeno.",
  backlinksTitle: "Zpětné odkazy",
  backlinksEmpty: "Zatím sem nic neodkazuje.",

  viewEditor: "Editor",
  viewCorkboard: "Nástěnka",
  corkboardHint: "Přetahujte karty mezi kapitolami a měňte pořadí scén.",
  corkboardRefresh: "Obnovit",
  corkboardEmpty: "Přidejte kapitoly a scény pro nástěnku.",
  corkboardNoSynopsis: "Synopse zatím chybí.",
  corkboardWordCount: "{n} slov",

  viewReadThrough: "Čtení",
  exportTitle: "Export rukopisu",
  exportDescription: "Export celého rukopisu v pořadí čtení (části, kapitoly, scény).",
  exportFormatHtml: "HTML",
  exportFormatHtmlDesc: "Stylizovaná webová stránka — vhodná ke sdílení nebo tisku z prohlížeče.",
  exportFormatPdf: "PDF",
  exportFormatPdfDesc: "PDF s nadpisy a prostým textem.",
  exportAction: "Export…",
  exportInProgress: "Exportuji…",
  exportSuccess: "Exportováno {sections} sekcí, {words} slov.",
  readThroughEmpty: "Zatím není co číst — přidejte sekce rukopisu.",
  readThroughBackToEditor: "Zpět do editoru",
  readThroughPrev: "Předchozí",
  readThroughNext: "Další",
  readThroughProgress: "{current} / {total} · {percent} %",
  readThroughSectionEmpty: "Tato sekce zatím nemá text.",

  themePickerAction: "Motiv",
  themePickerTitle: "Motiv editoru",
  themePickerBuiltin: "Vestavěné motivy",
  themeAppearanceDark: "tmavý",
  themeAppearanceLight: "světlý",
  onboardingHelp: "Prohlídka",
  onboardingProgress: "Krok {current} z {total}",
  onboardingSkip: "Přeskočit",
  onboardingBack: "Zpět",
  onboardingNext: "Další",
  onboardingDone: "Hotovo",
  onboardingWelcomeTitle: "Vítejte v editoru",
  onboardingWelcomeBody:
    "Krátká prohlídka strukturovaného projektu: postranní panel, režimy, metadata, hledání, wiki-odkazy, režimy psaní, export, motivy a zkratky.",
  onboardingSidebarTitle: "Postranní panel projektu",
  onboardingSidebarBody:
    "Strom rukopisu a plánování. Přidávání, přejmenování, pořadí a filtr podle typu, stavu nebo tagů.",
  onboardingViewsTitle: "Editor, nástěnka, čtení",
  onboardingViewsBody:
    "Přepínejte mezi editací, drag-and-drop kartami scén a souvislým čtením celého rukopisu.",
  onboardingMetadataTitle: "Metadata dokumentu",
  onboardingMetadataBody:
    "Synopse, tagy a stav aktivního dokumentu — pro nástěnku, hledání a filtry.",
  onboardingSearchTitle: "Hledání v projektu",
  onboardingSearchBody: "Fulltextové hledání v názvech, textu, synopsi a tazích. Otevřete výsledek pro přechod k dokumentu.",
  onboardingExportTitle: "Export rukopisu",
  onboardingExportBody: "Export celého rukopisu do HTML nebo PDF v pořadí čtení.",
  onboardingThemeTitle: "Motivy editoru",
  onboardingThemeBody: "Sedm vestavěných barevných motivů. Volba se zapamatuje pro další relaci.",
  onboardingWikiLinksTitle: "Wiki-odkazy",
  onboardingWikiLinksBody:
    "Do editoru napište [[Název dokumentu]] pro odkaz na jiný soubor. Klik — přechod, najetí — náhled; zpětné odkazy — v postranním panelu.",
  onboardingWritingModesTitle: "Režimy psaní",
  onboardingWritingModesBody:
    "Panel nástrojů: psací stroj, fokus, bez rušení, sloupec rukopisu, osnova, pravopis, zalamování řádků.",
  onboardingShortcutsTitle: "Klávesové zkratky",
  onboardingShortcutsBody:
    "Ctrl+/ (Cmd+/ na Mac) — seznam zkratek. Tlačítko Prohlídka na panelu projektu — znovu spustit průvodce.",
  metadataSelectDocument: "Vyberte dokument ve stromu pro úpravu synopse, tagů a stavu.",
  onboardingReplayFromShortcuts: "Znovu spustit prohlídku",
  templatePickerTitle: "Nový strukturovaný projekt",
  templatePickerDescription: "Vyberte počáteční strukturu. Dokumenty lze přejmenovat nebo smazat.",
  templatePickerCreate: "Vytvořit projekt",
  templateBlankLabel: "Prázdný",
  templateBlankDesc: "Prázdný projekt — od nuly.",
  templateNovelLabel: "Román",
  templateNovelDesc: "3 díly, po 3 kapitolách, po 2 scénách v každé.",
  templateShortStoryLabel: "Povídka",
  templateShortStoryDesc: "5 scén a dva listy postav.",
  templateGameNarrativeLabel: "Herní narativ",
  templateGameNarrativeDesc: "Questy, NPC, lore, předměty — pro scenáristy her.",
  templateScreenplayLabel: "Scénář",
  templateScreenplayDesc: "3 dějství, po 3 scénách, hlavní postava a lokace.",
  themeNameDark: "Tmavé",
  themeNameLight: "Světlé",
  themeNameMidnightJazz: "Půlnoční jazz",
  themeNameForestCanopy: "Lesní klenba",
  themeNameSunsetDrift: "Západ slunce",
  themeNameArcticFog: "Arktická mlha",
  themeNameSepiaStudy: "Sépie",
};

const dictionaries: Record<Locale, Dict> = { en, ru, uk, cs };

export type WeMessageKey = keyof Dict;

export function weT(
  locale: Locale,
  key: WeMessageKey,
  vars?: Record<string, string | number>,
): string {
  let text = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
