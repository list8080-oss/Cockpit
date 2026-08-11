import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type {
  OrchestratorAgentId,
  OrchestratorMessage,
  ProposalChangeStatus,
} from "../conversations";
import { ORCHESTRATOR_AGENT_IDS } from "../conversations";
import { agentDisplayName, delegatedAgentLabel, formatOrchestratorMessage } from "./messages";
import type { OrchestratorContext } from "./runFanout";
import { roleLabel, rolesForProfile } from "../roles";
import { profileLabel, type ProjectProfile } from "../profiles";

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "orchestrator-diff-line";
  if (line.startsWith("+")) return "orchestrator-diff-line orchestrator-diff-line-add";
  if (line.startsWith("-")) return "orchestrator-diff-line orchestrator-diff-line-del";
  if (line.startsWith("@@")) return "orchestrator-diff-line orchestrator-diff-line-hunk";
  return "orchestrator-diff-line";
}

function DiffLines({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <pre className="orchestrator-proposal-diff">
      {lines.map((line, i) => (
        <span key={i} className={diffLineClass(line)}>
          {line}
          {i < lines.length - 1 ? "\n" : ""}
        </span>
      ))}
    </pre>
  );
}

function proposalStatusFor(
  message: OrchestratorMessage,
  path: string,
): ProposalChangeStatus {
  return message.proposalChangeStatus?.[path] ?? { state: "pending" };
}

function ProposalFileActions({
  locale,
  messageId,
  path,
  status,
  onApply,
  onReject,
  onRollback,
}: {
  locale: Locale;
  messageId: string;
  path: string;
  status: ProposalChangeStatus;
  onApply: (messageId: string, path: string) => void;
  onReject: (messageId: string, path: string) => void;
  onRollback: (messageId: string, path: string) => void;
}) {
  switch (status.state) {
    case "pending":
      return (
        <div className="orchestrator-proposal-actions">
          <button
            type="button"
            className="orchestrator-proposal-btn orchestrator-proposal-btn-apply"
            onClick={() => onApply(messageId, path)}
          >
            {t(locale, "orchestratorProposalApply")}
          </button>
          <button
            type="button"
            className="orchestrator-proposal-btn"
            onClick={() => onReject(messageId, path)}
          >
            {t(locale, "orchestratorProposalReject")}
          </button>
        </div>
      );
    case "applying":
      return (
        <div className="orchestrator-proposal-actions">
          <button
            type="button"
            className="orchestrator-proposal-btn orchestrator-proposal-btn-apply"
            disabled
          >
            {t(locale, "orchestratorProposalApply")}
          </button>
          <button type="button" className="orchestrator-proposal-btn" disabled>
            {t(locale, "orchestratorProposalReject")}
          </button>
          <span className="orchestrator-proposal-status muted">
            {t(locale, "orchestratorProposalApplying")}
          </span>
        </div>
      );
    case "applied":
      return (
        <div className="orchestrator-proposal-actions">
          <span className="orchestrator-proposal-status">
            {t(locale, "orchestratorProposalApplied")}
          </span>
          <button
            type="button"
            className="orchestrator-proposal-btn"
            onClick={() => onRollback(messageId, path)}
          >
            {t(locale, "orchestratorProposalRollback")}
          </button>
        </div>
      );
    case "applyError":
      return (
        <div className="orchestrator-proposal-actions">
          <span className="orchestrator-proposal-status orchestrator-proposal-status-error">
            {t(locale, "orchestratorProposalApplyError", { error: status.error })}
          </span>
          <button
            type="button"
            className="orchestrator-proposal-btn orchestrator-proposal-btn-apply"
            onClick={() => onApply(messageId, path)}
          >
            {t(locale, "orchestratorProposalApply")}
          </button>
          <button
            type="button"
            className="orchestrator-proposal-btn"
            onClick={() => onReject(messageId, path)}
          >
            {t(locale, "orchestratorProposalReject")}
          </button>
        </div>
      );
    case "rejected":
      return (
        <div className="orchestrator-proposal-actions">
          <span className="orchestrator-proposal-status muted">
            {t(locale, "orchestratorProposalRejected")}
          </span>
        </div>
      );
    case "rollingBack":
      return (
        <div className="orchestrator-proposal-actions">
          <button type="button" className="orchestrator-proposal-btn" disabled>
            {t(locale, "orchestratorProposalRollback")}
          </button>
          <span className="orchestrator-proposal-status muted">
            {t(locale, "orchestratorProposalRollingBack")}
          </span>
        </div>
      );
    case "rolledBack":
      return (
        <div className="orchestrator-proposal-actions">
          <span className="orchestrator-proposal-status muted">
            {t(locale, "orchestratorProposalRolledBack")}
          </span>
        </div>
      );
    case "rollbackError":
      return (
        <div className="orchestrator-proposal-actions">
          <span className="orchestrator-proposal-status orchestrator-proposal-status-error">
            {t(locale, "orchestratorProposalRollbackError", {
              error: status.error,
            })}
          </span>
          <button
            type="button"
            className="orchestrator-proposal-btn"
            onClick={() => onRollback(messageId, path)}
          >
            {t(locale, "orchestratorProposalRollback")}
          </button>
        </div>
      );
  }
}

export function OrchestratorChat({
  locale,
  messages,
  draft,
  onDraftChange,
  onSend,
  busy,
  canSynthesize,
  synthesizing,
  onSynthesize,
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
  projectConnected,
  projectProfileLabel,
  onApplyProposalChange,
  onRejectProposalChange,
  onRollbackProposalChange,
}: {
  locale: Locale;
  messages: OrchestratorMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  busy: boolean;
  canSynthesize: boolean;
  synthesizing: boolean;
  onSynthesize: () => void;
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
  projectConnected: boolean;
  /** Localized label of the active project profile; display only. */
  projectProfileLabel: string | null;
  onApplyProposalChange: (messageId: string, path: string) => void;
  onRejectProposalChange: (messageId: string, path: string) => void;
  onRollbackProposalChange: (messageId: string, path: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const blocked = busy || synthesizing;
  const noAgentsSelected = selectedAgents.length === 0;
  const projectBlocked = context === "project" && !projectConnected;
  const singleAgentMode = fullAccessMode || planMode || proposeMode;
  const availableRoles = rolesForProfile(activeProfileId);
  const showRoleSelects =
    !singleAgentMode && context === "project" && availableRoles.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, synthesizing]);

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

  const modeLabelFor = (message: OrchestratorMessage) => {
    const rights =
      message.kind === "agent_full_access" ||
      message.kind === "agent_full_access_error"
        ? t(locale, "orchestratorModeFullAccess")
        : message.kind === "agent_plan" || message.kind === "agent_plan_error"
          ? t(locale, "orchestratorModePlan")
          : message.kind === "agent_proposal" ||
              message.kind === "agent_proposal_error"
            ? t(locale, "orchestratorModePropose")
            : t(locale, "orchestratorModeNormal");
    return `${t(locale, "orchestrator")} · ${rights}`;
  };

  const sendLabel = () => {
    if (busy) {
      if (fullAccessMode) return t(locale, "orchestratorFullAccessWaiting");
      if (planMode) return t(locale, "orchestratorPlanWaiting");
      if (proposeMode) return t(locale, "orchestratorProposeWaiting");
      return t(locale, "waitingAgents");
    }
    if (fullAccessMode) return t(locale, "orchestratorSendFullAccess");
    if (planMode) return t(locale, "orchestratorSendPlan");
    if (proposeMode) return t(locale, "orchestratorSendPropose");
    if (context === "free") return t(locale, "orchestratorSendFree");
    return t(locale, "send");
  };

  const warningBody =
    context === "free"
      ? t(locale, "orchestratorFullAccessWarningBodyFree")
      : t(locale, "orchestratorFullAccessWarningBodyProject");
  const bannerText =
    context === "free"
      ? t(locale, "orchestratorFullAccessBannerFree")
      : t(locale, "orchestratorFullAccessBannerProject");

  const activeRightsLabel = fullAccessMode
    ? t(locale, "orchestratorModeFullAccess")
    : planMode
      ? t(locale, "orchestratorModePlan")
      : proposeMode
        ? t(locale, "orchestratorModePropose")
        : t(locale, "orchestratorModeNormal");

  const chatClass = fullAccessMode
    ? "orchestrator-chat orchestrator-chat-full-access"
    : planMode
      ? "orchestrator-chat orchestrator-chat-plan"
      : proposeMode
        ? "orchestrator-chat orchestrator-chat-propose"
        : "orchestrator-chat";

  return (
    <div className={chatClass}>
      <div className="orchestrator-transcript" role="log" aria-live="polite">
        {messages.length === 0 && !busy && !synthesizing && (
          <div className="orchestrator-empty muted">
            {t(locale, "orchestratorEmpty")}
          </div>
        )}
        {messages.map((message) => {
          const bubbleClass =
            message.role === "user"
              ? "orchestrator-bubble orchestrator-bubble-user"
              : message.kind === "agent_delegation"
                ? message.delegation?.isError
                  ? "orchestrator-bubble orchestrator-bubble-delegation orchestrator-bubble-error"
                  : "orchestrator-bubble orchestrator-bubble-delegation"
                : message.kind === "synthesis_error" ||
                    message.kind === "agent_full_access_error" ||
                    message.kind === "agent_plan_error" ||
                    message.kind === "agent_proposal_error"
                  ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-error"
                  : message.kind === "agent_full_access"
                    ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-full-access"
                    : message.kind === "agent_plan"
                      ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-plan"
                      : message.kind === "agent_proposal"
                        ? "orchestrator-bubble orchestrator-bubble-bot orchestrator-bubble-propose"
                        : "orchestrator-bubble orchestrator-bubble-bot";

          return (
            <div key={message.id} className={bubbleClass}>
              <div className="orchestrator-bubble-label">
                {message.role === "user"
                  ? t(locale, "orchestratorYou")
                  : message.kind === "agent_delegation" && message.delegation
                    ? `${t(locale, "orchestrator")} → ${delegatedAgentLabel(message.delegation.agent)}`
                    : modeLabelFor(message)}
              </div>
              {message.kind === "agent_proposal" ? (
                <div className="orchestrator-proposal">
                  <pre className="orchestrator-bubble-text">{message.text}</pre>
                  {(message.proposalChanges ?? []).map((change) => (
                    <div key={`${message.id}:${change.path}`} className="orchestrator-proposal-file">
                      <div className="orchestrator-proposal-path">{change.path}</div>
                      <DiffLines diff={change.diff} />
                      <ProposalFileActions
                        locale={locale}
                        messageId={message.id}
                        path={change.path}
                        status={proposalStatusFor(message, change.path)}
                        onApply={onApplyProposalChange}
                        onReject={onRejectProposalChange}
                        onRollback={onRollbackProposalChange}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="orchestrator-bubble-text">
                  {formatOrchestratorMessage(message, locale)}
                </pre>
              )}
            </div>
          );
        })}
        {busy && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">
              {t(locale, "orchestrator")} · {activeRightsLabel}
            </div>
            <div className="muted">
              {fullAccessMode
                ? t(locale, "orchestratorFullAccessWaiting")
                : planMode
                  ? t(locale, "orchestratorPlanWaiting")
                  : proposeMode
                    ? t(locale, "orchestratorProposeWaiting")
                    : t(locale, "orchestratorWaiting")}
            </div>
          </div>
        )}
        {synthesizing && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">
              {t(locale, "orchestrator")} · {t(locale, "orchestratorModeNormal")}
            </div>
            <div className="muted">{t(locale, "orchestratorSynthesizing")}</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="orchestrator-composer">
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

        {fullAccessMode && (
          <div className="orchestrator-full-access-banner" role="status">
            {bannerText}
          </div>
        )}

        {projectBlocked && (
          <div className="orchestrator-project-required" role="status">
            {t(locale, "orchestratorProjectRequired")}
          </div>
        )}

        <textarea
          className="orchestrator-input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={t(locale, "promptPlaceholder")}
          disabled={blocked}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.metaKey || e.ctrlKey) &&
              !blocked &&
              draft.trim() &&
              !projectBlocked &&
              (singleAgentMode || !noAgentsSelected)
            ) {
              e.preventDefault();
              onSend();
            }
          }}
        />

        <div className="orchestrator-composer-actions">
          {draft.length > 0 && (
            <button
              type="button"
              className="clear-prompt-btn orchestrator-clear"
              onClick={() => onDraftChange("")}
              disabled={blocked}
              title={t(locale, "clearPrompt")}
            >
              {t(locale, "clearPrompt")}
            </button>
          )}
          {canSynthesize && !singleAgentMode && context === "project" && (
            <button
              type="button"
              className="orchestrator-synthesize-btn"
              onClick={onSynthesize}
              disabled={synthesizing || blocked}
            >
              {synthesizing
                ? t(locale, "orchestratorSynthesizing")
                : t(locale, "orchestratorSynthesize")}
            </button>
          )}
          <button
            type="button"
            className={
              fullAccessMode ? "send-btn send-btn-full-access" : "send-btn"
            }
            onClick={onSend}
            disabled={
              blocked ||
              !draft.trim() ||
              projectBlocked ||
              (!singleAgentMode && noAgentsSelected)
            }
          >
            {sendLabel()}
          </button>
        </div>
      </div>

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
    </div>
  );
}
