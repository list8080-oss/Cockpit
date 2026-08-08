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
  settings: string;
  settingsGeneral: string;
  language: string;
  languageHint: string;
  backToWorkspace: string;
  githubTitle: string;
  githubSignIn: string;
  accountMenu: string;
  authSignedIn: string;
  authSignedOut: string;
  authMissingCli: string;
  authSignIn: string;
  authRefresh: string;
  authChecking: string;
  authLoginStarted: string;
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
  settings: "Settings",
  settingsGeneral: "General",
  language: "Language",
  languageHint: "Interface language for the app.",
  backToWorkspace: "Back",
  githubTitle: "GitHub",
  githubSignIn: "Sign in to GitHub",
  accountMenu: "GitHub and settings",
  authSignedIn: "Signed in",
  authSignedOut: "Not signed in",
  authMissingCli: "CLI not installed",
  authSignIn: "Sign in",
  authRefresh: "Refresh",
  authChecking: "Checking…",
  authLoginStarted: "Login started — finish it in the browser or Terminal.",
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
  settings: "Настройки",
  settingsGeneral: "Общие",
  language: "Язык",
  languageHint: "Язык интерфейса приложения.",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignIn: "Войти в GitHub",
  accountMenu: "GitHub и настройки",
  authSignedIn: "Вход выполнен",
  authSignedOut: "Нет входа",
  authMissingCli: "CLI не установлен",
  authSignIn: "Войти",
  authRefresh: "Обновить",
  authChecking: "Проверяем…",
  authLoginStarted: "Вход запущен — завершите его в браузере или Terminal.",
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
  settings: "Налаштування",
  settingsGeneral: "Загальні",
  language: "Мова",
  languageHint: "Мова інтерфейсу програми.",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignIn: "Увійти в GitHub",
  accountMenu: "GitHub і налаштування",
  authSignedIn: "Вхід виконано",
  authSignedOut: "Немає входу",
  authMissingCli: "CLI не встановлено",
  authSignIn: "Увійти",
  authRefresh: "Оновити",
  authChecking: "Перевіряємо…",
  authLoginStarted: "Вхід запущено — завершіть його в браузері або Terminal.",
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
  settings: "Nastavení",
  settingsGeneral: "Obecné",
  language: "Jazyk",
  languageHint: "Jazyk rozhraní aplikace.",
  backToWorkspace: "Zpět",
  githubTitle: "GitHub",
  githubSignIn: "Přihlásit se na GitHub",
  accountMenu: "GitHub a nastavení",
  authSignedIn: "Přihlášeno",
  authSignedOut: "Nepřihlášeno",
  authMissingCli: "CLI není nainstalováno",
  authSignIn: "Přihlásit se",
  authRefresh: "Obnovit",
  authChecking: "Kontroluji…",
  authLoginStarted: "Přihlášení spuštěno — dokončete ho v prohlížeči nebo Terminalu.",
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
