import { useState } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type { OrchestratorAgentId } from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";
import { agentDisplayName } from "./messages";
import type { OrchestratorContext } from "./runFanout";
import { roleLabel, rolesForProfile } from "../roles";
import { profileLabel, type ProjectProfile } from "../profiles";

/**
 * Everything that decides HOW the next message is sent — profile, context,
 * mode, agent selection and roles. Rendered from Settings so the center chat
 * (OrchestratorChat) can stay a plain conversation view. All of the state
 * here is owned by useOrchestrator and just passed down.
 */
export function OrchestratorConfigPanel({
  locale,
  busy,
  synthesizing,
  fullAccessMode,
  onFullAccessModeChange,
  planMode,
  onPlanModeChange,
  proposeMode,
  onProposeModeChange,
  context,
  onContextChange,
  selectedAgents,
  onToggleAgent,
  activeProfileId,
  availableProfiles,
  onProfileChange,
  profileSwitchError,
  selectedRoles,
  onAgentRoleChange,
  structuredResultMode,
  onStructuredResultModeChange,
  projectProfileLabel,
}: {
  locale: Locale;
  busy: boolean;
  synthesizing: boolean;
  /** In-memory only — never persisted across app restarts. */
  fullAccessMode: boolean;
  onFullAccessModeChange: (enabled: boolean) => void;
  /** In-memory only — never persisted; no confirm/banner (cannot write). */
  planMode: boolean;
  onPlanModeChange: (enabled: boolean) => void;
  /** In-memory only — never persisted; no confirm/banner (cannot write). */
  proposeMode: boolean;
  onProposeModeChange: (enabled: boolean) => void;
  context: OrchestratorContext;
  onContextChange: (context: OrchestratorContext) => void;
  selectedAgents: OrchestratorAgentId[];
  onToggleAgent: (id: OrchestratorAgentId) => void;
  /** Active project profile id — drives which roles (if any) are offered. */
  activeProfileId: string | null;
  availableProfiles: ProjectProfile[];
  onProfileChange: (id: string) => void;
  profileSwitchError: string | null;
  /** In-memory only — never persisted across conversations. */
  selectedRoles: Partial<Record<OrchestratorAgentId, string>>;
  onAgentRoleChange: (id: OrchestratorAgentId, roleId: string | null) => void;
  /** In-memory only — ask agents for structured self-assessment. */
  structuredResultMode: boolean;
  onStructuredResultModeChange: (enabled: boolean) => void;
  /** Localized label of the active project profile; display only. */
  projectProfileLabel: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocked = busy || synthesizing;
  const singleAgentMode = fullAccessMode || planMode || proposeMode;
  const availableRoles = rolesForProfile(activeProfileId);
  const showRoleSelects =
    !singleAgentMode && context === "project" && availableRoles.length > 0;

  const clearOtherModes = (keep: "normal" | "plan" | "propose" | "full") => {
    if (keep !== "full" && fullAccessMode) onFullAccessModeChange(false);
    if (keep !== "plan" && planMode) onPlanModeChange(false);
    if (keep !== "propose" && proposeMode) onProposeModeChange(false);
  };

  const requestMode = (next: "normal" | "plan" | "propose" | "full") => {
    if (blocked) return;
    if (next === "full") {
      if (fullAccessMode) return;
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(false);
    if (next === "plan") {
      if (planMode) return;
      clearOtherModes("plan");
      onPlanModeChange(true);
      return;
    }
    if (next === "propose") {
      if (proposeMode) return;
      clearOtherModes("propose");
      onProposeModeChange(true);
      return;
    }
    // normal
    clearOtherModes("normal");
  };

  const confirmFullAccess = () => {
    setConfirmOpen(false);
    clearOtherModes("full");
    onFullAccessModeChange(true);
  };

  const warningBody =
    context === "free"
      ? t(locale, "orchestratorFullAccessWarningBodyFree")
      : t(locale, "orchestratorFullAccessWarningBodyProject");

  return (
    <>
      <div
        className="orchestrator-mode-row"
        role="group"
        aria-label={t(locale, "orchestratorContextLabel")}
      >
        <span className="orchestrator-mode-label">
          {t(locale, "orchestratorContextLabel")}
        </span>
        <div className="orchestrator-mode-switch">
          <button
            type="button"
            className={
              context === "project"
                ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                : "orchestrator-mode-btn"
            }
            onClick={() => onContextChange("project")}
            disabled={blocked}
          >
            {projectProfileLabel || t(locale, "orchestratorContextProject")}
          </button>
          <button
            type="button"
            className={
              context === "free"
                ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                : "orchestrator-mode-btn"
            }
            onClick={() => onContextChange("free")}
            disabled={blocked}
          >
            {t(locale, "orchestratorContextFree")}
          </button>
        </div>
      </div>

      {context === "project" && (
        <div
          className="orchestrator-mode-row"
          role="group"
          aria-label={t(locale, "orchestratorProfileLabel")}
        >
          <span className="orchestrator-mode-label">
            {t(locale, "orchestratorProfileLabel")}
          </span>
          <select
            className="orchestrator-profile-select"
            value={activeProfileId ?? ""}
            disabled={blocked}
            onChange={(e) => onProfileChange(e.target.value)}
          >
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {profileLabel(locale, p.id)}
              </option>
            ))}
          </select>
          {profileSwitchError && (
            <span className="orchestrator-profile-error">
              {t(locale, "orchestratorProfileSwitchError", {
                error: profileSwitchError,
              })}
            </span>
          )}
        </div>
      )}

      <div
        className="orchestrator-mode-row"
        role="group"
        aria-label={t(locale, "orchestratorModeLabel")}
      >
        <span className="orchestrator-mode-label">
          {t(locale, "orchestratorModeLabel")}
        </span>
        <div className="orchestrator-mode-switch">
          <button
            type="button"
            className={
              !singleAgentMode
                ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                : "orchestrator-mode-btn"
            }
            onClick={() => requestMode("normal")}
            disabled={blocked}
          >
            {t(locale, "orchestratorModeNormal")}
          </button>
          <button
            type="button"
            className={
              planMode
                ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                : "orchestrator-mode-btn"
            }
            onClick={() => requestMode("plan")}
            disabled={blocked}
          >
            {t(locale, "orchestratorModePlan")}
          </button>
          <button
            type="button"
            className={
              proposeMode
                ? "orchestrator-mode-btn orchestrator-mode-btn-active"
                : "orchestrator-mode-btn"
            }
            onClick={() => requestMode("propose")}
            disabled={blocked}
          >
            {t(locale, "orchestratorModePropose")}
          </button>
          <button
            type="button"
            className={
              fullAccessMode
                ? "orchestrator-mode-btn orchestrator-mode-btn-danger orchestrator-mode-btn-active"
                : "orchestrator-mode-btn orchestrator-mode-btn-danger"
            }
            onClick={() => requestMode("full")}
            disabled={blocked}
          >
            {t(locale, "orchestratorModeFullAccess")}
          </button>
        </div>
      </div>

      {!singleAgentMode && (
        <div
          className="orchestrator-agents-select"
          role="group"
          aria-label={t(locale, "orchestratorAgentsSelectLabel")}
        >
          <span className="orchestrator-mode-label">
            {t(locale, "orchestratorAgentsSelectLabel")}
          </span>
          <div className="orchestrator-agents-chips">
            {ORCHESTRATOR_AGENT_IDS.map((id) => {
              const on = selectedAgents.includes(id);
              return (
                <div key={id} className="orchestrator-agent-slot">
                  <button
                    type="button"
                    className={
                      on
                        ? "orchestrator-agent-chip orchestrator-agent-chip-active"
                        : "orchestrator-agent-chip"
                    }
                    onClick={() => onToggleAgent(id)}
                    disabled={blocked}
                    aria-pressed={on}
                  >
                    {agentDisplayName(id)}
                  </button>
                  {showRoleSelects && on && (
                    <label className="orchestrator-agent-role">
                      <span className="orchestrator-agent-role-label">
                        {t(locale, "orchestratorRoleLabel")}
                      </span>
                      <select
                        className="orchestrator-agent-role-select"
                        value={selectedRoles[id] ?? ""}
                        disabled={blocked}
                        aria-label={`${agentDisplayName(id)} — ${t(locale, "orchestratorRoleLabel")}`}
                        onChange={(e) =>
                          onAgentRoleChange(id, e.target.value || null)
                        }
                      >
                        <option value="">
                          {t(locale, "orchestratorRoleNone")}
                        </option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {roleLabel(locale, activeProfileId, role.id) ??
                              role.id}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!singleAgentMode && (
        <label className="orchestrator-structured-toggle">
          <input
            type="checkbox"
            checked={structuredResultMode}
            disabled={blocked}
            onChange={(e) => onStructuredResultModeChange(e.target.checked)}
          />
          {t(locale, "orchestratorStructuredResultLabel")}
        </label>
      )}

      {confirmOpen && (
        <div
          className="orchestrator-confirm-backdrop"
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="orchestrator-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="orchestrator-full-access-title"
            aria-describedby="orchestrator-full-access-body"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="orchestrator-full-access-title">
              {t(locale, "orchestratorFullAccessWarningTitle")}
            </h2>
            <p id="orchestrator-full-access-body">{warningBody}</p>
            <div className="orchestrator-confirm-actions">
              <button
                type="button"
                className="orchestrator-confirm-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                {t(locale, "orchestratorFullAccessCancel")}
              </button>
              <button
                type="button"
                className="orchestrator-confirm-enable"
                onClick={confirmFullAccess}
              >
                {t(locale, "orchestratorFullAccessConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
