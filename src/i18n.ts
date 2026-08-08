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
  settingsUpdates: string;
  settingsUpdatesHint: string;
  currentVersion: string;
  versionHistory: string;
  settingsAgents: string;
  settingsAgentsHint: string;
  language: string;
  languageHint: string;
  backToWorkspace: string;
  githubTitle: string;
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
  settings: "Settings",
  settingsGeneral: "General",
  settingsUpdates: "Updates",
  settingsUpdatesHint: "Installed version and what changed in each release.",
  currentVersion: "Current version",
  versionHistory: "Version history",
  settingsAgents: "Agents",
  settingsAgentsHint:
    "Sign in with your own Claude, Codex, and Cursor accounts. Green on a column means that agent is ready.",
  language: "Language",
  languageHint: "Interface language for the app.",
  backToWorkspace: "Back",
  githubTitle: "GitHub",
  githubSignIn: "Sign in to GitHub",
  githubSignOut: "Sign out of GitHub",
  accountMenu: "GitHub",
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
  settings: "Настройки",
  settingsGeneral: "Общие",
  settingsUpdates: "Обновления",
  settingsUpdatesHint: "Установленная версия и что изменилось в каждом релизе.",
  currentVersion: "Текущая версия",
  versionHistory: "История версий",
  settingsAgents: "Агенты",
  settingsAgentsHint:
    "Вход через ваши аккаунты Claude, Codex и Cursor. Зелёная лампочка над колонкой значит, что агент готов.",
  language: "Язык",
  languageHint: "Язык интерфейса приложения.",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignIn: "Войти в GitHub",
  githubSignOut: "Выйти из GitHub",
  accountMenu: "GitHub",
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
  settings: "Налаштування",
  settingsGeneral: "Загальні",
  settingsUpdates: "Оновлення",
  settingsUpdatesHint: "Встановлена версія і що змінилося в кожному релізі.",
  currentVersion: "Поточна версія",
  versionHistory: "Історія версій",
  settingsAgents: "Агенти",
  settingsAgentsHint:
    "Вхід через ваші акаунти Claude, Codex і Cursor. Зелена лампочка над колонкою означає, що агент готовий.",
  language: "Мова",
  languageHint: "Мова інтерфейсу програми.",
  backToWorkspace: "Назад",
  githubTitle: "GitHub",
  githubSignIn: "Увійти в GitHub",
  githubSignOut: "Вийти з GitHub",
  accountMenu: "GitHub",
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
  settings: "Nastavení",
  settingsGeneral: "Obecné",
  settingsUpdates: "Aktualizace",
  settingsUpdatesHint: "Nainstalovaná verze a co se změnilo v jednotlivých vydáních.",
  currentVersion: "Aktuální verze",
  versionHistory: "Historie verzí",
  settingsAgents: "Agenti",
  settingsAgentsHint:
    "Přihlášení přes vaše účty Claude, Codex a Cursor. Zelená kontrolka nad sloupcem znamená, že je agent připraven.",
  language: "Jazyk",
  languageHint: "Jazyk rozhraní aplikace.",
  backToWorkspace: "Zpět",
  githubTitle: "GitHub",
  githubSignIn: "Přihlásit se na GitHub",
  githubSignOut: "Odhlásit se z GitHubu",
  accountMenu: "GitHub",
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
