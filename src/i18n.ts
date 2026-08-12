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
  editorLoading: string;
  backToAgents: string;
  simpleChatSidebarLabel: string;
  limitFiveHour: string;
  limitWeekly: string;
  limitUsed: string;
  limitUnavailable: string;
  limitRefresh: string;
  settings: string;
  settingsNav: string;
  settingsGeneral: string;
  settingsProjects: string;
  settingsProjectsHint: string;
  settingsOrchestrator: string;
  settingsOrchestratorHint: string;
  settingsJournal: string;
  settingsJournalHint: string;
  journalFilterAll: string;
  journalFilterFree: string;
  journalEmpty: string;
  projectPathLabel: string;
  projectPathNotSet: string;
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
  settingsChatArchive: string;
  settingsChatArchiveHint: string;
  openFolder: string;
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
  simpleChatPickEngine: string;
  simpleChatSwitchAgent: string;
  simpleChatComposerPlaceholder: string;
  simpleChatEmpty: string;
  simpleChatWaiting: string;
  simpleChatSend: string;
  orchestrator: string;
  orchestratorHint: string;
  orchestratorSidebarPanel: string;
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
  orchestratorSynthesize: string;
  orchestratorSynthesizing: string;
  orchestratorSynthesisNeedTwo: string;
  orchestratorSynthesisError: string;
  orchestratorModeLabel: string;
  orchestratorModeNormal: string;
  orchestratorModePlan: string;
  orchestratorModePropose: string;
  orchestratorModeFullAccess: string;
  orchestratorContextLabel: string;
  orchestratorContextProject: string;
  orchestratorContextFree: string;
  orchestratorAgentsSelectLabel: string;
  orchestratorProjectRequired: string;
  orchestratorFullAccessWarningTitle: string;
  orchestratorFullAccessWarningBodyProject: string;
  orchestratorFullAccessWarningBodyFree: string;
  orchestratorFullAccessConfirm: string;
  orchestratorFullAccessCancel: string;
  orchestratorFullAccessBannerProject: string;
  orchestratorFullAccessBannerFree: string;
  orchestratorSendFullAccess: string;
  orchestratorSendPlan: string;
  orchestratorSendPropose: string;
  orchestratorSendFree: string;
  orchestratorFullAccessWaiting: string;
  orchestratorFullAccessError: string;
  orchestratorPlanWaiting: string;
  orchestratorPlanPreface: string;
  orchestratorPlanError: string;
  orchestratorProposeWaiting: string;
  orchestratorProposeError: string;
  orchestratorProposalApply: string;
  orchestratorProposalReject: string;
  orchestratorProposalApplying: string;
  orchestratorProposalApplied: string;
  orchestratorProposalRejected: string;
  orchestratorProposalRollback: string;
  orchestratorProposalRollingBack: string;
  orchestratorProposalRolledBack: string;
  orchestratorProposalApplyError: string;
  orchestratorProposalRollbackError: string;
  orchestratorAttachFile: string;
  orchestratorAttachFilePicker: string;
  orchestratorAttachFileEmpty: string;
  orchestratorAttachFileManuscript: string;
  orchestratorAttachFilePlanning: string;
  orchestratorRemoveAttachment: string;
  orchestratorRoleLabel: string;
  orchestratorRoleNone: string;
  roleSceneAuthor: string;
  roleStyleEditor: string;
  roleCanonChecker: string;
  rolePsychologyChecker: string;
  roleHistoricalAccuracyChecker: string;
  roleContinuityEditor: string;
  roleFinalLiteraryEditor: string;
  roleCodeResearcher: string;
  roleArchitect: string;
  roleTester: string;
  roleReviewer: string;
  roleExecutor: string;
  roleSecurityAuditor: string;
  orchestratorStructuredResultLabel: string;
  orchestratorProfileLabel: string;
  orchestratorProfileSwitchError: string;
  profileManuscript: string;
  profileDevelopment: string;
  profileFreeProject: string;
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
    "macOS will ask to let InPrincipio control the Notes app. Then pick a folder and a note — its text goes into the agents prompt.",
  appleNotesConnect: "Open Apple Notes",
  appleNotesConnecting: "Opening Notes…",
  appleNotesFolders: "Folders",
  appleNotesNotes: "Notes",
  appleNotesEmpty: "No notes in this folder.",
  appleNotesBack: "← Folders",
  appleNotesRefresh: "Refresh",
  appleNotesAccessDenied:
    "Access denied. Allow InPrincipio → Notes in System Settings → Privacy & Security → Automation.",
  appleNotesOnlyMac: "Apple Notes works only on Mac.",
  loadAppleNoteFailed: "[failed to load note: {error}]",
  editor: "Editor",
  editorLoading: "Loading editor…",
  backToAgents: "Agents",
  simpleChatSidebarLabel: "Chat",
  limitFiveHour: "5h",
  limitWeekly: "week",
  limitUsed: "{label} {percent}% used",
  limitUnavailable: "limits n/a",
  limitRefresh: "Refresh Codex limits",
  settings: "Settings",
  settingsNav: "Settings sections",
  settingsGeneral: "General",
  settingsProjects: "Projects",
  settingsProjectsHint:
    "Each profile can have its own connected folder or file — the Orchestrator uses whichever one is active. Manuscript accepts a folder of chapter files or a single file; the others, any folder or file.",
  settingsOrchestrator: "Orchestrator",
  settingsOrchestratorHint:
    "What's selected when you open the Orchestrator panel — you can still change it there per message.",
  settingsJournal: "Action journal",
  settingsJournalHint:
    "Every applied and rolled-back change, across every chat and project — not just the one message it happened in.",
  journalFilterAll: "All",
  journalFilterFree: "Free chat",
  journalEmpty: "No applied changes yet.",
  projectPathLabel: "Path",
  projectPathNotSet: "Not connected",
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
  settingsChatArchive: "Chat archive",
  settingsChatArchiveHint:
    "Every chat is also saved as Markdown on disk — split by project (a shared folder for chats with no connected project, plus one per project profile), and within that, one subfolder per engine.",
  openFolder: "Open folder",
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
  simpleChatPickEngine: "Who do you want to talk to?",
  simpleChatSwitchAgent: "Switch agent",
  simpleChatComposerPlaceholder: "Message",
  simpleChatEmpty: "Say something to get started.",
  simpleChatWaiting: "Thinking…",
  simpleChatSend: "Send",
  orchestrator: "Orchestrator",
  orchestratorHint: "You talk to the Orchestrator; it runs the connected agents and collects their results.",
  orchestratorSidebarPanel: "Orchestrator",
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
  orchestratorSynthesize: "Make a conclusion",
  orchestratorSynthesizing: "Analyzing replies…",
  orchestratorSynthesisNeedTwo:
    "Need at least two successful agent replies before a comparison can be made.",
  orchestratorSynthesisError: "Could not make a conclusion: {error}",
  orchestratorModeLabel: "Rights",
  orchestratorModeNormal: "Normal",
  orchestratorModePlan: "Plan",
  orchestratorModePropose: "Propose changes",
  orchestratorModeFullAccess: "Full access",
  orchestratorContextLabel: "Context",
  orchestratorContextProject: "Project",
  orchestratorContextFree: "Free chat",
  orchestratorAgentsSelectLabel: "Ask",
  orchestratorProjectRequired:
    "Connect a project first, or switch Context to Free chat.",
  orchestratorFullAccessWarningTitle: "Enable full access?",
  orchestratorFullAccessWarningBodyProject:
    "In Full access mode the Orchestrator runs a real Claude Code agent session in your connected project. It can change project files and run shell commands on this computer — not read-only. Only continue if you trust this request.",
  orchestratorFullAccessWarningBodyFree:
    "In Full access mode the Orchestrator runs a real Claude Code agent session in InPrincipio’s free-chat working folder (not your manuscript). It can write files there and run shell commands on this computer. Only continue if you trust this request.",
  orchestratorFullAccessConfirm: "Enable full access",
  orchestratorFullAccessCancel: "Cancel",
  orchestratorFullAccessBannerProject:
    "Full access is on — the Orchestrator can edit project files and run commands on this computer.",
  orchestratorFullAccessBannerFree:
    "Full access is on — the Orchestrator can edit files in the free-chat folder and run commands on this computer.",
  orchestratorSendFullAccess: "Send with full access",
  orchestratorSendPlan: "Send for plan",
  orchestratorSendPropose: "Send proposal",
  orchestratorSendFree: "Send (free chat)",
  orchestratorFullAccessWaiting: "Full-access agent is working…",
  orchestratorFullAccessError: "Full-access agent failed: {error}",
  orchestratorPlanWaiting: "Planning…",
  orchestratorPlanPreface: "Plan",
  orchestratorPlanError: "Plan agent failed: {error}",
  orchestratorProposeWaiting: "Preparing proposal…",
  orchestratorProposeError: "Propose-changes agent failed: {error}",
  orchestratorProposalApply: "Apply",
  orchestratorProposalReject: "Reject",
  orchestratorProposalApplying: "Applying…",
  orchestratorProposalApplied: "Applied",
  orchestratorProposalRejected: "Rejected",
  orchestratorProposalRollback: "Roll back",
  orchestratorProposalRollingBack: "Rolling back…",
  orchestratorProposalRolledBack: "Rolled back",
  orchestratorProposalApplyError: "Could not apply: {error}",
  orchestratorProposalRollbackError: "Could not roll back: {error}",
  orchestratorAttachFile: "Attach file",
  orchestratorAttachFilePicker: "Attach a project file",
  orchestratorAttachFileEmpty: "No documents in this project",
  orchestratorAttachFileManuscript: "Manuscript",
  orchestratorAttachFilePlanning: "Planning",
  orchestratorRemoveAttachment: "Remove attachment",
  orchestratorRoleLabel: "Role",
  orchestratorRoleNone: "No role",
  roleSceneAuthor: "Scene author",
  roleStyleEditor: "Style editor",
  roleCanonChecker: "Canon checker",
  rolePsychologyChecker: "Psychology checker",
  roleHistoricalAccuracyChecker: "Historical accuracy checker",
  roleContinuityEditor: "Continuity editor",
  roleFinalLiteraryEditor: "Final literary editor",
  roleCodeResearcher: "Code researcher",
  roleArchitect: "Architect",
  roleTester: "Tester",
  roleReviewer: "Reviewer",
  roleExecutor: "Executor",
  roleSecurityAuditor: "Security auditor",
  orchestratorStructuredResultLabel: "Ask for structured findings",
  orchestratorProfileLabel: "Profile",
  orchestratorProfileSwitchError: "Could not switch profile: {error}",
  profileManuscript: "Manuscript",
  profileDevelopment: "Development",
  profileFreeProject: "Free project",
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
  editorLoading: "Загрузка редактора…",
  backToAgents: "Агенты",
  simpleChatSidebarLabel: "Чат",
  limitFiveHour: "5ч",
  limitWeekly: "нед.",
  limitUsed: "{label} {percent}%",
  limitUnavailable: "лимиты н/д",
  limitRefresh: "Обновить лимиты Codex",
  settings: "Настройки",
  settingsNav: "Разделы настроек",
  settingsGeneral: "Общие",
  settingsProjects: "Проекты",
  settingsProjectsHint:
    "У каждого профиля может быть свой подключённый путь — Оркестратор использует тот, что активен сейчас. «Рукопись» принимает папку с главами или один файл; остальные — любую папку или файл.",
  settingsOrchestrator: "Оркестратор",
  settingsOrchestratorHint:
    "Что подставится при открытии панели Оркестратора — там же можно поменять на конкретное сообщение.",
  settingsJournal: "Журнал действий",
  settingsJournalHint:
    "Каждое применённое и откаченное изменение, из любого чата и проекта — не только внутри того сообщения, где это произошло.",
  journalFilterAll: "Все",
  journalFilterFree: "Свободный чат",
  journalEmpty: "Применённых изменений пока нет.",
  projectPathLabel: "Путь",
  projectPathNotSet: "Не подключён",
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
  settingsChatArchive: "Архив чатов",
  settingsChatArchiveHint:
    "Каждый чат также сохраняется в Markdown на диске — сначала по проекту (общая папка для чатов без подключённого проекта, и по одной на каждый профиль), а внутри — отдельная подпапка на каждый движок.",
  openFolder: "Открыть папку",
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
  simpleChatPickEngine: "С кем хочешь поговорить?",
  simpleChatSwitchAgent: "Сменить агента",
  simpleChatComposerPlaceholder: "Сообщение",
  simpleChatEmpty: "Напиши что-нибудь, чтобы начать.",
  simpleChatWaiting: "Думает…",
  simpleChatSend: "Отправить",
  orchestrator: "Оркестратор",
  orchestratorHint:
    "Вы общаетесь с Оркестратором; он запускает подключённых агентов и собирает их результаты.",
  orchestratorSidebarPanel: "Оркестратор",
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
  orchestratorSynthesize: "Сделать вывод",
  orchestratorSynthesizing: "Анализирую ответы…",
  orchestratorSynthesisNeedTwo:
    "Нужны ответы хотя бы двух агентов, иначе сравнивать нечего.",
  orchestratorSynthesisError: "Не удалось сделать вывод: {error}",
  orchestratorModeLabel: "Права",
  orchestratorModeNormal: "Обычный",
  orchestratorModePlan: "План",
  orchestratorModePropose: "Предложить изменения",
  orchestratorModeFullAccess: "Полный доступ",
  orchestratorContextLabel: "Контекст",
  orchestratorContextProject: "Проект",
  orchestratorContextFree: "Свободное общение",
  orchestratorAgentsSelectLabel: "Спросить",
  orchestratorProjectRequired:
    "Сначала подключите проект или переключите контекст на «Свободное общение».",
  orchestratorFullAccessWarningTitle: "Включить полный доступ?",
  orchestratorFullAccessWarningBodyProject:
    "В режиме «Полный доступ» Оркестратор запускает настоящую агентную сессию Claude Code в подключённом проекте. Он может менять файлы проекта и выполнять команды на этом компьютере — это уже не read-only. Продолжайте только если доверяете этому запросу.",
  orchestratorFullAccessWarningBodyFree:
    "В режиме «Полный доступ» Оркестратор запускает настоящую агентную сессию Claude Code в рабочей папке свободного общения InPrincipio (не в рукописи). Он может писать файлы туда и выполнять команды на этом компьютере. Продолжайте только если доверяете этому запросу.",
  orchestratorFullAccessConfirm: "Включить полный доступ",
  orchestratorFullAccessCancel: "Отмена",
  orchestratorFullAccessBannerProject:
    "Включён полный доступ — Оркестратор может править файлы проекта и выполнять команды на этом компьютере.",
  orchestratorFullAccessBannerFree:
    "Включён полный доступ — Оркестратор может править файлы в папке свободного общения и выполнять команды на этом компьютере.",
  orchestratorSendFullAccess: "Отправить с полным доступом",
  orchestratorSendPlan: "Отправить за планом",
  orchestratorSendPropose: "Отправить предложение",
  orchestratorSendFree: "Отправить (свободное)",
  orchestratorFullAccessWaiting: "Агент с полным доступом работает…",
  orchestratorFullAccessError: "Агент с полным доступом завершился ошибкой: {error}",
  orchestratorPlanWaiting: "Планирую…",
  orchestratorPlanPreface: "План",
  orchestratorPlanError: "Агент планирования завершился ошибкой: {error}",
  orchestratorProposeWaiting: "Готовлю предложение…",
  orchestratorProposeError: "Агент предложений завершился ошибкой: {error}",
  orchestratorProposalApply: "Применить",
  orchestratorProposalReject: "Отклонить",
  orchestratorProposalApplying: "Применяю…",
  orchestratorProposalApplied: "Применено",
  orchestratorProposalRejected: "Отклонено",
  orchestratorProposalRollback: "Откатить",
  orchestratorProposalRollingBack: "Откатываю…",
  orchestratorProposalRolledBack: "Откачено",
  orchestratorProposalApplyError: "Не удалось применить: {error}",
  orchestratorProposalRollbackError: "Не удалось откатить: {error}",
  orchestratorAttachFile: "Прикрепить файл",
  orchestratorAttachFilePicker: "Прикрепить файл проекта",
  orchestratorAttachFileEmpty: "В этом проекте нет документов",
  orchestratorAttachFileManuscript: "Рукопись",
  orchestratorAttachFilePlanning: "Планирование",
  orchestratorRemoveAttachment: "Убрать вложение",
  orchestratorRoleLabel: "Роль",
  orchestratorRoleNone: "Без роли",
  roleSceneAuthor: "Автор сцены",
  roleStyleEditor: "Редактор стиля",
  roleCanonChecker: "Проверяющий канон",
  rolePsychologyChecker: "Проверяющий психологию",
  roleHistoricalAccuracyChecker: "Проверяющий историческую достоверность",
  roleContinuityEditor: "Редактор непрерывности",
  roleFinalLiteraryEditor: "Финальный литературный редактор",
  roleCodeResearcher: "Исследователь кода",
  roleArchitect: "Архитектор",
  roleTester: "Тестировщик",
  roleReviewer: "Ревьюер",
  roleExecutor: "Исполнитель",
  roleSecurityAuditor: "Аудитор безопасности",
  orchestratorStructuredResultLabel: "Запросить структурированный итог",
  orchestratorProfileLabel: "Профиль",
  orchestratorProfileSwitchError: "Не удалось переключить профиль: {error}",
  profileManuscript: "Рукопись",
  profileDevelopment: "Разработка",
  profileFreeProject: "Свободный проект",
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
  editorLoading: "Завантаження редактора…",
  backToAgents: "Агенти",
  simpleChatSidebarLabel: "Чат",
  limitFiveHour: "5 год",
  limitWeekly: "тижд.",
  limitUsed: "{label} {percent}%",
  limitUnavailable: "ліміти н/д",
  limitRefresh: "Оновити ліміти Codex",
  settings: "Налаштування",
  settingsNav: "Розділи налаштувань",
  settingsGeneral: "Загальні",
  settingsProjects: "Проєкти",
  settingsProjectsHint:
    "У кожного профілю може бути свій підключений шлях — Оркестратор використовує той, що активний зараз. «Рукопис» приймає теку з розділами або один файл; решта — будь-яку теку чи файл.",
  settingsOrchestrator: "Оркестратор",
  settingsOrchestratorHint:
    "Що підставиться при відкритті панелі Оркестратора — там само можна змінити на конкретне повідомлення.",
  settingsJournal: "Журнал дій",
  settingsJournalHint:
    "Кожна застосована й відкочена зміна, з будь-якого чату й проєкту — не тільки всередині того повідомлення, де це сталося.",
  journalFilterAll: "Усі",
  journalFilterFree: "Вільний чат",
  journalEmpty: "Застосованих змін поки немає.",
  projectPathLabel: "Шлях",
  projectPathNotSet: "Не підключено",
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
  settingsChatArchive: "Архів чатів",
  settingsChatArchiveHint:
    "Кожен чат також зберігається у Markdown на диску — спершу за проєктом (спільна тека для чатів без підключеного проєкту й окрема на кожен профіль), а всередині — окрема підтека на кожен рушій.",
  openFolder: "Відкрити теку",
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
  simpleChatPickEngine: "З ким хочеш поговорити?",
  simpleChatSwitchAgent: "Змінити агента",
  simpleChatComposerPlaceholder: "Повідомлення",
  simpleChatEmpty: "Напиши щось, щоб почати.",
  simpleChatWaiting: "Думає…",
  simpleChatSend: "Надіслати",
  orchestrator: "Оркестратор",
  orchestratorHint:
    "Ви спілкуєтеся з Оркестратором; він запускає підключених агентів і збирає їхні результати.",
  orchestratorSidebarPanel: "Оркестратор",
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
  orchestratorSynthesize: "Зробити висновок",
  orchestratorSynthesizing: "Аналізую відповіді…",
  orchestratorSynthesisNeedTwo:
    "Потрібні відповіді щонайменше двох агентів, інакше порівнювати нічого.",
  orchestratorSynthesisError: "Не вдалося зробити висновок: {error}",
  orchestratorModeLabel: "Права",
  orchestratorModeNormal: "Звичайний",
  orchestratorModePlan: "План",
  orchestratorModePropose: "Запропонувати зміни",
  orchestratorModeFullAccess: "Повний доступ",
  orchestratorContextLabel: "Контекст",
  orchestratorContextProject: "Проєкт",
  orchestratorContextFree: "Вільне спілкування",
  orchestratorAgentsSelectLabel: "Запитати",
  orchestratorProjectRequired:
    "Спочатку підключіть проєкт або перемкніть контекст на «Вільне спілкування».",
  orchestratorFullAccessWarningTitle: "Увімкнути повний доступ?",
  orchestratorFullAccessWarningBodyProject:
    "У режимі «Повний доступ» Оркестратор запускає справжню агентну сесію Claude Code в підключеному проєкті. Він може змінювати файли проєкту й виконувати команди на цьому комп’ютері — це вже не read-only. Продовжуйте лише якщо довіряєте цьому запиту.",
  orchestratorFullAccessWarningBodyFree:
    "У режимі «Повний доступ» Оркестратор запускає справжню агентну сесію Claude Code в робочій теці вільного спілкування InPrincipio (не в рукописі). Він може писати файли туди й виконувати команди на цьому комп’ютері. Продовжуйте лише якщо довіряєте цьому запиту.",
  orchestratorFullAccessConfirm: "Увімкнути повний доступ",
  orchestratorFullAccessCancel: "Скасувати",
  orchestratorFullAccessBannerProject:
    "Увімкнено повний доступ — Оркестратор може редагувати файли проєкту й виконувати команди на цьому комп’ютері.",
  orchestratorFullAccessBannerFree:
    "Увімкнено повний доступ — Оркестратор може редагувати файли в теці вільного спілкування й виконувати команди на цьому комп’ютері.",
  orchestratorSendFullAccess: "Надіслати з повним доступом",
  orchestratorSendPlan: "Надіслати за планом",
  orchestratorSendPropose: "Надіслати пропозицію",
  orchestratorSendFree: "Надіслати (вільне)",
  orchestratorFullAccessWaiting: "Агент із повним доступом працює…",
  orchestratorFullAccessError: "Агент із повним доступом завершився помилкою: {error}",
  orchestratorPlanWaiting: "Планую…",
  orchestratorPlanPreface: "План",
  orchestratorPlanError: "Агент планування завершився помилкою: {error}",
  orchestratorProposeWaiting: "Готую пропозицію…",
  orchestratorProposeError: "Агент пропозицій завершився помилкою: {error}",
  orchestratorProposalApply: "Застосувати",
  orchestratorProposalReject: "Відхилити",
  orchestratorProposalApplying: "Застосовую…",
  orchestratorProposalApplied: "Застосовано",
  orchestratorProposalRejected: "Відхилено",
  orchestratorProposalRollback: "Відкотити",
  orchestratorProposalRollingBack: "Відкочую…",
  orchestratorProposalRolledBack: "Відкочено",
  orchestratorProposalApplyError: "Не вдалося застосувати: {error}",
  orchestratorProposalRollbackError: "Не вдалося відкотити: {error}",
  orchestratorAttachFile: "Прикріпити файл",
  orchestratorAttachFilePicker: "Прикріпити файл проєкту",
  orchestratorAttachFileEmpty: "У цьому проєкті немає документів",
  orchestratorAttachFileManuscript: "Рукопис",
  orchestratorAttachFilePlanning: "Планування",
  orchestratorRemoveAttachment: "Прибрати вкладення",
  orchestratorRoleLabel: "Роль",
  orchestratorRoleNone: "Без ролі",
  roleSceneAuthor: "Автор сцени",
  roleStyleEditor: "Редактор стилю",
  roleCanonChecker: "Перевірка канону",
  rolePsychologyChecker: "Перевірка психології",
  roleHistoricalAccuracyChecker: "Перевірка історичної достовірності",
  roleContinuityEditor: "Редактор безперервності",
  roleFinalLiteraryEditor: "Фінальний літературний редактор",
  roleCodeResearcher: "Дослідник коду",
  roleArchitect: "Архітектор",
  roleTester: "Тестувальник",
  roleReviewer: "Рев'юер",
  roleExecutor: "Виконавець",
  roleSecurityAuditor: "Аудитор безпеки",
  orchestratorStructuredResultLabel: "Запросити структурований підсумок",
  orchestratorProfileLabel: "Профіль",
  orchestratorProfileSwitchError: "Не вдалося перемкнути профіль: {error}",
  profileManuscript: "Рукопис",
  profileDevelopment: "Розробка",
  profileFreeProject: "Вільний проект",
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
    "Přístup odepřen. Povolte InPrincipio → Poznámky v Nastavení systému → Soukromí → Automatizace.",
  appleNotesOnlyMac: "Poznámky Apple fungují jen na Macu.",
  loadAppleNoteFailed: "[poznámku se nepodařilo načíst: {error}]",
  editor: "Editor",
  editorLoading: "Načítání editoru…",
  backToAgents: "Agenti",
  simpleChatSidebarLabel: "Chat",
  limitFiveHour: "5 h",
  limitWeekly: "týden",
  limitUsed: "{label} {percent} %",
  limitUnavailable: "limity n/a",
  limitRefresh: "Obnovit limity Codex",
  settings: "Nastavení",
  settingsNav: "Sekce nastavení",
  settingsGeneral: "Obecné",
  settingsProjects: "Projekty",
  settingsProjectsHint:
    "Každý profil může mít vlastní připojenou cestu — Orchestrátor použije tu, která je právě aktivní. „Rukopis“ přijímá složku s kapitolami nebo jeden soubor; ostatní libovolnou složku nebo soubor.",
  settingsOrchestrator: "Orchestrátor",
  settingsOrchestratorHint:
    "Co se přednastaví při otevření panelu Orchestrátoru — tam ho lze pro konkrétní zprávu i změnit.",
  settingsJournal: "Deník akcí",
  settingsJournalHint:
    "Každá provedená a vrácená změna, ze všech chatů a projektů — ne jen uvnitř té zprávy, kde se to stalo.",
  journalFilterAll: "Vše",
  journalFilterFree: "Volný chat",
  journalEmpty: "Zatím žádné provedené změny.",
  projectPathLabel: "Cesta",
  projectPathNotSet: "Nepřipojeno",
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
  settingsChatArchive: "Archiv chatů",
  settingsChatArchiveHint:
    "Každý chat se také ukládá jako Markdown na disk — nejprve podle projektu (sdílená složka pro chaty bez připojeného projektu a samostatná pro každý profil), a uvnitř samostatná podsložka pro každý engine.",
  openFolder: "Otevřít složku",
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
  simpleChatPickEngine: "S kým chceš mluvit?",
  simpleChatSwitchAgent: "Změnit agenta",
  simpleChatComposerPlaceholder: "Zpráva",
  simpleChatEmpty: "Napiš něco pro začátek.",
  simpleChatWaiting: "Přemýšlí…",
  simpleChatSend: "Odeslat",
  orchestrator: "Orchestrátor",
  orchestratorHint:
    "Mluvíte s Orchestrátorem; ten spouští připojené agenty a sbírá jejich výsledky.",
  orchestratorSidebarPanel: "Orchestrátor",
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
  orchestratorSynthesize: "Udělat závěr",
  orchestratorSynthesizing: "Analyzuji odpovědi…",
  orchestratorSynthesisNeedTwo:
    "Ke srovnání jsou potřeba úspěšné odpovědi alespoň dvou agentů.",
  orchestratorSynthesisError: "Závěr se nepodařilo udělat: {error}",
  orchestratorModeLabel: "Práva",
  orchestratorModeNormal: "Běžný",
  orchestratorModePlan: "Plán",
  orchestratorModePropose: "Navrhnout změny",
  orchestratorModeFullAccess: "Plný přístup",
  orchestratorContextLabel: "Kontext",
  orchestratorContextProject: "Projekt",
  orchestratorContextFree: "Volný chat",
  orchestratorAgentsSelectLabel: "Zeptat se",
  orchestratorProjectRequired:
    "Nejdřív připojte projekt, nebo přepněte kontext na Volný chat.",
  orchestratorFullAccessWarningTitle: "Zapnout plný přístup?",
  orchestratorFullAccessWarningBodyProject:
    "V režimu Plný přístup Orchestrátor spouští skutečnou agentní relaci Claude Code v připojeném projektu. Může měnit soubory projektu a spouštět příkazy na tomto počítači — už to není jen pro čtení. Pokračujte jen pokud tomuto požadavku důvěřujete.",
  orchestratorFullAccessWarningBodyFree:
    "V režimu Plný přístup Orchestrátor spouští skutečnou agentní relaci Claude Code v pracovní složce volného chatu InPrincipio (ne v rukopisu). Může tam zapisovat soubory a spouštět příkazy na tomto počítači. Pokračujte jen pokud tomuto požadavku důvěřujete.",
  orchestratorFullAccessConfirm: "Zapnout plný přístup",
  orchestratorFullAccessCancel: "Zrušit",
  orchestratorFullAccessBannerProject:
    "Plný přístup je zapnutý — Orchestrátor může upravovat soubory projektu a spouštět příkazy na tomto počítači.",
  orchestratorFullAccessBannerFree:
    "Plný přístup je zapnutý — Orchestrátor může upravovat soubory ve složce volného chatu a spouštět příkazy na tomto počítači.",
  orchestratorSendFullAccess: "Odeslat s plným přístupem",
  orchestratorSendPlan: "Odeslat pro plán",
  orchestratorSendPropose: "Odeslat návrh",
  orchestratorSendFree: "Odeslat (volný chat)",
  orchestratorFullAccessWaiting: "Agent s plným přístupem pracuje…",
  orchestratorFullAccessError: "Agent s plným přístupem selhal: {error}",
  orchestratorPlanWaiting: "Plánuji…",
  orchestratorPlanPreface: "Plán",
  orchestratorPlanError: "Plánovací agent selhal: {error}",
  orchestratorProposeWaiting: "Připravuji návrh…",
  orchestratorProposeError: "Agent návrhů selhal: {error}",
  orchestratorProposalApply: "Použít",
  orchestratorProposalReject: "Odmítnout",
  orchestratorProposalApplying: "Používám…",
  orchestratorProposalApplied: "Použito",
  orchestratorProposalRejected: "Odmítnuto",
  orchestratorProposalRollback: "Vrátit zpět",
  orchestratorProposalRollingBack: "Vracím…",
  orchestratorProposalRolledBack: "Vráceno",
  orchestratorProposalApplyError: "Nepodařilo se použít: {error}",
  orchestratorProposalRollbackError: "Nepodařilo se vrátit: {error}",
  orchestratorAttachFile: "Připojit soubor",
  orchestratorAttachFilePicker: "Připojit soubor projektu",
  orchestratorAttachFileEmpty: "V tomto projektu nejsou žádné dokumenty",
  orchestratorAttachFileManuscript: "Rukopis",
  orchestratorAttachFilePlanning: "Plánování",
  orchestratorRemoveAttachment: "Odebrat přílohu",
  orchestratorRoleLabel: "Role",
  orchestratorRoleNone: "Bez role",
  roleSceneAuthor: "Autor scény",
  roleStyleEditor: "Redaktor stylu",
  roleCanonChecker: "Kontrola kánonu",
  rolePsychologyChecker: "Kontrola psychologie",
  roleHistoricalAccuracyChecker: "Kontrola historické věrohodnosti",
  roleContinuityEditor: "Editor kontinuity",
  roleFinalLiteraryEditor: "Finální literární redaktor",
  roleCodeResearcher: "Průzkumník kódu",
  roleArchitect: "Architekt",
  roleTester: "Tester",
  roleReviewer: "Recenzent",
  roleExecutor: "Vykonavatel",
  roleSecurityAuditor: "Bezpečnostní auditor",
  orchestratorStructuredResultLabel: "Požádat o strukturované shrnutí",
  orchestratorProfileLabel: "Profil",
  orchestratorProfileSwitchError: "Nepodařilo se přepnout profil: {error}",
  profileManuscript: "Rukopis",
  profileDevelopment: "Vývoj",
  profileFreeProject: "Volný projekt",
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
