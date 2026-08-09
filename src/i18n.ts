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
  project: string;
  projectConnectHint: string;
  projectDisconnect: string;
  projectDisconnectConfirm: string;
  chooseFile: string;
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
  settingsAgentModels: string;
  settingsAgentModelsHint: string;
  agentModel: string;
  agentEffort: string;
  optionDefault: string;
  cursorModelHint: string;
  opencodeModelHint: string;
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
  githubOpenProfile: string;
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
  replyPlaceholder: string;
  replySend: string;
  agentHistory: string;
  agentHistoryHint: string;
  agentHistoryEmpty: string;
  agentHistoryDelete: string;
  agentHistoryDeleteConfirm: string;
  orchestrator: string;
  orchestratorHint: string;
  orchestratorEmpty: string;
  orchestratorYou: string;
  orchestratorDispatched: string;
  orchestratorAgentsList: string;
  orchestratorCompleted: string;
  orchestratorSeePanels: string;
  orchestratorWhoAnswered: string;
  orchestratorWhoFailed: string;
  orchestratorWhoUnavailable: string;
  orchestratorWaiting: string;
  orchestratorAgentPanels: string;
  orchestratorExpandPanel: string;
  orchestratorCollapsePanel: string;
  orchestratorStatusReady: string;
  orchestratorStatusRunning: string;
  orchestratorStatusError: string;
  orchestratorStatusUnavailable: string;
  orchestratorStatusNeedsAuth: string;
  orchestratorStatusDone: string;
  orchestratorFinalAnswer: string;
  orchestratorAgentReply: string;
  orchestratorAgentError: string;
};

const en: Dict = {
  chapters: "Chapters",
  project: "Project",
  projectConnectHint:
    "Connect what you're working on: a folder (chapters as separate files) or a single file (the whole manuscript in one document).",
  projectDisconnect: "Disconnect",
  projectDisconnectConfirm: "Disconnect this project? Nothing on disk is touched — you can reconnect it or a different one anytime.",
  chooseFile: "Choose file…",
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
  settingsManuscript: "Project",
  settingsManuscriptHint: "Connect a folder (chapters as separate files) or a single file (the whole manuscript in one document).",
  manuscriptPath: "Path",
  manuscriptNotSet: "Not connected",
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
  settingsAgentModels: "Models & effort",
  settingsAgentModelsHint: "Optional per-engine overrides. Leave on Default to use each CLI's own default.",
  agentModel: "Model",
  agentEffort: "Effort",
  optionDefault: "Default",
  cursorModelHint: "Cursor has no separate effort setting — it's part of the model name, e.g. claude-opus-4-8-thinking-high.",
  opencodeModelHint: "Only free OpenCode Zen models are listed — a paid one can never run by accident.",
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
  githubOpenProfile: "Open GitHub profile",
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
  send: "Send to Orchestrator",
  clearPrompt: "Clear text",
  waitingAgents: "Waiting for agents…",
  loadChapterFailed: "[failed to load chapter: {error}]",
  replyPlaceholder: "Reply to this agent (continues this conversation)…",
  replySend: "Reply",
  agentHistory: "History",
  agentHistoryHint:
    "Past agent comparisons. Open one to keep going — replies use the same session, not a cold start.",
  agentHistoryEmpty: "No saved conversations yet.",
  agentHistoryDelete: "Delete conversation",
  agentHistoryDeleteConfirm: "Delete this conversation? This can't be undone.",
  orchestrator: "Orchestrator",
  orchestratorHint: "You talk to the Orchestrator; it runs the connected agents and collects their results.",
  orchestratorEmpty: "Write a request below. The Orchestrator will pass it to the available agents.",
  orchestratorYou: "You",
  orchestratorDispatched: "Request sent to agents.",
  orchestratorAgentsList: "Started: {agents}",
  orchestratorCompleted: "Work finished. Answers are available in the agent panels below.",
  orchestratorSeePanels: "Open a panel below for the full reply or error.",
  orchestratorWhoAnswered: "Answered: {agents}",
  orchestratorWhoFailed: "Failed: {agents}",
  orchestratorWhoUnavailable: "Unavailable: {agents}",
  orchestratorWaiting: "Waiting for a reply…",
  orchestratorAgentPanels: "Agents",
  orchestratorExpandPanel: "Expand panel",
  orchestratorCollapsePanel: "Collapse panel",
  orchestratorStatusReady: "Ready",
  orchestratorStatusRunning: "Running",
  orchestratorStatusError: "Error",
  orchestratorStatusUnavailable: "Unavailable",
  orchestratorStatusNeedsAuth: "Needs sign-in",
  orchestratorStatusDone: "Done",
  orchestratorFinalAnswer: "Final reply",
  orchestratorAgentReply: "Agent reply",
  orchestratorAgentError: "Agent error",
};

const ru: Dict = {
  chapters: "Главы",
  project: "Проект",
  projectConnectHint:
    "Подключи то, с чем работаешь: папку (главы отдельными файлами) или один файл (вся рукопись целиком).",
  projectDisconnect: "Отключить",
  projectDisconnectConfirm: "Отключить этот проект? На диске ничего не тронется — можно подключить его же или другой в любой момент.",
  chooseFile: "Выбрать файл…",
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
  settingsManuscript: "Проект",
  settingsManuscriptHint: "Подключи папку (главы отдельными файлами) или один файл (вся рукопись целиком).",
  manuscriptPath: "Путь",
  manuscriptNotSet: "Не подключён",
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
  settingsAgentModels: "Модели и уровни",
  settingsAgentModelsHint: "Необязательные настройки на каждый движок. Оставь «По умолчанию», чтобы CLI выбирал сам.",
  agentModel: "Модель",
  agentEffort: "Уровень рассуждения",
  optionDefault: "По умолчанию",
  cursorModelHint: "У Cursor нет отдельного уровня — он зашит в имя модели, например claude-opus-4-8-thinking-high.",
  opencodeModelHint: "В списке только бесплатные модели OpenCode Zen — платная случайно не запустится.",
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
  githubOpenProfile: "Открыть профиль на GitHub",
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
  send: "Отправить Оркестратору",
  clearPrompt: "Очистить текст",
  waitingAgents: "Ждём агентов…",
  loadChapterFailed: "[не удалось загрузить главу: {error}]",
  replyPlaceholder: "Ответь этому агенту (продолжит этот же диалог)…",
  replySend: "Ответить",
  agentHistory: "История",
  agentHistoryHint:
    "Прошлые обсуждения с агентами. Открой любое — ответ продолжит ту же сессию, а не начнёт с нуля.",
  agentHistoryEmpty: "Пока нет сохранённых обсуждений.",
  agentHistoryDelete: "Удалить обсуждение",
  agentHistoryDeleteConfirm: "Удалить это обсуждение? Отменить будет нельзя.",
  orchestrator: "Оркестратор",
  orchestratorHint:
    "Вы общаетесь с Оркестратором; он запускает подключённых агентов и собирает их результаты.",
  orchestratorEmpty:
    "Напишите запрос ниже. Оркестратор передаст его доступным агентам.",
  orchestratorYou: "Вы",
  orchestratorDispatched: "Запрос передан агентам.",
  orchestratorAgentsList: "Запущены: {agents}",
  orchestratorCompleted: "Работа завершена. Ответы доступны в панелях агентов ниже.",
  orchestratorSeePanels: "Откройте панель ниже, чтобы увидеть полный ответ или ошибку.",
  orchestratorWhoAnswered: "Ответили: {agents}",
  orchestratorWhoFailed: "Завершились ошибкой: {agents}",
  orchestratorWhoUnavailable: "Недоступны: {agents}",
  orchestratorWaiting: "Ожидание ответа…",
  orchestratorAgentPanels: "Агенты",
  orchestratorExpandPanel: "Раскрыть панель",
  orchestratorCollapsePanel: "Свернуть панель",
  orchestratorStatusReady: "Готов",
  orchestratorStatusRunning: "Работает",
  orchestratorStatusError: "Ошибка",
  orchestratorStatusUnavailable: "Недоступен",
  orchestratorStatusNeedsAuth: "Нужна авторизация",
  orchestratorStatusDone: "Готово",
  orchestratorFinalAnswer: "Итоговый ответ",
  orchestratorAgentReply: "Ответ агента",
  orchestratorAgentError: "Ошибка агента",
};

const uk: Dict = {
  chapters: "Розділи",
  project: "Проєкт",
  projectConnectHint:
    "Підключи те, з чим працюєш: теку (розділи окремими файлами) або один файл (весь рукопис цілком).",
  projectDisconnect: "Відключити",
  projectDisconnectConfirm: "Відключити цей проєкт? На диску нічого не зміниться — можна підключити його ж або інший будь-коли.",
  chooseFile: "Обрати файл…",
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
  settingsManuscript: "Проєкт",
  settingsManuscriptHint: "Підключи теку (розділи окремими файлами) або один файл (весь рукопис цілком).",
  manuscriptPath: "Шлях",
  manuscriptNotSet: "Не підключено",
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
  settingsAgentModels: "Моделі та рівні",
  settingsAgentModelsHint: "Необов'язкові налаштування для кожного рушія. Залиш «За замовчуванням», щоб CLI обирав сам.",
  agentModel: "Модель",
  agentEffort: "Рівень міркування",
  optionDefault: "За замовчуванням",
  cursorModelHint: "У Cursor немає окремого рівня — він зашитий в назву моделі, наприклад claude-opus-4-8-thinking-high.",
  opencodeModelHint: "У списку лише безкоштовні моделі OpenCode Zen — платна випадково не запуститься.",
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
  githubOpenProfile: "Відкрити профіль на GitHub",
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
  send: "Надіслати Оркестратору",
  clearPrompt: "Очистити текст",
  waitingAgents: "Чекаємо агентів…",
  loadChapterFailed: "[не вдалося завантажити розділ: {error}]",
  replyPlaceholder: "Відповідай цьому агенту (продовжить цю ж розмову)…",
  replySend: "Відповісти",
  agentHistory: "Історія",
  agentHistoryHint:
    "Минулі обговорення з агентами. Відкрий будь-яке — відповідь продовжить ту саму сесію, а не почне з нуля.",
  agentHistoryEmpty: "Поки немає збережених обговорень.",
  agentHistoryDelete: "Видалити обговорення",
  agentHistoryDeleteConfirm: "Видалити це обговорення? Скасувати буде неможливо.",
  orchestrator: "Оркестратор",
  orchestratorHint:
    "Ви спілкуєтеся з Оркестратором; він запускає підключених агентів і збирає їхні результати.",
  orchestratorEmpty:
    "Напишіть запит нижче. Оркестратор передасть його доступним агентам.",
  orchestratorYou: "Ви",
  orchestratorDispatched: "Запит передано агентам.",
  orchestratorAgentsList: "Запущено: {agents}",
  orchestratorCompleted: "Роботу завершено. Відповіді доступні в панелях агентів нижче.",
  orchestratorSeePanels: "Відкрийте панель нижче, щоб побачити повну відповідь або помилку.",
  orchestratorWhoAnswered: "Відповіли: {agents}",
  orchestratorWhoFailed: "Завершилися помилкою: {agents}",
  orchestratorWhoUnavailable: "Недоступні: {agents}",
  orchestratorWaiting: "Очікування відповіді…",
  orchestratorAgentPanels: "Агенти",
  orchestratorExpandPanel: "Розгорнути панель",
  orchestratorCollapsePanel: "Згорнути панель",
  orchestratorStatusReady: "Готовий",
  orchestratorStatusRunning: "Працює",
  orchestratorStatusError: "Помилка",
  orchestratorStatusUnavailable: "Недоступний",
  orchestratorStatusNeedsAuth: "Потрібна авторизація",
  orchestratorStatusDone: "Готово",
  orchestratorFinalAnswer: "Підсумкова відповідь",
  orchestratorAgentReply: "Відповідь агента",
  orchestratorAgentError: "Помилка агента",
};

const cs: Dict = {
  chapters: "Kapitoly",
  project: "Projekt",
  projectConnectHint:
    "Připojte to, na čem pracujete: složku (kapitoly jako samostatné soubory) nebo jeden soubor (celý rukopis v jednom dokumentu).",
  projectDisconnect: "Odpojit",
  projectDisconnectConfirm: "Odpojit tento projekt? Na disku se nic nezmění — kdykoli lze připojit znovu nebo jiný.",
  chooseFile: "Vybrat soubor…",
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
  settingsManuscript: "Projekt",
  settingsManuscriptHint: "Připojte složku (kapitoly jako samostatné soubory) nebo jeden soubor (celý rukopis v jednom dokumentu).",
  manuscriptPath: "Cesta",
  manuscriptNotSet: "Nepřipojeno",
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
  settingsAgentModels: "Modely a úroveň",
  settingsAgentModelsHint: "Volitelné nastavení pro každý engine. Ponechte na Výchozí, aby si CLI zvolil sám.",
  agentModel: "Model",
  agentEffort: "Úroveň uvažování",
  optionDefault: "Výchozí",
  cursorModelHint: "Cursor nemá samostatnou úroveň — je součástí názvu modelu, např. claude-opus-4-8-thinking-high.",
  opencodeModelHint: "V seznamu jsou jen bezplatné modely OpenCode Zen — placený se nikdy nespustí omylem.",
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
  githubOpenProfile: "Otevřít profil na GitHubu",
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
  send: "Odeslat Orchestrátorovi",
  clearPrompt: "Vymazat text",
  waitingAgents: "Čekám na agenty…",
  loadChapterFailed: "[kapitolu se nepodařilo načíst: {error}]",
  replyPlaceholder: "Odpověz tomuto agentovi (naváže na tuto konverzaci)…",
  replySend: "Odpovědět",
  agentHistory: "Historie",
  agentHistoryHint:
    "Předchozí porovnání s agenty. Otevřete některé — odpověď naváže na stejnou relaci, ne od nuly.",
  agentHistoryEmpty: "Zatím žádné uložené konverzace.",
  agentHistoryDelete: "Smazat konverzaci",
  agentHistoryDeleteConfirm: "Smazat tuto konverzaci? Nelze vrátit zpět.",
  orchestrator: "Orchestrátor",
  orchestratorHint:
    "Mluvíte s Orchestrátorem; ten spouští připojené agenty a sbírá jejich výsledky.",
  orchestratorEmpty:
    "Napište požadavek níže. Orchestrátor ho předá dostupným agentům.",
  orchestratorYou: "Vy",
  orchestratorDispatched: "Požadavek byl předán agentům.",
  orchestratorAgentsList: "Spuštěno: {agents}",
  orchestratorCompleted: "Práce dokončena. Odpovědi jsou v panelech agentů níže.",
  orchestratorSeePanels: "Otevřete panel níže pro celou odpověď nebo chybu.",
  orchestratorWhoAnswered: "Odpověděli: {agents}",
  orchestratorWhoFailed: "Skončili chybou: {agents}",
  orchestratorWhoUnavailable: "Nedostupní: {agents}",
  orchestratorWaiting: "Čekám na odpověď…",
  orchestratorAgentPanels: "Agenti",
  orchestratorExpandPanel: "Rozbalit panel",
  orchestratorCollapsePanel: "Sbalit panel",
  orchestratorStatusReady: "Připraven",
  orchestratorStatusRunning: "Běží",
  orchestratorStatusError: "Chyba",
  orchestratorStatusUnavailable: "Nedostupný",
  orchestratorStatusNeedsAuth: "Vyžaduje přihlášení",
  orchestratorStatusDone: "Hotovo",
  orchestratorFinalAnswer: "Finální odpověď",
  orchestratorAgentReply: "Odpověď agenta",
  orchestratorAgentError: "Chyba agenta",
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
