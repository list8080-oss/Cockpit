import type { Locale } from "./i18n";

export type ChangelogEntry = {
  version: string;
  date: string;
  notes: Record<Locale, string>;
};

/** Newest first. Keep in sync with public GitHub Releases notes. */
export const CHANGELOG: ChangelogEntry[] = [
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
