import type { ReactNode } from "react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import type { OrchestratorAgentId } from "../conversations";
import { agentDisplayName } from "./messages";
import { agentPanelLamp, agentPanelStatusKey } from "./panelStatus";
import type { AgentAuthSnapshot, AgentPanelLamp, AgentRunState } from "./types";

export interface AgentPanelModel {
  id: OrchestratorAgentId;
  state: AgentRunState;
  auth: AgentAuthSnapshot | undefined;
  authLoading: boolean;
  /** Expanded body (existing Variant column content). */
  body: ReactNode;
}

function lampClass(lamp: AgentPanelLamp): string {
  switch (lamp) {
    case "ready":
      return "agent-panel-lamp agent-panel-lamp-ready";
    case "running":
      return "agent-panel-lamp agent-panel-lamp-running";
    case "attention":
      return "agent-panel-lamp agent-panel-lamp-attention";
    case "error":
      return "agent-panel-lamp agent-panel-lamp-error";
    case "offline":
    default:
      return "agent-panel-lamp agent-panel-lamp-offline";
  }
}

export function AgentPanels({
  locale,
  panels,
  expandedId,
  onToggle,
}: {
  locale: Locale;
  panels: AgentPanelModel[];
  expandedId: OrchestratorAgentId | null;
  onToggle: (id: OrchestratorAgentId) => void;
}) {
  const expanded = panels.find((panel) => panel.id === expandedId) ?? null;

  return (
    <div className="agent-panels">
      <div className="agent-panels-label muted">{t(locale, "orchestratorAgentPanels")}</div>
      <div className="agent-panels-row">
        {panels.map((panel) => {
          const lamp = agentPanelLamp(panel.auth, panel.state, panel.authLoading);
          const statusKey = agentPanelStatusKey(
            panel.auth,
            panel.state,
            panel.authLoading,
          );
          const isOpen = expandedId === panel.id;
          return (
            <button
              key={panel.id}
              type="button"
              className={
                isOpen ? "agent-panel-card agent-panel-card-active" : "agent-panel-card"
              }
              onClick={() => onToggle(panel.id)}
              aria-expanded={isOpen}
              title={
                isOpen
                  ? t(locale, "orchestratorCollapsePanel")
                  : t(locale, "orchestratorExpandPanel")
              }
            >
              <span className={lampClass(lamp)} aria-hidden />
              <span className="agent-panel-card-text">
                <span className="agent-panel-name">{agentDisplayName(panel.id)}</span>
                <span className="agent-panel-status">{t(locale, statusKey)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {expanded && (
        <div className="agent-panel-detail">
          <div className="agent-panel-detail-head">
            <span className="agent-panel-name">{agentDisplayName(expanded.id)}</span>
            <button
              type="button"
              className="agent-panel-detail-close"
              onClick={() => onToggle(expanded.id)}
            >
              {t(locale, "orchestratorCollapsePanel")}
            </button>
          </div>
          <div className="agent-panel-body">{expanded.body}</div>
        </div>
      )}
    </div>
  );
}
