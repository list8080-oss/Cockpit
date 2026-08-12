import { useEffect, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type {
  OrchestratorAgentId,
  OrchestratorMessage,
  ProposalChangeStatus,
} from "../conversations";
import { delegatedAgentLabel, formatOrchestratorMessage } from "./messages";
import type { OrchestratorContext } from "./runFanout";
import type { AttachedFile } from "./contextPackage";
import { AttachFileMenu } from "./AttachFileMenu";

/** `0:07`, `1:23` — ticks up once a second while a send/synthesize call is
 * active, 0 once it's done. The CLIs give no real progress signal for a
 * single request/response call, so a live elapsed counter is the one honest
 * "still alive, not frozen" cue available during a long Propose-changes
 * generation. Takes the start timestamp from `useOrchestrator` (not a
 * component-local `Date.now()`) so it keeps counting correctly even if this
 * component unmounts and remounts — which happens whenever the user opens
 * an individual agent's own panel and comes back while a call is still
 * running. */
function useElapsedSeconds(since: number | null): number {
  const [seconds, setSeconds] = useState(() => (since ? Math.floor((Date.now() - since) / 1000) : 0));
  useEffect(() => {
    if (!since) {
      setSeconds(0);
      return;
    }
    setSeconds(Math.floor((Date.now() - since) / 1000));
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - since) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [since]);
  return seconds;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

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
  planMode,
  proposeMode,
  context,
  selectedAgents,
  projectConnected,
  activeProfileId,
  onApplyProposalChange,
  onRejectProposalChange,
  onRollbackProposalChange,
  attachedFiles,
  onAttachFile,
  onRemoveAttachedFile,
  activeSince,
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
  /** Read-only here — set from the Orchestrator config panel in the sidebar. */
  fullAccessMode: boolean;
  planMode: boolean;
  proposeMode: boolean;
  context: OrchestratorContext;
  selectedAgents: OrchestratorAgentId[];
  projectConnected: boolean;
  activeProfileId: string | null;
  onApplyProposalChange: (messageId: string, path: string) => void;
  onRejectProposalChange: (messageId: string, path: string) => void;
  onRollbackProposalChange: (messageId: string, path: string) => void;
  attachedFiles: AttachedFile[];
  onAttachFile: (file: AttachedFile) => void;
  onRemoveAttachedFile: (label: string) => void;
  /** When the current send/synthesize call actually started, from
   * `useOrchestrator` — survives this component unmounting/remounting. */
  activeSince: number | null;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const blocked = busy || synthesizing;
  const elapsed = useElapsedSeconds(activeSince);
  const noAgentsSelected = selectedAgents.length === 0;
  const projectBlocked = context === "project" && !projectConnected;
  const singleAgentMode = fullAccessMode || planMode || proposeMode;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, synthesizing]);

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
      const base = fullAccessMode
        ? t(locale, "orchestratorFullAccessWaiting")
        : planMode
          ? t(locale, "orchestratorPlanWaiting")
          : proposeMode
            ? t(locale, "orchestratorProposeWaiting")
            : t(locale, "waitingAgents");
      return `${base} ${formatElapsed(elapsed)}`;
    }
    if (fullAccessMode) return t(locale, "orchestratorSendFullAccess");
    if (planMode) return t(locale, "orchestratorSendPlan");
    if (proposeMode) return t(locale, "orchestratorSendPropose");
    if (context === "free") return t(locale, "orchestratorSendFree");
    return t(locale, "send");
  };

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
              {message.attachedFiles && message.attachedFiles.length > 0 && (
                <div className="orchestrator-attachments orchestrator-attachments-sent">
                  {message.attachedFiles.map((file) => (
                    <span className="orchestrator-attachment-chip" key={file.label}>
                      {file.label}
                    </span>
                  ))}
                </div>
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
                    : t(locale, "orchestratorWaiting")}{" "}
              {formatElapsed(elapsed)}
            </div>
          </div>
        )}
        {synthesizing && (
          <div className="orchestrator-bubble orchestrator-bubble-bot">
            <div className="orchestrator-bubble-label">
              {t(locale, "orchestrator")} · {t(locale, "orchestratorModeNormal")}
            </div>
            <div className="muted">
              {t(locale, "orchestratorSynthesizing")} {formatElapsed(elapsed)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="orchestrator-composer">
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

        {attachedFiles.length > 0 && (
          <div className="orchestrator-attachments">
            {attachedFiles.map((file) => (
              <span className="orchestrator-attachment-chip" key={file.label}>
                {file.label}
                <button
                  type="button"
                  className="orchestrator-attachment-remove"
                  onClick={() => onRemoveAttachedFile(file.label)}
                  disabled={blocked}
                  aria-label={t(locale, "orchestratorRemoveAttachment")}
                >
                  ×
                </button>
              </span>
            ))}
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
          {context === "project" && (
            <AttachFileMenu
              locale={locale}
              profileId={activeProfileId}
              disabled={blocked || projectBlocked}
              onAttach={onAttachFile}
            />
          )}
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
    </div>
  );
}
