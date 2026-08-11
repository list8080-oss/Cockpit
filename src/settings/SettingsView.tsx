import { useState } from "react";
import {
  LOCALES,
  isLocale,
  t,
  type Locale,
} from "../i18n";
import {
  THEMES,
  isTheme,
  type Theme,
} from "../theme";
import { CHANGELOG, noteFor } from "../changelog";
import { useAppUpdate } from "../updates/UpdateBar";
import { authStatusLabel } from "../sidebar/GithubChip";
import type { AuthStatus } from "../authTypes";
import type { AgentOption } from "../agentSettings";
import {
  CLAUDE_MODEL_OPTIONS,
  CLAUDE_EFFORT_OPTIONS,
  CODEX_MODEL_OPTIONS,
  CODEX_EFFORT_OPTIONS,
  OPENCODE_EFFORT_OPTIONS,
} from "../agentSettings";
import { profileLabel, type ProjectProfile } from "../profiles";

export type SettingsSection =
  | "general"
  | "projects"
  | "dictionaries"
  | "updates"
  | "agents";

export interface DictionaryStatus {
  lang: string;
  installed: boolean;
}

const DICTIONARY_LABELS: Record<string, string> = {
  en: "English",
  ru: "Русский",
  uk: "Українська",
  cs: "Čeština",
};

function themeLabel(locale: Locale, theme: Theme): string {
  switch (theme) {
    case "normal":
      return t(locale, "themeNormal");
    case "night":
      return t(locale, "themeNight");
    case "book":
      return t(locale, "themeBook");
  }
}

export function SettingsView({
  locale,
  onLocaleChange,
  theme,
  onThemeChange,
  onBack,
  agentAuths,
  authLoading,
  authMessage,
  onRefreshAuth,
  onSignIn,
  onSignOut,
  availableProfiles,
  projectPaths,
  projectMessages,
  onChooseProjectFolder,
  onChooseProjectFile,
  onDisconnectProject,
  dictionaries,
  dictionaryBusy,
  onDownloadDictionary,
  onDeleteDictionary,
  claudeModel,
  onClaudeModelChange,
  claudeEffort,
  onClaudeEffortChange,
  codexModel,
  onCodexModelChange,
  codexEffort,
  onCodexEffortChange,
  cursorModel,
  onCursorModelChange,
  cursorModelOptions,
  opencodeModel,
  onOpencodeModelChange,
  opencodeModelOptions,
  opencodeEffort,
  onOpencodeEffortChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onBack: () => void;
  agentAuths: AuthStatus[];
  authLoading: boolean;
  authMessage: string | null;
  onRefreshAuth: () => void;
  onSignIn: (provider: string) => void;
  onSignOut: (provider: string) => void;
  availableProfiles: ProjectProfile[];
  projectPaths: Record<string, string | null>;
  projectMessages: Record<string, string | null>;
  onChooseProjectFolder: (profileId: string) => void;
  onChooseProjectFile: (profileId: string) => void;
  onDisconnectProject: (profileId: string) => void;
  dictionaries: DictionaryStatus[];
  dictionaryBusy: string | null;
  claudeModel: string;
  onClaudeModelChange: (v: string) => void;
  claudeEffort: string;
  onClaudeEffortChange: (v: string) => void;
  codexModel: string;
  onCodexModelChange: (v: string) => void;
  codexEffort: string;
  onCodexEffortChange: (v: string) => void;
  cursorModel: string;
  onCursorModelChange: (v: string) => void;
  cursorModelOptions: AgentOption[];
  opencodeModel: string;
  onOpencodeModelChange: (v: string) => void;
  opencodeModelOptions: AgentOption[];
  opencodeEffort: string;
  onOpencodeEffortChange: (v: string) => void;
  onDownloadDictionary: (lang: string) => void;
  onDeleteDictionary: (lang: string) => void;
}) {
  const [section, setSection] = useState<SettingsSection>("general");
  const {
    version,
    busy: updateBusy,
    statusText: updateStatus,
    isError: updateError,
    run: checkUpdate,
  } = useAppUpdate(locale);

  const navItems: { id: SettingsSection; label: string }[] = [
    { id: "general", label: t(locale, "settingsGeneral") },
    { id: "projects", label: t(locale, "settingsProjects") },
    { id: "dictionaries", label: t(locale, "settingsDictionaries") },
    { id: "updates", label: t(locale, "settingsUpdates") },
    { id: "agents", label: t(locale, "settingsAgents") },
  ];

  return (
    <div className="settings">
      <aside className="settings-sidebar">
        <button type="button" className="settings-back" onClick={onBack}>
          ← {t(locale, "backToWorkspace")}
        </button>
        <h1>{t(locale, "settings")}</h1>
        <nav className="settings-nav" aria-label={t(locale, "settingsNav")}>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                section === item.id
                  ? "settings-nav-item settings-nav-item-active"
                  : "settings-nav-item"
              }
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="settings-panel">
        {section === "general" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsGeneral")}</h2>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "language")}</div>
                <div className="settings-hint">{t(locale, "languageHint")}</div>
              </div>
              <select
                className="settings-select"
                value={locale}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isLocale(next)) onLocaleChange(next);
                }}
                aria-label={t(locale, "language")}
              >
                {LOCALES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "appearance")}</div>
                <div className="settings-hint">{t(locale, "appearanceHint")}</div>
              </div>
              <select
                className="settings-select"
                value={theme}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isTheme(next)) onThemeChange(next);
                }}
                aria-label={t(locale, "appearance")}
              >
                {THEMES.map((id) => (
                  <option key={id} value={id}>
                    {themeLabel(locale, id)}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {section === "projects" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsProjects")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsProjectsHint")}
            </p>
            {availableProfiles.map((profile) => (
              <div className="settings-row" key={profile.id}>
                <div className="settings-row-text">
                  <div className="settings-label">{profileLabel(locale, profile.id)}</div>
                  <div className="settings-hint">
                    {t(locale, "projectPathLabel")}:{" "}
                    {projectPaths[profile.id] || t(locale, "projectPathNotSet")}
                  </div>
                  {projectMessages[profile.id] && (
                    <div className="settings-hint">{projectMessages[profile.id]}</div>
                  )}
                </div>
                <div className="settings-row-actions">
                  <button
                    type="button"
                    className="auth-action-btn"
                    onClick={() => onChooseProjectFolder(profile.id)}
                  >
                    {t(locale, "chooseFolder")}
                  </button>
                  <button
                    type="button"
                    className="auth-action-btn"
                    onClick={() => onChooseProjectFile(profile.id)}
                  >
                    {t(locale, "chooseFile")}
                  </button>
                  {projectPaths[profile.id] && (
                    <button
                      type="button"
                      className="auth-action-btn"
                      onClick={() => onDisconnectProject(profile.id)}
                    >
                      {t(locale, "projectDisconnect")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {section === "dictionaries" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsDictionaries")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsDictionariesHint")}
            </p>
            <div className="auth-list">
              {dictionaries.map((item) => (
                <div className="settings-row auth-row" key={item.lang}>
                  <div className="settings-row-text">
                    <div className="settings-label">
                      {DICTIONARY_LABELS[item.lang] ?? item.lang}
                    </div>
                    <div className="settings-hint">
                      {item.installed
                        ? t(locale, "dictionaryInstalled")
                        : t(locale, "dictionaryNotInstalled")}
                    </div>
                  </div>
                  {item.installed ? (
                    <button
                      type="button"
                      className="auth-action-btn"
                      disabled={dictionaryBusy === item.lang}
                      onClick={() => onDeleteDictionary(item.lang)}
                    >
                      {t(locale, "dictionaryRemove")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="auth-action-btn"
                      disabled={dictionaryBusy === item.lang}
                      onClick={() => onDownloadDictionary(item.lang)}
                    >
                      {dictionaryBusy === item.lang
                        ? "…"
                        : t(locale, "dictionaryDownload")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {section === "updates" && (
          <section className="settings-section">
            <h2>{t(locale, "settingsUpdates")}</h2>
            <p className="settings-section-hint">
              {t(locale, "settingsUpdatesHint")}
            </p>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">{t(locale, "currentVersion")}</div>
                <div className="settings-hint">v{version || "…"}</div>
                {updateStatus && (
                  <div className={updateError ? "error-text" : "settings-hint"}>
                    {updateStatus}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="auth-action-btn"
                onClick={() => {
                  void checkUpdate();
                }}
                disabled={updateBusy}
              >
                {updateBusy ? "…" : t(locale, "checkUpdate")}
              </button>
            </div>
            <div className="changelog">
              <div className="changelog-title">{t(locale, "versionHistory")}</div>
              <ul className="changelog-list">
                {CHANGELOG.map((entry) => (
                  <li key={entry.version} className="changelog-item">
                    <div className="changelog-head">
                      <span className="changelog-version">v{entry.version}</span>
                      <span className="changelog-date">{entry.date}</span>
                    </div>
                    <p className="changelog-notes">{noteFor(entry, locale)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {section === "agents" && (
          <section className="settings-section">
            <div className="settings-section-head">
              <h2>{t(locale, "settingsAgents")}</h2>
              <button
                type="button"
                className="settings-refresh"
                onClick={onRefreshAuth}
                disabled={authLoading}
              >
                {authLoading ? t(locale, "authChecking") : t(locale, "authRefresh")}
              </button>
            </div>
            <p className="settings-section-hint">
              {t(locale, "settingsAgentsHint")}
            </p>
            {authMessage && <p className="muted">{authMessage}</p>}
            <div className="auth-list">
              {agentAuths.map((item) => {
                const status = authStatusLabel(locale, item, authLoading);
                return (
                  <div className="settings-row auth-row" key={item.id}>
                    <div className="settings-row-text">
                      <div className="settings-label-row">
                        <span
                          className={
                            !item.installed
                              ? "engine-lamp engine-lamp-miss"
                              : item.loggedIn
                                ? "engine-lamp engine-lamp-on"
                                : "engine-lamp engine-lamp-off"
                          }
                          aria-hidden="true"
                        />
                        <span className="settings-label">{item.label}</span>
                      </div>
                      <div className="settings-hint">{status}</div>
                    </div>
                    {item.loggedIn ? (
                      <button
                        type="button"
                        className="auth-action-btn"
                        disabled={!item.installed || authLoading}
                        onClick={() => onSignOut(item.id)}
                      >
                        {t(locale, "authSignOut")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="auth-action-btn"
                        disabled={!item.installed || authLoading}
                        onClick={() => onSignIn(item.id)}
                      >
                        {t(locale, "authSignIn")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <h2 className="settings-subhead">{t(locale, "settingsAgentModels")}</h2>
            <p className="settings-section-hint">{t(locale, "settingsAgentModelsHint")}</p>

            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">Claude — {t(locale, "agentModel")}</div>
              </div>
              <select
                className="settings-select"
                value={claudeModel}
                onChange={(e) => onClaudeModelChange(e.target.value)}
                aria-label={`Claude ${t(locale, "agentModel")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {CLAUDE_MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">Claude — {t(locale, "agentEffort")}</div>
              </div>
              <select
                className="settings-select"
                value={claudeEffort}
                onChange={(e) => onClaudeEffortChange(e.target.value)}
                aria-label={`Claude ${t(locale, "agentEffort")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {CLAUDE_EFFORT_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">Codex — {t(locale, "agentModel")}</div>
              </div>
              <select
                className="settings-select"
                value={codexModel}
                onChange={(e) => onCodexModelChange(e.target.value)}
                aria-label={`Codex ${t(locale, "agentModel")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {CODEX_MODEL_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">Codex — {t(locale, "agentEffort")}</div>
              </div>
              <select
                className="settings-select"
                value={codexEffort}
                onChange={(e) => onCodexEffortChange(e.target.value)}
                aria-label={`Codex ${t(locale, "agentEffort")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {CODEX_EFFORT_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">Cursor — {t(locale, "agentModel")}</div>
                <div className="settings-hint">{t(locale, "cursorModelHint")}</div>
              </div>
              <select
                className="settings-select"
                value={cursorModel}
                onChange={(e) => onCursorModelChange(e.target.value)}
                aria-label={`Cursor ${t(locale, "agentModel")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {cursorModelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">OpenCode — {t(locale, "agentModel")}</div>
                <div className="settings-hint">{t(locale, "opencodeModelHint")}</div>
              </div>
              <select
                className="settings-select"
                value={opencodeModel}
                onChange={(e) => onOpencodeModelChange(e.target.value)}
                aria-label={`OpenCode ${t(locale, "agentModel")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {opencodeModelOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-row">
              <div className="settings-row-text">
                <div className="settings-label">OpenCode — {t(locale, "agentEffort")}</div>
              </div>
              <select
                className="settings-select"
                value={opencodeEffort}
                onChange={(e) => onOpencodeEffortChange(e.target.value)}
                aria-label={`OpenCode ${t(locale, "agentEffort")}`}
              >
                <option value="">{t(locale, "optionDefault")}</option>
                {OPENCODE_EFFORT_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
