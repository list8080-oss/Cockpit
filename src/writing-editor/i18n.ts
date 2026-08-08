import type { Locale } from "../i18n";

type Dict = {
  // Header / save
  saving: string;
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
};

const en: Dict = {
  saving: "Saving…",
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
};

const ru: Dict = {
  saving: "Сохранение…",
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
};

const uk: Dict = {
  saving: "Збереження…",
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
};

const cs: Dict = {
  saving: "Ukládání…",
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
