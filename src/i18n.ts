export type Locale = "en" | "ru" | "uk" | "cs";

export const LOCALES: { id: Locale; nativeLabel: string }[] = [
  { id: "en", nativeLabel: "English" },
  { id: "ru", nativeLabel: "Русский" },
  { id: "uk", nativeLabel: "Українська" },
  { id: "cs", nativeLabel: "Čeština" },
];

export const LOCALE_STORAGE_KEY = "yar-cockpit.locale";

type Dict = {
  chapters: string;
  notes: string;
  notesHint: string;
  appleNotes: string;
  appleNotesHint: string;
  appleNotesConnect: string;
  appleNotesConnecting: string;
  appleNotesFolders: string;
  appleNotesNotes: string;
  appleNotesEmpty: string;
  appleNotesBack: string;
  appleNotesRefresh: string;
  appleNotesAccessDenied: string;
  appleNotesOnlyMac: string;
  loadAppleNoteFailed: string;
  editor: string;
  editorPlaceholder: string;
  editorHint: string;
  backToAgents: string;
  limitFiveHour: string;
  limitWeekly: string;
  limitUsed: string;
  limitUnavailable: string;
  limitRefresh: string;
  settings: string;
  settingsNav: string;
  settingsGeneral: string;
  settingsManuscript: string;
  settingsManuscriptHint: string;
  manuscriptPath: string;
  manuscriptNotSet: string;
  settingsDictionaries: string;
  settingsDictionariesHint: string;
  dictionaryInstalled: string;
  dictionaryNotInstalled: string;
  dictionaryDownload: string;
  dictionaryRemove: string;
  chooseFolder: string;
  settingsUpdates: string;
  settingsUpdatesHint: string;
  currentVersion: string;
  versionHistory: string;
  settingsAgents: string;
  settingsAgentsHint: string;
  language: string;
  languageHint: string;
  appearance: string;
  appearanceHint: string;
  themeNormal: string;
  themeNight: string;
  themeBook: string;
  backToWorkspace: string;
  githubTitle: string;
  githubSignedInAs: string;
  githubSignIn: string;
  githubSignOut: string;
  accountMenu: string;
  openSettings: string;
  authSignedIn: string;
  authSignedOut: string;
  authMissingCli: string;
  authSignIn: string;
  authSignOut: string;
  authRefresh: string;
  authChecking: string;
  authLoginStarted: string;
  authLogoutStarted: string;
  authReady: string;
  authNotReady: string;
  checkUpdate: string;
  updateUpToDate: string;
  updateChecking: string;
  updateDownloading: string;
  updateRestarting: string;
  writing: string;
  error: string;
  copy: string;
  copyTitle: string;
  waiting: string;
  promptPlaceholder: string;
  send: string;
  clearPrompt: string;
  waitingAgents: string;
  loadChapterFailed: string;
};

const en: Dict = {
  chapters: "Chapters",
  notes: "Notes",
  notesHint: "Chapters from your manuscript folder.",
  appleNotes: "Apple Notes",
  appleNotesHint:
    "macOS will ask to let Cockpit control the Notes app. Then pick a folder and a note — its text goes into the agents prompt.",
  appleNotesConnect: "Open Apple Notes",
  appleNotesConnecting: "Opening Notes…",
  appleNotesFolders: "Folders",
  appleNotesNotes: "Notes",
  appleNotesEmpty: "No notes in this folder.",
  appleNotesBack: "← Folders",
  appleNotesRefresh: "Refresh",
  appleNotesAccessDenied:
    "Access denied. Allow Cockpit → Notes in System Settings → Privacy & Security → Automation.",
  appleNotesOnlyMac: "Apple Notes works only on Mac.",
  loadAppleNoteFailed: "[failed to load note: {error}]",
  editor: "Editor",
  editorPlaceholder: "Write in the Loomdraft editor — draft autosaves locally.",
  editorHint: "Loomdraft writing editor: markdown, outline, history, images. Draft saves locally.",
  backToAgents: "Agents",
  limitFiveHour: "5h",
  limitWeekly: "week",
  limitUsed: "{label} {percent}% used",
  limitUnavailable: "limits n/a",
  limitRefresh: "Refresh Codex limits",
  settings: "Settings",
  settingsNav: "Settings sections",
  settingsGeneral: "General",
  settingsManuscript: "Manuscript",
  settingsManuscriptHint: "Choose the folder your chapters live in.",
  manuscriptPath: "Folder",
  manuscriptNotSet: "Not set",
  chooseFolder: "Choose folder…",
  settingsDictionaries: "Dictionaries",
  settingsDictionariesHint:
    "Spell-check dictionaries are downloaded on demand, not bundled — pick the ones you need.",
  dictionaryInstalled: "Installed",
  dictionaryNotInstalled: "Not installed",
  dictionaryDownload: "Download",
  dictionaryRemove: "Remove",
  settingsUpdates: "Updates",
  settingsUpdatesHint: "Installed version and what changed in each release.",
  currentVersion: "Current version",
  versionHistory: "Version history",
  settingsAgents: "Agents",
  settingsAgentsHint:
    "Sign in with your own Claude, Codex, and Cursor accounts. Green on a column means that agent is ready.",
  language: "Language",
  languageHint: "Interface language for the app.",
  appearance: "Appearance",
  appearanceHint: "Normal, night, or a book-like reading look.",
  themeNormal: "Normal",
  themeNight: "Night",
  themeBook: "Book",
  backToWorkspace: "Back",
  githubTitle: "GitHub",
  githubSignedInAs: "GitHub",
  githubSignIn: "Sign in to GitHub",
  githubSignOut: "Sign out of GitHub",
  accountMenu: "GitHub account",
  openSettings: "Settings",
  authSignedIn: "Signed in",
  authSignedOut: "Not signed in",
  authMissingCli: "CLI not installed",
  authSignIn: "Sign in",
  authSignOut: "Sign out",
  authRefresh: "Refresh",
  authChecking: "Checking…",
  authLoginStarted: "Login started — finish it in the browser or Terminal.",
  authLogoutStarted: "Logout started — finish it in the browser or Terminal.",
  authReady: "Ready",
  authNotReady: "Not signed in",
  checkUpdate: "Check for updates",
  updateUpToDate: "up to date",
  updateChecking: "checking…",
  updateDownloading: "downloading {version}…",
  updateRestarting: "restarting…",
  writing: "writing…",
  error: "error",
  copy: "copy",
  copyTitle: "Copy",
  waiting: "Waiting for a reply…",
  promptPlaceholder:
    "Paste a fragment or pick a chapter on the left. You can write as usual with the agent — for example “prose/style: liven up this dialogue” plus the text.",
  send: "Send to Claude + Codex + Cursor",
  clearPrompt: "Clear text",
  waitingAgents: "Waiting for agents…",
  loadChapterFailed: "[failed to load chapter: {error}]",
};

const ru: Dict = {
  chapters: "Главы",
  notes: "Заметки",
  notesHint: "Главы из папки рукописи.",
  appleNotes: "Заметки Apple",
  appleNotesHint:
    "macOS спросит разрешение управлять приложением «Заметки». Выбери папку и заметку — текст попадёт в поле для агентов.",
  appleNotesConnect: "Открыть Заметки Apple",
  appleNotesConnecting: "Открываем Заметки…",
  appleNotesFolders: "Папки",
  appleNotesNotes: "Заметки",
  appleNotesEmpty: "В этой папке нет заметок.",
  appleNotesBack: "← Папки",
  appleNotesRefresh: "Обновить",
  appleNotesAccessDenied:
    "Нет доступа. Разреши Кабине → Заметки в Системные настройки → Конфиденциальность → Автоматизация.",
  appleNotesOnlyMac: "Заметки Apple работают только на Mac.",
  loadAppleNoteFailed: "[не удалось загрузить заметку: {error}]",
  editor: "Редактор",
  editorPlaceholder: "Пишите в редакторе Loomdraft — черновик автосохраняется локально.",
  editorHint:
    "Редактор Loomdraft: markdown, оглавление, история, картинки. Черновик сохраняется локально.",
  backToAgents: "Агенты",
  limitFiveHour: "5ч",
  limitWeekly: "нед.",
  limitUsed: "{label} {percent}%",
  limitUnavailable: "лимиты н/д",
  limitRefresh: "Обновить лимиты Codex",
  settings: "Настройки",
  settingsNav: "Разделы настроек",
  settingsGeneral: "Общие",
  settingsManuscript: "Рукопись",
  settingsManuscriptHint: "Выбери папку, где лежат главы.",
  manuscriptPath: "Папка",
  manuscriptNotSet: "Не задана",
  chooseFolder: "Выбрать папку…",
  settingsDictionaries: "Словари",
  settingsDictionariesHint:
    "Словари орфографии скачиваются по запросу, а не встроены заранее — выбери нужные.",
  dictionaryInstalled: "Установлен",
  dictionaryNotInstalled: "Не установлен",
  dictionaryDownload: "Скачать",
  dictionaryRemove: "Удалить",
  settingsUpdates: "Обновления",
  settingsUpdatesHint: "Установленная версия и что изменилось в каждом релизе.",
  currentVersion: "Текущая версия",
  versionHistory: "История версий",
  settingsAgents: "Агенты",
  settingsAgentsHint:
    "Вход через ваши аккаунты Claude, Codex и Cursor. Зелёная лампочка над колонкой значит, что агент готов.",
  language: "Язык",
  languageHint: "Язык интерфейса приложения.",
  appearance: "Оформление",
  appearanceHint: "Обычный, ночной или книжный режим.",
  themeNormal: "Обычный",
  themeNight: "Ночной",
  themeBook: "Книжный",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignedInAs: "GitHub",
  githubSignIn: "Войти в GitHub",
  githubSignOut: "Выйти из GitHub",
  accountMenu: "Аккаунт GitHub",
  openSettings: "Настройки",
  authSignedIn: "Вход выполнен",
  authSignedOut: "Нет входа",
  authMissingCli: "CLI не установлен",
  authSignIn: "Войти",
  authSignOut: "Выйти",
  authRefresh: "Обновить",
  authChecking: "Проверяем…",
  authLoginStarted: "Вход запущен — завершите его в браузере или Terminal.",
  authLogoutStarted: "Выход запущен — завершите его в браузере или Terminal.",
  authReady: "Готов",
  authNotReady: "Нет входа",
  checkUpdate: "Проверить обновление",
  updateUpToDate: "актуальная версия",
  updateChecking: "проверяем…",
  updateDownloading: "скачиваем {version}…",
  updateRestarting: "перезапуск…",
  writing: "пишет…",
  error: "ошибка",
  copy: "копировать",
  copyTitle: "Скопировать",
  waiting: "Ждём ответ…",
  promptPlaceholder:
    "Вставь фрагмент или выбери главу слева. Можно писать как обычно с агентом — например «проза/стиль: оживи этот диалог» плюс текст.",
  send: "Отправить Claude + Codex + Cursor",
  clearPrompt: "Очистить текст",
  waitingAgents: "Ждём агентов…",
  loadChapterFailed: "[не удалось загрузить главу: {error}]",
};

const uk: Dict = {
  chapters: "Розділи",
  notes: "Нотатки",
  notesHint: "Розділи з теки рукопису.",
  appleNotes: "Нотатки Apple",
  appleNotesHint:
    "macOS запитає дозвіл керувати програмою «Нотатки». Обери теку й нотатку — текст потрапить у поле для агентів.",
  appleNotesConnect: "Відкрити Нотатки Apple",
  appleNotesConnecting: "Відкриваємо Нотатки…",
  appleNotesFolders: "Теки",
  appleNotesNotes: "Нотатки",
  appleNotesEmpty: "У цій теці немає нотаток.",
  appleNotesBack: "← Теки",
  appleNotesRefresh: "Оновити",
  appleNotesAccessDenied:
    "Немає доступу. Дозволь Кабіні → Нотатки в Системні параметри → Конфіденційність → Автоматизація.",
  appleNotesOnlyMac: "Нотатки Apple працюють лише на Mac.",
  loadAppleNoteFailed: "[не вдалося завантажити нотатку: {error}]",
  editor: "Редактор",
  editorPlaceholder: "Пишіть у редакторі Loomdraft — чернетка автозберігається локально.",
  editorHint:
    "Редактор Loomdraft: markdown, зміст, історія, зображення. Чернетка зберігається локально.",
  backToAgents: "Агенти",
  limitFiveHour: "5 год",
  limitWeekly: "тижд.",
  limitUsed: "{label} {percent}%",
  limitUnavailable: "ліміти н/д",
  limitRefresh: "Оновити ліміти Codex",
  settings: "Налаштування",
  settingsNav: "Розділи налаштувань",
  settingsGeneral: "Загальні",
  settingsManuscript: "Рукопис",
  settingsManuscriptHint: "Обери теку, де лежать розділи.",
  manuscriptPath: "Тека",
  manuscriptNotSet: "Не задано",
  chooseFolder: "Обрати теку…",
  settingsDictionaries: "Словники",
  settingsDictionariesHint:
    "Словники орфографії завантажуються за запитом, а не вбудовані заздалегідь — обери потрібні.",
  dictionaryInstalled: "Встановлено",
  dictionaryNotInstalled: "Не встановлено",
  dictionaryDownload: "Завантажити",
  dictionaryRemove: "Видалити",
  settingsUpdates: "Оновлення",
  settingsUpdatesHint: "Встановлена версія і що змінилося в кожному релізі.",
  currentVersion: "Поточна версія",
  versionHistory: "Історія версій",
  settingsAgents: "Агенти",
  settingsAgentsHint:
    "Вхід через ваші акаунти Claude, Codex і Cursor. Зелена лампочка над колонкою означає, що агент готовий.",
  language: "Мова",
  languageHint: "Мова інтерфейсу програми.",
  appearance: "Оформлення",
  appearanceHint: "Звичайний, нічний або книжковий режим.",
  themeNormal: "Звичайний",
  themeNight: "Нічний",
  themeBook: "Книжковий",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignedInAs: "GitHub",
  githubSignIn: "Увійти в GitHub",
  githubSignOut: "Вийти з GitHub",
  accountMenu: "Акаунт GitHub",
  openSettings: "Налаштування",
  authSignedIn: "Вхід виконано",
  authSignedOut: "Немає входу",
  authMissingCli: "CLI не встановлено",
  authSignIn: "Увійти",
  authSignOut: "Вийти",
  authRefresh: "Оновити",
  authChecking: "Перевіряємо…",
  authLoginStarted: "Вхід запущено — завершіть його в браузері або Terminal.",
  authLogoutStarted: "Вихід запущено — завершіть його в браузері або Terminal.",
  authReady: "Готовий",
  authNotReady: "Немає входу",
  checkUpdate: "Перевірити оновлення",
  updateUpToDate: "актуальна версія",
  updateChecking: "перевіряємо…",
  updateDownloading: "завантажуємо {version}…",
  updateRestarting: "перезапуск…",
  writing: "пише…",
  error: "помилка",
  copy: "копіювати",
  copyTitle: "Скопіювати",
  waiting: "Чекаємо відповідь…",
  promptPlaceholder:
    "Встав фрагмент або обери розділ зліва. Можна писати як звичайно з агентом — наприклад «проза/стиль: оживи цей діалог» плюс текст.",
  send: "Надіслати Claude + Codex + Cursor",
  clearPrompt: "Очистити текст",
  waitingAgents: "Чекаємо агентів…",
  loadChapterFailed: "[не вдалося завантажити розділ: {error}]",
};

const cs: Dict = {
  chapters: "Kapitoly",
  notes: "Poznámky",
  notesHint: "Kapitoly ze složky rukopisu.",
  appleNotes: "Poznámky Apple",
  appleNotesHint:
    "macOS požádá o povolení ovládat aplikaci Poznámky. Vyberte složku a poznámku — text půjde do pole pro agenty.",
  appleNotesConnect: "Otevřít Poznámky Apple",
  appleNotesConnecting: "Otevíráme Poznámky…",
  appleNotesFolders: "Složky",
  appleNotesNotes: "Poznámky",
  appleNotesEmpty: "V této složce nejsou žádné poznámky.",
  appleNotesBack: "← Složky",
  appleNotesRefresh: "Obnovit",
  appleNotesAccessDenied:
    "Přístup odepřen. Povolte Cockpit → Poznámky v Nastavení systému → Soukromí → Automatizace.",
  appleNotesOnlyMac: "Poznámky Apple fungují jen na Macu.",
  loadAppleNoteFailed: "[poznámku se nepodařilo načíst: {error}]",
  editor: "Editor",
  editorPlaceholder: "Pište v editoru Loomdraft — koncept se automaticky ukládá lokálně.",
  editorHint:
    "Editor Loomdraft: markdown, osnovu, historii, obrázky. Koncept se ukládá lokálně.",
  backToAgents: "Agenti",
  limitFiveHour: "5 h",
  limitWeekly: "týden",
  limitUsed: "{label} {percent} %",
  limitUnavailable: "limity n/a",
  limitRefresh: "Obnovit limity Codex",
  settings: "Nastavení",
  settingsNav: "Sekce nastavení",
  settingsGeneral: "Obecné",
  settingsManuscript: "Rukopis",
  settingsManuscriptHint: "Vyberte složku, kde jsou kapitoly.",
  manuscriptPath: "Složka",
  manuscriptNotSet: "Nenastaveno",
  chooseFolder: "Vybrat složku…",
  settingsDictionaries: "Slovníky",
  settingsDictionariesHint:
    "Slovníky pro kontrolu pravopisu se stahují na vyžádání, nejsou součástí instalace — vyberte, které potřebujete.",
  dictionaryInstalled: "Nainstalováno",
  dictionaryNotInstalled: "Nenainstalováno",
  dictionaryDownload: "Stáhnout",
  dictionaryRemove: "Odebrat",
  settingsUpdates: "Aktualizace",
  settingsUpdatesHint: "Nainstalovaná verze a co se změnilo v jednotlivých vydáních.",
  currentVersion: "Aktuální verze",
  versionHistory: "Historie verzí",
  settingsAgents: "Agenti",
  settingsAgentsHint:
    "Přihlášení přes vaše účty Claude, Codex a Cursor. Zelená kontrolka nad sloupcem znamená, že je agent připraven.",
  language: "Jazyk",
  languageHint: "Jazyk rozhraní aplikace.",
  appearance: "Vzhled",
  appearanceHint: "Běžný, noční nebo knižní režim.",
  themeNormal: "Běžný",
  themeNight: "Noční",
  themeBook: "Knižní",
  backToWorkspace: "Zpět",
  githubTitle: "GitHub",
  githubSignedInAs: "GitHub",
  githubSignIn: "Přihlásit se na GitHub",
  githubSignOut: "Odhlásit se z GitHubu",
  accountMenu: "Účet GitHub",
  openSettings: "Nastavení",
  authSignedIn: "Přihlášeno",
  authSignedOut: "Nepřihlášeno",
  authMissingCli: "CLI není nainstalováno",
  authSignIn: "Přihlásit se",
  authSignOut: "Odhlásit se",
  authRefresh: "Obnovit",
  authChecking: "Kontroluji…",
  authLoginStarted: "Přihlášení spuštěno — dokončete ho v prohlížeči nebo Terminalu.",
  authLogoutStarted: "Odhlášení spuštěno — dokončete ho v prohlížeči nebo Terminalu.",
  authReady: "Připraven",
  authNotReady: "Nepřihlášeno",
  checkUpdate: "Zkontrolovat aktualizace",
  updateUpToDate: "aktuální verze",
  updateChecking: "kontroluji…",
  updateDownloading: "stahuji {version}…",
  updateRestarting: "restartuji…",
  writing: "píše…",
  error: "chyba",
  copy: "kopírovat",
  copyTitle: "Kopírovat",
  waiting: "Čekám na odpověď…",
  promptPlaceholder:
    "Vlož fragment nebo vyber kapitolu vlevo. Můžeš psát jako obvykle s agentem — například „próza/styl: oživ tento dialog“ plus text.",
  send: "Odeslat Claude + Codex + Cursor",
  clearPrompt: "Vymazat text",
  waitingAgents: "Čekám na agenty…",
  loadChapterFailed: "[kapitolu se nepodařilo načíst: {error}]",
};

const dictionaries: Record<Locale, Dict> = { en, ru, uk, cs };

export type MessageKey = keyof Dict;

export function isLocale(value: string): value is Locale {
  return LOCALES.some((item) => item.id === value);
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && isLocale(saved)) return saved;
  } catch {
    /* ignore */
  }

  const candidates = [
    ...(typeof navigator !== "undefined" ? navigator.languages ?? [] : []),
    typeof navigator !== "undefined" ? navigator.language : "",
  ];

  for (const raw of candidates) {
    const base = raw.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }

  return "ru";
}

export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  let text = dictionaries[locale][key] ?? dictionaries.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(value);
    }
  }
  return text;
}
