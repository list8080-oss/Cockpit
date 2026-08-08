import type { Locale } from "./i18n";

export type ChangelogEntry = {
  version: string;
  date: string;
  notes: Record<Locale, string>;
};

/** Newest first. Keep in sync with public GitHub Releases notes. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.3.15",
    date: "2026-08-08",
    notes: {
      en: "The History delete button now looks like a macOS close dot in the corner instead of a text ×.",
      ru: "Кнопка удаления в «Истории» теперь выглядит как красная точка-крестик macOS в углу, а не текстовый «×».",
      uk: "Кнопка видалення в «Історії» тепер виглядає як червона крапка-хрестик macOS у кутку, а не текстовий «×».",
      cs: "Tlačítko smazání v Historii nyní vypadá jako červená tečka macOS v rohu místo textového „×“.",
    },
  },
  {
    version: "0.3.14",
    date: "2026-08-08",
    notes: {
      en: "Each item in the History panel now has a delete button (with a confirmation) to remove conversations you no longer need.",
      ru: "У каждого пункта в панели «История» появилась кнопка удаления (с подтверждением) — можно убрать ненужные обсуждения.",
      uk: "У кожного пункту в панелі «Історія» з'явилася кнопка видалення (з підтвердженням) — можна прибрати непотрібні обговорення.",
      cs: "Každá položka v panelu Historie má nyní tlačítko pro smazání (s potvrzením) — nepotřebné konverzace lze odstranit.",
    },
  },
  {
    version: "0.3.13",
    date: "2026-08-08",
    notes: {
      en: "Fixed a bug where a fast double-click on Reply could lose that reply entirely, and each column now auto-scrolls to the newest message.",
      ru: "Исправлен баг, из-за которого быстрый двойной клик по «Ответить» мог полностью потерять ответ; каждая колонка теперь автоматически прокручивается к новому сообщению.",
      uk: "Виправлено баг, через який швидкий подвійний клік по «Відповісти» міг повністю загубити відповідь; кожна колонка тепер автоматично прокручується до нового повідомлення.",
      cs: "Opravena chyba, kdy rychlé dvojité kliknutí na Odpovědět mohlo odpověď zcela ztratit; každý sloupec se nyní automaticky posouvá na nejnovější zprávu.",
    },
  },
  {
    version: "0.3.12",
    date: "2026-08-08",
    notes: {
      en: "Agent conversations no longer disappear when you close the app. A new History panel in the sidebar lists past comparisons by name — open one to keep replying in the same context, not from scratch.",
      ru: "Переписка с агентами больше не пропадает при закрытии приложения. Новая панель «История» в сайдбаре показывает прошлые обсуждения по названию — открой и продолжай отвечать в том же контексте, а не с нуля.",
      uk: "Листування з агентами більше не зникає при закритті застосунку. Нова панель «Історія» в бічній панелі показує минулі обговорення за назвою — відкрий і продовжуй відповідати в тому самому контексті, а не з нуля.",
      cs: "Konverzace s agenty už při zavření aplikace nezmizí. Nový panel Historie v postranním panelu zobrazuje předchozí porovnání podle názvu — otevřete a pokračujte ve stejném kontextu, ne od nuly.",
    },
  },
  {
    version: "0.3.11",
    date: "2026-08-08",
    notes: {
      en: "Fixed: continuing a conversation used to replace the earlier reply. Each column now keeps the full back-and-forth (agent reply, your follow-up, next reply) instead of losing it.",
      ru: "Исправлено: при продолжении диалога предыдущий ответ пропадал. Теперь в колонке видна вся переписка (ответ агента, твоя реплика, следующий ответ), а не только последняя.",
      uk: "Виправлено: під час продовження діалогу попередня відповідь зникала. Тепер у колонці видно всю переписку (відповідь агента, твоя репліка, наступна відповідь), а не лише останню.",
      cs: "Opraveno: při pokračování konverzace předchozí odpověď zmizela. Sloupec nyní ukazuje celou výměnu (odpověď agenta, vaši repliku, další odpověď) místo jen té poslední.",
    },
  },
  {
    version: "0.3.10",
    date: "2026-08-08",
    notes: {
      en: "Each engine column now has its own reply box — when an agent asks a follow-up question, you can answer it directly and it continues that same conversation instead of starting cold.",
      ru: "У каждой колонки теперь своё поле для ответа — если агент задал уточняющий вопрос, можно ответить прямо там, и разговор продолжится в контексте, а не с чистого листа.",
      uk: "У кожної колонки тепер є своє поле для відповіді — якщо агент поставив уточнювальне питання, можна відповісти прямо там, і розмова продовжиться в контексті, а не з чистого аркуша.",
      cs: "Každý sloupec má nyní vlastní pole pro odpověď — když agent položí doplňující otázku, můžete odpovědět přímo tam a konverzace pokračuje v kontextu místo od nuly.",
    },
  },
  {
    version: "0.3.9",
    date: "2026-08-08",
    notes: {
      en: "Fixed a leftover label (Cursor column now says \"Cursor (plan)\") and a silent-failure bug: Claude/Cursor occasionally report success with an empty reply — now shown as a retryable error instead of a blank result.",
      ru: "Исправлена забытая подпись (колонка Cursor теперь верно показывает «Cursor (plan)») и баг с тихим сбоем: Claude/Cursor иногда сообщают об успехе с пустым ответом — теперь это показывается как ошибка с возможностью повторить, а не пустой результат.",
      uk: "Виправлено застарілий підпис (колонка Cursor тепер показує «Cursor (plan)») і баг із тихим збоєм: Claude/Cursor іноді повідомляють про успіх із порожньою відповіддю — тепер це показується як помилка з можливістю повторити, а не порожній результат.",
      cs: "Opraven zastaralý popisek (sloupec Cursor nyní zobrazuje „Cursor (plan)“) a chyba s tichým selháním: Claude/Cursor občas hlásí úspěch s prázdnou odpovědí — nyní se to zobrazí jako chyba s možností opakování místo prázdného výsledku.",
    },
  },
  {
    version: "0.3.8",
    date: "2026-08-08",
    notes: {
      en: "New Apple Notes sidebar panel (read-only: pick a folder and a note, its text goes into the agents prompt). Cursor engine now answers in plan mode for more thorough replies.",
      ru: "Новая панель «Заметки Apple» в сайдбаре (только чтение: выбери папку и заметку — текст попадёт в поле для агентов). Cursor теперь отвечает в режиме plan для более развёрнутых ответов.",
      uk: "Нова панель «Нотатки Apple» в бічній панелі (лише читання: обери теку й нотатку — текст потрапить у поле для агентів). Cursor тепер відповідає в режимі plan для розлогіших відповідей.",
      cs: "Nový panel „Poznámky Apple“ v postranním panelu (jen ke čtení: vyber složku a poznámku — text se vloží do pole pro agenty). Cursor nyní odpovídá v režimu plan pro podrobnější odpovědi.",
    },
  },
  {
    version: "0.3.7",
    date: "2026-08-08",
    notes: {
      en: "Spell-check dictionaries are no longer bundled — download only the languages you need in Settings > Dictionaries.",
      ru: "Словари орфографии больше не встроены в приложение — скачивай только нужные языки в Настройки > Словари.",
      uk: "Словники орфографії більше не вбудовані в застосунок — завантажуй лише потрібні мови в Налаштування > Словники.",
      cs: "Slovníky pro kontrolu pravopisu už nejsou součástí instalace — stáhněte si jen potřebné jazyky v Nastavení > Slovníky.",
    },
  },
  {
    version: "0.3.6",
    date: "2026-08-08",
    notes: {
      en: "Writing editor toolbar and UI fully localized (en/ru/uk/cs).",
      ru: "Панель инструментов и интерфейс редактора полностью локализованы (en/ru/uk/cs).",
      uk: "Панель інструментів і інтерфейс редактора повністю локалізовані (en/ru/uk/cs).",
      cs: "Panel nástrojů a rozhraní editoru jsou plně lokalizovány (en/ru/uk/cs).",
    },
  },
  {
    version: "0.3.5",
    date: "2026-08-08",
    notes: {
      en: "Real writing editor in Editor mode (markdown, images, spellcheck, version history), Normal/Night/Book appearance modes, and a Codex usage-limit indicator.",
      ru: "Полноценный текстовый редактор в режиме «Редактор» (markdown, картинки, проверка орфографии, история версий), режимы оформления Обычный/Ночь/Книга и индикатор лимита Codex.",
      uk: "Повноцінний текстовий редактор у режимі «Редактор» (markdown, зображення, перевірка орфографії, історія версій), режими оформлення Звичайний/Ніч/Книга та індикатор ліміту Codex.",
      cs: "Plnohodnotný textový editor v režimu Editor (markdown, obrázky, kontrola pravopisu, historie verzí), vzhledy Normální/Noc/Kniha a ukazatel limitu Codexu.",
    },
  },
  {
    version: "0.3.4",
    date: "2026-08-08",
    notes: {
      en: "Manuscript folder is now configurable in Settings > Manuscript (choose any folder — nothing is hardcoded anymore).",
      ru: "Папка рукописи теперь настраивается в Настройки > Рукопись (можно выбрать любую папку — больше ничего не зашито в коде).",
      uk: "Тека рукопису тепер налаштовується в Налаштування > Рукопис (можна обрати будь-яку теку — більше нічого не зашито в коді).",
      cs: "Složku rukopisu lze nyní nastavit v Nastavení > Rukopis (lze vybrat libovolnou složku — nic už není napevno v kódu).",
    },
  },
  {
    version: "0.3.3",
    date: "2026-08-08",
    notes: {
      en: "Sidebar split into collapsible Notes and Editor panels (Editor is a local scratch pad for now).",
      ru: "Сайдбар разделён на сворачиваемые панели Заметки и Редактор (Редактор пока — локальный черновик).",
      uk: "Бічну панель розділено на Нотатки й Редактор, що згортаються (Редактор поки — локальна чернетка).",
      cs: "Postranní panel rozdělen na sbalitelné panely Poznámky a Editor (Editor je zatím místní koncept).",
    },
  },
  {
    version: "0.3.2",
    date: "2026-08-08",
    notes: {
      en: "GitHub chip shows your real account name, Settings reorganized into General/Updates/Agents tabs.",
      ru: "Чип GitHub теперь показывает настоящее имя аккаунта, Настройки разложены на вкладки Общие/Обновления/Агенты.",
      uk: "Чип GitHub тепер показує справжнє ім'я акаунта, Налаштування розкладені на вкладки Загальні/Оновлення/Агенти.",
      cs: "Čip GitHub nyní zobrazuje skutečné jméno účtu, Nastavení jsou rozdělena na karty Obecné/Aktualizace/Agenti.",
    },
  },
  {
    version: "0.3.1",
    date: "2026-08-08",
    notes: {
      en: "Fixed GitHub sign-in/out getting stuck: the Terminal window now comes to the front, and a retry clears any earlier stuck attempt instead of piling up.",
      ru: "Починен вход/выход из GitHub: окно Terminal теперь выходит на передний план, а повторная попытка убирает зависшую предыдущую вместо накопления.",
      uk: "Виправлено вхід/вихід з GitHub: вікно Terminal тепер виходить на передній план, а повторна спроба прибирає завислу попередню замість накопичення.",
      cs: "Opravena zaseknutá přihlášení/odhlášení GitHub: okno Terminalu se nyní dostane do popředí a opakovaný pokus zruší předchozí zaseknutý proces.",
    },
  },
  {
    version: "0.3.0",
    date: "2026-08-08",
    notes: {
      en: "Readiness lamps above each engine column, sign-in/out moved to Settings > Agents, compact GitHub icon, and localized version history.",
      ru: "Лампочки готовности над каждой колонкой, вход/выход перенесён в Настройки > Агенты, компактная иконка GitHub, локализованная история версий.",
      uk: "Лампочки готовності над кожною колонкою, вхід/вихід перенесено в Налаштування > Агенти, компактна іконка GitHub, локалізована історія версій.",
      cs: "Kontrolky připravenosti nad každým sloupcem, přihlášení/odhlášení přesunuto do Nastavení > Agenti, kompaktní ikona GitHub a lokalizovaná historie verzí.",
    },
  },
  {
    version: "0.2.1",
    date: "2026-08-08",
    notes: {
      en: "Renamed to Cockpit (neutral public name).",
      ru: "Переименовано в Cockpit (нейтральное публичное название).",
      uk: "Перейменовано на Cockpit (нейтральна публічна назва).",
      cs: "Přejmenováno na Cockpit (neutrální veřejný název).",
    },
  },
  {
    version: "0.2.0",
    date: "2026-08-08",
    notes: {
      en: "Added Cursor as a third engine, per-service sign-in status, and UI language settings (en/ru/uk/cs).",
      ru: "Добавлен Cursor как третий движок, статусы входа для каждого сервиса, настройки языка интерфейса (en/ru/uk/cs).",
      uk: "Додано Cursor як третій рушій, статуси входу для кожного сервісу, налаштування мови інтерфейсу (en/ru/uk/cs).",
      cs: "Přidán Cursor jako třetí engine, stavy přihlášení u každé služby a nastavení jazyka rozhraní (en/ru/uk/cs).",
    },
  },
  {
    version: "0.1.1",
    date: "2026-08-08",
    notes: {
      en: "First public Cockpit release with Claude and Codex comparison.",
      ru: "Первый публичный релиз: сравнение Claude и Codex.",
      uk: "Перший публічний реліз: порівняння Claude і Codex.",
      cs: "První veřejné vydání: porovnání Claude a Codex.",
    },
  },
];

export function noteFor(entry: ChangelogEntry, locale: Locale): string {
  return entry.notes[locale] ?? entry.notes.en;
}
