import type { Locale } from "./i18n";

export type ChangelogEntry = {
  version: string;
  date: string;
  notes: Record<Locale, string>;
};

/** Newest first. Keep in sync with public GitHub Releases notes. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.2",
    date: "2026-08-11",
    notes: {
      en: "Settings: the three separate \"Manuscript\" / \"Development\" / \"Free project\" sections are now one \"Projects\" section listing every profile with its own connected path — clearer, and it scales to future profiles without adding new settings pages each time.",
      ru: "Настройки: три отдельных раздела «Рукопись» / «Разработка» / «Свободный проект» теперь один раздел «Проекты» со списком всех профилей и их подключёнными путями — понятнее, и не потребует новой страницы настроек при каждом будущем профиле.",
      uk: "Налаштування: три окремі розділи «Рукопис» / «Розробка» / «Вільний проєкт» тепер один розділ «Проєкти» зі списком усіх профілів та їхніми підключеними шляхами — зрозуміліше, і не потребуватиме нової сторінки налаштувань під кожен майбутній профіль.",
      cs: "Nastavení: tři samostatné sekce „Rukopis“ / „Vývoj“ / „Volný projekt“ jsou nyní jedna sekce „Projekty“ se seznamem všech profilů a jejich připojenými cestami — přehlednější a nevyžaduje novou stránku nastavení pro každý budoucí profil.",
    },
  },
  {
    version: "0.4.1",
    date: "2026-08-11",
    notes: {
      en: "Renamed to InPrincipio (new name, new icon) — the previous name collided with several existing products. Major update since 0.3.27: three project profiles (Manuscript, Development, Free project) with a real switcher and their own connected folders; configurable agent roles for the normal fan-out; an opt-in structured self-assessment agents can attach to their replies; a new \"Propose changes\" mode that shows a diff before anything is written, plus \"Apply\" with a journal and rollback; and \"Plan\" mode for read-only investigation including delegating to sibling CLIs.",
      ru: "Переименовано в InPrincipio (новое имя, новая иконка) — прежнее название пересекалось с несколькими существующими продуктами. Крупное обновление с версии 0.3.27: три профиля проекта (Рукопись, Разработка, Свободный проект) с реальным переключателем и собственной подключённой папкой у каждого; настраиваемые роли агентов для обычного фан-аута; опциональная структурированная самооценка, которую агенты могут прикладывать к ответу; новый режим «Предложить изменения», показывающий diff перед тем, как что-либо записано, плюс «Применить» с журналом и откатом; и режим «План» для read-only исследования, включая делегирование другим CLI.",
      uk: "Перейменовано на InPrincipio (нова назва, нова іконка) — попередня назва перетиналася з кількома наявними продуктами. Велике оновлення з версії 0.3.27: три профілі проєкту (Рукопис, Розробка, Вільний проєкт) із реальним перемикачем і власною підключеною папкою в кожного; настроювані ролі агентів для звичайного фан-ауту; опційна структурована самооцінка, яку агенти можуть додавати до відповіді; новий режим «Запропонувати зміни», що показує diff перед тим, як щось записано, плюс «Застосувати» з журналом і відкатом; і режим «План» для read-only дослідження, включно з делегуванням іншим CLI.",
      cs: "Přejmenováno na InPrincipio (nový název, nová ikona) — předchozí název kolidoval s několika existujícími produkty. Velká aktualizace od verze 0.3.27: tři profily projektu (Rukopis, Vývoj, Volný projekt) se skutečným přepínačem a vlastní připojenou složkou u každého; konfigurovatelné role agentů pro běžný fan-out; volitelné strukturované sebehodnocení, které agenti mohou připojit k odpovědi; nový režim „Navrhnout změny“, který před jakýmkoli zápisem zobrazí diff, plus „Použít“ s deníkem a možností vrátit zpět; a režim „Plán“ pro read-only zkoumání včetně delegování na sesterská CLI.",
    },
  },
  {
    version: "0.3.27",
    date: "2026-08-09",
    notes: {
      en: "Orchestrator: a \"Make a conclusion\" button now asks Claude to actually compare the agents' replies and give a verdict. New \"Full access\" mode (off by default, requires confirmation, never persisted) lets the Orchestrator run a real Claude Code agent session that can edit manuscript files and run shell commands on this computer — a deliberate, clearly-marked exception to this app's normal read-only behavior.",
      ru: "Оркестратор: кнопка «Сделать вывод» теперь реально просит Claude сравнить ответы агентов и дать заключение. Новый режим «Полный доступ» (по умолчанию выключен, требует подтверждения, никогда не сохраняется) позволяет Оркестратору запускать настоящую агентную сессию Claude Code, которая может править файлы рукописи и выполнять команды на этом компьютере — осознанное, явно помеченное исключение из обычного read-only поведения приложения.",
      uk: "Оркестратор: кнопка «Зробити висновок» тепер справді просить Claude порівняти відповіді агентів і дати висновок. Новий режим «Повний доступ» (вимкнений за замовчуванням, потребує підтвердження, ніколи не зберігається) дозволяє Оркестратору запускати справжню агентну сесію Claude Code, яка може редагувати файли рукопису й виконувати команди на цьому комп'ютері — свідомий, явно позначений виняток зі звичайної read-only поведінки застосунку.",
      cs: "Orchestrátor: tlačítko „Udělat závěr“ nyní skutečně požádá Claude o porovnání odpovědí agentů a vynesení verdiktu. Nový režim „Plný přístup“ (ve výchozím stavu vypnutý, vyžaduje potvrzení, nikdy se neukládá) umožňuje Orchestrátoru spustit skutečnou agentní relaci Claude Code, která může upravovat soubory rukopisu a spouštět příkazy na tomto počítači — záměrná, jasně označená výjimka z běžného read-only chování aplikace.",
    },
  },
  {
    version: "0.3.26",
    date: "2026-08-09",
    notes: {
      en: "Orchestrator layout polish: full-width title banner, agents shown as a horizontal row below a roomier main chat instead of a squeezed column.",
      ru: "Доработка раскладки Оркестратора: заголовок стал полноширинным баннером, агенты показаны горизонтальным рядом под более просторным главным чатом вместо сжатой колонки.",
      uk: "Доопрацювання розкладки Оркестратора: заголовок став повношириним банером, агенти показані горизонтальним рядом під просторнішим головним чатом замість стиснутої колонки.",
      cs: "Vylepšení rozvržení Orchestrátoru: nadpis je nyní banner přes celou šířku, agenti jsou zobrazeni v horizontální řadě pod prostornějším hlavním chatem místo stísněného sloupce.",
    },
  },
  {
    version: "0.3.25",
    date: "2026-08-09",
    notes: {
      en: "New: Orchestrator — a single main chat that dispatches your request to Claude, Codex, Cursor and OpenCode and shows their status in compact panels below (no AI summary yet, that's next). Each agent's own reply, history and session resume still work exactly as before inside its panel.",
      ru: "Новое: Оркестратор — единый главный чат, который передаёт запрос Claude, Codex, Cursor и OpenCode и показывает их статус в компактных панелях снизу (без AI-синтеза ответов — это будет следующим шагом). Собственный ответ, история и продолжение сессии каждого агента по-прежнему работают как раньше внутри его панели.",
      uk: "Нове: Оркестратор — єдиний головний чат, який передає запит Claude, Codex, Cursor і OpenCode та показує їхній статус у компактних панелях знизу (без AI-синтезу відповідей — це буде наступним кроком). Власна відповідь, історія і продовження сесії кожного агента, як і раніше, працюють усередині його панелі.",
      cs: "Nové: Orchestrátor — jeden hlavní chat, který předá požadavek Claude, Codex, Cursor a OpenCode a zobrazí jejich stav v kompaktních panelech níže (zatím bez AI syntézy odpovědí — to bude další krok). Vlastní odpověď, historie i pokračování relace každého agenta stále fungují jako dřív uvnitř jeho panelu.",
    },
  },
  {
    version: "0.3.24",
    date: "2026-08-09",
    notes: {
      en: "Claude and Cursor now show the real reason for a failed turn (e.g. \"out of usage credits\" for a specific model) instead of a bare exit status — same fix already applied to Codex earlier.",
      ru: "Claude и Cursor теперь показывают настоящую причину сбоя (например, «закончились кредиты» у конкретной модели) вместо голого кода выхода — тот же фикс, что раньше сделали для Codex.",
      uk: "Claude і Cursor тепер показують справжню причину збою (наприклад, «закінчилися кредити» для конкретної моделі) замість голого коду виходу — те саме виправлення, що раніше зробили для Codex.",
      cs: "Claude a Cursor nyní zobrazují skutečný důvod selhání (např. „došly kredity“ u konkrétního modelu) místo holého stavového kódu — stejná oprava, jakou jsme dřív udělali pro Codex.",
    },
  },
  {
    version: "0.3.23",
    date: "2026-08-09",
    notes: {
      en: "Fixed: an OpenCode model chosen before the free-only restriction stayed selected and would have run anyway. Non-free saved choices now reset to Default automatically.",
      ru: "Исправлено: модель OpenCode, выбранная до ограничения на бесплатные, оставалась выбранной и всё равно запустилась бы. Небесплатный сохранённый выбор теперь сам сбрасывается на «По умолчанию».",
      uk: "Виправлено: модель OpenCode, обрана до обмеження на безкоштовні, лишалася обраною і всупереч усьому запустилася б. Платний збережений вибір тепер сам скидається на «За замовчуванням».",
      cs: "Opraveno: model OpenCode zvolený před omezením na bezplatné zůstal vybraný a stejně by se spustil. Neplacená uložená volba se nyní sama vrátí na Výchozí.",
    },
  },
  {
    version: "0.3.22",
    date: "2026-08-09",
    notes: {
      en: "OpenCode's model list now shows only free OpenCode Zen models — a paid one can never run by accident, including when left on Default.",
      ru: "Список моделей OpenCode теперь показывает только бесплатные модели OpenCode Zen — платная не запустится случайно, даже если оставить «По умолчанию».",
      uk: "Список моделей OpenCode тепер показує лише безкоштовні моделі OpenCode Zen — платна не запуститься випадково, навіть якщо залишити «За замовчуванням».",
      cs: "Seznam modelů OpenCode nyní zobrazuje jen bezplatné modely OpenCode Zen — placený se nikdy nespustí omylem, ani při ponechání na Výchozí.",
    },
  },
  {
    version: "0.3.21",
    date: "2026-08-09",
    notes: {
      en: "OpenCode joins as a fourth engine (read-only plan mode, verified by testing that it actually refuses to write files). Sign in, model, and reasoning effort all work the same way as the other three.",
      ru: "OpenCode добавлен как четвёртый движок (read-only режим plan, проверено на деле — он реально отказывается писать файлы). Вход, модель и уровень рассуждения работают так же, как у остальных трёх.",
      uk: "OpenCode доданий як четвертий рушій (read-only режим plan, перевірено на практиці — він справді відмовляється писати файли). Вхід, модель і рівень міркування працюють так само, як у решти трьох.",
      cs: "OpenCode přibyl jako čtvrtý engine (read-only režim plan, ověřeno v praxi — skutečně odmítá zapisovat soubory). Přihlášení, model i úroveň uvažování fungují stejně jako u ostatních tří.",
    },
  },
  {
    version: "0.3.20",
    date: "2026-08-09",
    notes: {
      en: "Model lists are now real, not guessed: Cursor's model picker is fetched live from cursor-agent itself (its full catalog), and Codex now offers its actual 5 models instead of just one.",
      ru: "Списки моделей теперь настоящие, а не придуманные: список моделей Cursor подтягивается напрямую из cursor-agent (весь его каталог), а у Codex теперь доступны все 5 реальных моделей вместо одной.",
      uk: "Списки моделей тепер справжні, а не вигадані: список моделей Cursor підтягується напряму з cursor-agent (весь його каталог), а в Codex тепер доступні всі 5 реальних моделей замість однієї.",
      cs: "Seznamy modelů jsou nyní skutečné, ne vymyšlené: seznam modelů Cursor se načítá přímo z cursor-agent (celý jeho katalog) a Codex nyní nabízí všech 5 skutečných modelů místo jednoho.",
    },
  },
  {
    version: "0.3.19",
    date: "2026-08-09",
    notes: {
      en: "The model/effort chip above each column is now a dropdown — change model and reasoning effort right there, no need to open Settings.",
      ru: "Чип модели/уровня над каждой колонкой теперь выпадающий список — можно менять модель и уровень рассуждения прямо там, без захода в Настройки.",
      uk: "Чип моделі/рівня над кожною колонкою тепер випадний список — можна змінювати модель і рівень міркування прямо там, без заходу в Налаштування.",
      cs: "Čip modelu/úrovně nad každým sloupcem je nyní rozbalovací seznam — model a úroveň uvažování lze měnit přímo tam, bez otevírání Nastavení.",
    },
  },
  {
    version: "0.3.18",
    date: "2026-08-09",
    notes: {
      en: "New Settings > Agents section: per-engine model and reasoning-effort overrides (Claude and Codex get an effort level; all three get a model choice). Leave on Default to keep the current behavior.",
      ru: "Новый раздел в Настройки → Агенты: модель и уровень рассуждения по каждому движку (у Claude и Codex — свой уровень; у всех трёх — выбор модели). Оставь «По умолчанию», если ничего менять не нужно.",
      uk: "Новий розділ у Налаштування → Агенти: модель і рівень міркування для кожного рушія (у Claude і Codex — свій рівень; у всіх трьох — вибір моделі). Залиш «За замовчуванням», якщо нічого міняти не треба.",
      cs: "Nová sekce v Nastavení → Agenti: model a úroveň uvažování pro každý engine (Claude a Codex mají úroveň; všechny tři mají výběr modelu). Ponechte na Výchozí, pokud nic měnit nechcete.",
    },
  },
  {
    version: "0.3.17",
    date: "2026-08-09",
    notes: {
      en: "The GitHub chip now shows your avatar — click it to open your GitHub profile in the browser; the rest of the chip still opens the sign-in menu.",
      ru: "Чип GitHub теперь показывает твой аватар — клик по нему открывает профиль на GitHub в браузере; остальная часть чипа по-прежнему открывает меню входа.",
      uk: "Чип GitHub тепер показує твій аватар — клік по ньому відкриває профіль на GitHub у браузері; решта чипа, як і раніше, відкриває меню входу.",
      cs: "Čip GitHub nyní zobrazuje váš avatar — kliknutím otevřete profil na GitHubu v prohlížeči; zbytek čipu stále otevírá přihlašovací menu.",
    },
  },
  {
    version: "0.3.16",
    date: "2026-08-09",
    notes: {
      en: "The Notes panel is now Project: connect a folder OR a single manuscript file (whichever fits how you write), and disconnect it anytime without touching anything on disk.",
      ru: "Панель «Заметки» стала «Проект»: можно подключить папку ИЛИ один файл рукописи (смотря как ты пишешь), а отключить — в любой момент, ничего не удаляя с диска.",
      uk: "Панель «Нотатки» стала «Проєкт»: можна підключити теку АБО один файл рукопису (залежно від того, як ти пишеш), а відключити — будь-коли, нічого не видаляючи з диска.",
      cs: "Panel Poznámky je nyní Projekt: připojte složku NEBO jeden soubor rukopisu (podle toho, jak píšete), a kdykoli jej odpojte, aniž by se cokoli na disku smazalo.",
    },
  },
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
