import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { t, type Locale } from "../i18n";
import {
  type AgentConversation,
  type ConversationTurn,
  type DelegatedCall,
  type OrchestratorAgentId,
  type OrchestratorMessage,
  type ProposalChangeStatus,
  conversationTitle,
  emptyEngineThread,
  loadActiveConversationId,
  loadConversations,
  persistActiveConversationId,
  persistConversations,
} from "../conversations";
import { ORCHESTRATOR_AGENT_IDS, type EngineReply } from "./types";
import {
  createAgentFullAccessErrorMessage,
  createAgentFullAccessMessage,
  createAgentPlanErrorMessage,
  createAgentPlanMessage,
  createAgentProposalErrorMessage,
  createAgentProposalMessage,
  createCompletedMessage,
  createDelegationMessage,
  createDispatchedMessage,
  createSynthesisErrorMessage,
  createSynthesisMessage,
  createUserMessage,
  legacyMessagesFromConversation,
} from "./messages";
import {
  runOrchestratorFanout,
  summarizeFanoutResults,
  type OrchestratorContext,
} from "./runFanout";
import { roleInstruction } from "../roles";
import { parseStructuredTail, type StructuredResult } from "./structuredResult";
import {
  buildSynthesisPrompt,
  canRunSynthesis,
  lastAssistantText,
  lastUserRoundText,
  type AgentReplySnapshot,
} from "./buildSynthesisPrompt";
import { buildFullAccessContext } from "./fullAccessContext";
import { composeContextPackage, type AttachedFile } from "./contextPackage";
import { saveTranscript, serializeOrchestratorTranscript, transcriptFileId } from "../transcripts";
import type { VariantState } from "../agents/Variant";
import type { ProjectProfile } from "../profiles";
import type { FileDiff } from "../conversations";
import type { WorkspaceMode } from "../workspaceMode";

const ORCHESTRATOR_CONTEXT_KEY = "yar-cockpit.orchestratorContext";

function loadOrchestratorContext(): OrchestratorContext {
  try {
    const raw = localStorage.getItem(ORCHESTRATOR_CONTEXT_KEY);
    return raw === "free" ? "free" : "project";
  } catch {
    return "project";
  }
}

function persistOrchestratorContext(value: OrchestratorContext) {
  try {
    localStorage.setItem(ORCHESTRATOR_CONTEXT_KEY, value);
  } catch {
    /* ignore */
  }
}

/** @deprecated use `WorkspaceMode` from "../workspaceMode" directly. */
export type OrchestratorWorkspaceMode = WorkspaceMode;
export type OrchestratorView = "workspace" | "settings";

export interface UseOrchestratorDeps {
  locale: Locale;
  claudeModel: string;
  claudeEffort: string;
  codexModel: string;
  codexEffort: string;
  cursorModel: string;
  opencodeModel: string;
  opencodeEffort: string;
  refreshCodexLimits: () => void | Promise<void>;
  setWorkspaceMode: (mode: OrchestratorWorkspaceMode) => void;
  setView: (view: OrchestratorView) => void;
}

export function useOrchestrator({
  locale,
  claudeModel,
  claudeEffort,
  codexModel,
  codexEffort,
  cursorModel,
  opencodeModel,
  opencodeEffort,
  refreshCodexLimits,
  setWorkspaceMode,
  setView,
}: UseOrchestratorDeps) {
  const [conversations, setConversations] = useState<AgentConversation[]>(() =>
    loadConversations(),
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const id = loadActiveConversationId();
    return id && loadConversations().some((c) => c.id === id) ? id : null;
  });
  const restoredConversation = conversations.find((c) => c.id === activeConversationId) ?? null;

  // Composer draft for the Orchestrator chat (not the persisted conversation.prompt).
  const [prompt, setPrompt] = useState("");
  /** Real project files attached to the message currently being composed —
   * cleared after every send, like an email attachment, not sticky
   * conversation state. */
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const addAttachedFile = (file: AttachedFile) => {
    setAttachedFiles((prev) =>
      prev.some((f) => f.label === file.label) ? prev : [...prev, file],
    );
  };
  const removeAttachedFile = (label: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.label !== label));
  };
  const [claude, setClaude] = useState<VariantState>(() =>
    (restoredConversation?.claude.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [codex, setCodex] = useState<VariantState>(() =>
    (restoredConversation?.codex.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [cursor, setCursor] = useState<VariantState>(() =>
    (restoredConversation?.cursor.history.length ?? 0) > 0 ? { status: "done" } : { status: "idle" },
  );
  const [opencode, setOpencode] = useState<VariantState>(() =>
    (restoredConversation?.opencode.history.length ?? 0) > 0
      ? { status: "done" }
      : { status: "idle" },
  );
  const [claudeSessionId, setClaudeSessionId] = useState<string | null>(
    () => restoredConversation?.claude.sessionId ?? null,
  );
  const [codexThreadId, setCodexThreadId] = useState<string | null>(
    () => restoredConversation?.codex.sessionId ?? null,
  );
  const [cursorSessionId, setCursorSessionId] = useState<string | null>(
    () => restoredConversation?.cursor.sessionId ?? null,
  );
  const [opencodeSessionId, setOpencodeSessionId] = useState<string | null>(
    () => restoredConversation?.opencode.sessionId ?? null,
  );
  const [claudeReply, setClaudeReply] = useState("");
  const [codexReply, setCodexReply] = useState("");
  const [cursorReply, setCursorReply] = useState("");
  const [opencodeReply, setOpencodeReply] = useState("");
  const [claudeHistory, setClaudeHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.claude.history ?? [],
  );
  const [codexHistory, setCodexHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.codex.history ?? [],
  );
  const [cursorHistory, setCursorHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.cursor.history ?? [],
  );
  const [opencodeHistory, setOpencodeHistory] = useState<ConversationTurn[]>(
    () => restoredConversation?.opencode.history ?? [],
  );
  const [orchestratorMessages, setOrchestratorMessages] = useState<OrchestratorMessage[]>(
    () => {
      const stored = restoredConversation?.orchestrator?.messages;
      if (stored && stored.length > 0) return stored;
      if (restoredConversation?.prompt) {
        return legacyMessagesFromConversation(restoredConversation.prompt);
      }
      return [];
    },
  );
  const [expandedAgentPanel, setExpandedAgentPanel] =
    useState<OrchestratorAgentId | null>(null);
  /** Orchestrator "Full access" — enabled flag is session memory only. */
  const [fullAccessMode, setFullAccessMode] = useState(false);
  /** Orchestrator "Plan" — session memory only; mutually exclusive with Full access in the UI. */
  const [planMode, setPlanMode] = useState(false);
  /** Orchestrator "Propose changes" — session memory only; mutually exclusive with other rights modes. */
  const [proposeMode, setProposeMode] = useState(false);
  const [orchestratorAgentSessionId, setOrchestratorAgentSessionId] = useState<
    string | null
  >(() => restoredConversation?.orchestrator?.fullAccessSessionId ?? null);
  /** Separate resume id for Plan mode (not persisted; cleared on context/conversation change). */
  const [orchestratorPlanSessionId, setOrchestratorPlanSessionId] = useState<
    string | null
  >(null);
  /** Separate resume id for Propose-changes mode (not persisted). */
  const [orchestratorProposeSessionId, setOrchestratorProposeSessionId] =
    useState<string | null>(null);
  const [orchestratorAgentBusy, setOrchestratorAgentBusy] = useState(false);
  const [orchestratorContext, setOrchestratorContext] = useState<OrchestratorContext>(() => {
    const fromConversation = restoredConversation?.orchestrator?.context;
    if (fromConversation === "free" || fromConversation === "project") {
      return fromConversation;
    }
    return loadOrchestratorContext();
  });
  const [selectedAgents, setSelectedAgents] = useState<OrchestratorAgentId[]>(() => {
    const stored = restoredConversation?.orchestrator?.selectedAgents;
    if (stored && stored.length > 0) {
      return ORCHESTRATOR_AGENT_IDS.filter((id) => stored.includes(id));
    }
    return [...ORCHESTRATOR_AGENT_IDS];
  });

  /** In-memory only — never persisted across conversations or restarts. */
  const [selectedRoles, setSelectedRolesState] = useState<
    Partial<Record<OrchestratorAgentId, string>>
  >({});
  const setAgentRole = (id: OrchestratorAgentId, roleId: string | null) => {
    setSelectedRolesState((prev) => {
      const next = { ...prev };
      if (roleId) next[id] = roleId;
      else delete next[id];
      return next;
    });
  };

  /** In-memory only — never persisted; optional structured self-assessment. */
  const [structuredResultMode, setStructuredResultMode] = useState(false);
  const setStructuredResultModeSafe = (enabled: boolean) => {
    setStructuredResultMode(enabled);
  };
  const [structuredResults, setStructuredResults] = useState<
    Partial<Record<OrchestratorAgentId, StructuredResult | null>>
  >({});

  /** Active project profile — loaded from get_active_profile_id + list. */
  const [activeProfile, setActiveProfile] = useState<ProjectProfile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<ProjectProfile[]>([]);
  const [profileSwitchError, setProfileSwitchError] = useState<string | null>(null);
  const [activeProfileProjectPath, setActiveProfileProjectPath] = useState<string | null>(
    null,
  );

  const refreshActiveProfileProjectPath = () => {
    if (!activeProfile) {
      setActiveProfileProjectPath(null);
      return;
    }
    invoke<string | null>("get_project_path", { profileId: activeProfile.id })
      .then(setActiveProfileProjectPath)
      .catch(() => setActiveProfileProjectPath(null));
  };

  useEffect(() => {
    refreshActiveProfileProjectPath();
  }, [activeProfile]);

  useEffect(() => {
    Promise.all([
      invoke<ProjectProfile[]>("list_profiles"),
      invoke<string>("get_active_profile_id"),
    ])
      .then(([profiles, activeId]) => {
        setAvailableProfiles(profiles);
        if (profiles.some((p) => p.id === activeId)) {
          setActiveProfile({ id: activeId });
        } else if (profiles.length > 0) {
          setActiveProfile(profiles[0]);
        }
      })
      .catch(() => {
        /* Backend always returns the built-in list; leave null and fall back
           to the localized "Project" label in the context toggle. */
        invoke<ProjectProfile[]>("list_profiles")
          .then((profiles) => {
            setAvailableProfiles(profiles);
            if (profiles.length > 0) setActiveProfile(profiles[0]);
          })
          .catch(() => {
            /* leave null */
          });
      });
  }, []);

  const setActiveProfileId = (id: string) => {
    invoke("set_active_profile_id", { profileId: id })
      .then(() => {
        setProfileSwitchError(null);
        setActiveProfile({ id });
        // Same reasoning as setOrchestratorContextSafe: the resolved
        // project directory changes under "project" context, so any
        // resumed single-agent session tied to the old cwd is now stale.
        setOrchestratorAgentSessionId(null);
        setOrchestratorPlanSessionId(null);
        setOrchestratorProposeSessionId(null);
        // Roles/structured findings are profile-scoped settings.
        setSelectedRolesState({});
        setStructuredResults({});
      })
      .catch((e) => setProfileSwitchError(String(e)));
  };

  const activeConversationIdRef = useRef(activeConversationId);
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const isStillActive = (id: string) => activeConversationIdRef.current === id;

  // A fast double-click/double-Enter can fire the handler twice before React
  // re-renders to hide the reply box (state updates aren't applied until the
  // next render) — two concurrent `-r <session_id>` resume calls to the same
  // CLI session can then race, and one of the two replies gets lost. These
  // refs make each send/reply a no-op while its own request is in flight.
  const sendBusyRef = useRef(false);
  const synthesizeBusyRef = useRef(false);
  const [synthesizing, setSynthesizing] = useState(false);

  const setFullAccessModeSafe = (enabled: boolean) => {
    // Do not clear session id here — it is persisted on the conversation so
    // re-enabling Full access can resume. Mode itself stays in-memory only.
    setFullAccessMode(enabled);
  };
  const setPlanModeSafe = (enabled: boolean) => {
    setPlanMode(enabled);
  };
  const setProposeModeSafe = (enabled: boolean) => {
    setProposeMode(enabled);
  };
  const claudeBusyRef = useRef(false);
  const codexBusyRef = useRef(false);
  const cursorBusyRef = useRef(false);
  const opencodeBusyRef = useRef(false);

  const upsertConversation = (
    id: string,
    updater: (c: AgentConversation) => AgentConversation,
  ): AgentConversation | undefined => {
    let result: AgentConversation | undefined;
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updater(prev[idx]);
      result = next[idx];
      persistConversations(next);
      return next;
    });
    return result;
  };

  /** Archives the current transcript to disk as Markdown — best-effort, see
   * `saveTranscript`. Called after every turn that changes the visible
   * Orchestrator transcript. */
  const archiveTranscript = (conversation: AgentConversation) => {
    const bucket = conversation.orchestrator?.context ?? orchestratorContext;
    void saveTranscript(
      bucket,
      "orchestrator",
      transcriptFileId(conversation.id, conversation.createdAt),
      serializeOrchestratorTranscript(conversation, locale, activeProfileProjectPath),
    );
  };

  const setOrchestratorContextSafe = (next: OrchestratorContext) => {
    setOrchestratorContext(next);
    persistOrchestratorContext(next);
    // Different cwd → start a fresh full-access / plan / propose session next time.
    setOrchestratorAgentSessionId(null);
    setOrchestratorPlanSessionId(null);
    setOrchestratorProposeSessionId(null);
    if (activeConversationId) {
      upsertConversation(activeConversationId, (c) => ({
        ...c,
        updatedAt: Date.now(),
        orchestrator: {
          messages: c.orchestrator?.messages ?? [],
          fullAccessSessionId: null,
          context: next,
          selectedAgents: c.orchestrator?.selectedAgents ?? selectedAgents,
        },
      }));
    }
  };

  const toggleSelectedAgent = (id: OrchestratorAgentId) => {
    setSelectedAgents((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [...prev, id];
      const ordered = ORCHESTRATOR_AGENT_IDS.filter((x) => next.includes(x));
      if (activeConversationId) {
        upsertConversation(activeConversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          orchestrator: {
            messages: c.orchestrator?.messages ?? [],
            fullAccessSessionId: c.orchestrator?.fullAccessSessionId ?? null,
            context: c.orchestrator?.context ?? orchestratorContext,
            selectedAgents: ordered,
          },
        }));
      }
      return ordered;
    });
  };

  const applyAgentResult = (
    conversationId: string,
    agent: OrchestratorAgentId,
    followUp: boolean,
    userText: string,
    result:
      | { ok: true; reply: EngineReply }
      | { ok: false; error: string },
  ) => {
    if (result.ok) {
      const reply = result.reply;
      const { mainText, structured } = parseStructuredTail(reply.text);
      const now = Date.now();
      setStructuredResults((prev) => ({ ...prev, [agent]: structured }));
      upsertConversation(conversationId, (c) => {
        const thread = c[agent];
        const history: ConversationTurn[] = followUp
          ? [
              ...thread.history,
              { role: "user", text: userText, createdAt: now },
              { role: "assistant", text: mainText, createdAt: now },
            ]
          : [{ role: "assistant", text: mainText, createdAt: now }];
        return {
          ...c,
          updatedAt: Date.now(),
          [agent]: { history, sessionId: reply.sessionId },
        };
      });
      if (!isStillActive(conversationId)) return;
      const appendFollowUp = (h: ConversationTurn[]) => [
        ...h,
        { role: "user" as const, text: userText, createdAt: now },
        { role: "assistant" as const, text: mainText, createdAt: now },
      ];
      const firstTurn: ConversationTurn[] = [
        { role: "assistant", text: mainText, createdAt: now },
      ];
      if (agent === "claude") {
        setClaudeSessionId(reply.sessionId);
        setClaudeHistory(followUp ? appendFollowUp : firstTurn);
        setClaude({ status: "done" });
      } else if (agent === "codex") {
        setCodexThreadId(reply.sessionId);
        setCodexHistory(followUp ? appendFollowUp : firstTurn);
        setCodex({ status: "done" });
        void refreshCodexLimits();
      } else if (agent === "cursor") {
        setCursorSessionId(reply.sessionId);
        setCursorHistory(followUp ? appendFollowUp : firstTurn);
        setCursor({ status: "done" });
      } else {
        setOpencodeSessionId(reply.sessionId);
        setOpencodeHistory(followUp ? appendFollowUp : firstTurn);
        setOpencode({ status: "done" });
      }
      return;
    }

    upsertConversation(conversationId, (c) => ({ ...c, updatedAt: Date.now() }));
    if (!isStillActive(conversationId)) return;
    const err = { status: "error" as const, message: result.error };
    if (agent === "claude") setClaude(err);
    else if (agent === "codex") {
      setCodex(err);
      void refreshCodexLimits();
    } else if (agent === "cursor") setCursor(err);
    else setOpencode(err);
  };

  const ensureConversationForSend = (
    userText: string,
    seedMessages: OrchestratorMessage[],
  ): string => {
    const followUp = !!activeConversationId;
    const id = followUp ? activeConversationId! : crypto.randomUUID();
    const now = Date.now();

    if (!followUp) {
      const conversation: AgentConversation = {
        id,
        title: conversationTitle(userText),
        createdAt: now,
        updatedAt: now,
        prompt: userText,
        claude: emptyEngineThread(),
        codex: emptyEngineThread(),
        cursor: emptyEngineThread(),
        opencode: emptyEngineThread(),
        orchestrator: {
          messages: seedMessages,
          fullAccessSessionId: orchestratorAgentSessionId,
          context: orchestratorContext,
          selectedAgents,
        },
      };
      setConversations((prev) => {
        const next = [conversation, ...prev];
        persistConversations(next);
        return next;
      });
      setActiveConversationId(id);
      persistActiveConversationId(id);
      setOrchestratorMessages(seedMessages);
      setClaudeSessionId(null);
      setCodexThreadId(null);
      setCursorSessionId(null);
      setOpencodeSessionId(null);
      setClaudeHistory([]);
      setCodexHistory([]);
      setCursorHistory([]);
      setOpencodeHistory([]);
    } else {
      setOrchestratorMessages(seedMessages);
      upsertConversation(id, (c) => ({
        ...c,
        updatedAt: Date.now(),
        orchestrator: {
          messages: seedMessages,
          fullAccessSessionId:
            c.orchestrator?.fullAccessSessionId ?? orchestratorAgentSessionId,
          context: orchestratorContext,
          selectedAgents,
        },
      }));
    }
    return id;
  };

  const sendFullAccess = () => {
    if (!prompt.trim() || sendBusyRef.current || synthesizeBusyRef.current) return;
    if (orchestratorContext === "project" && !activeProfileProjectPath) return;
    sendBusyRef.current = true;
    const userText = prompt;
    const userMessage = createUserMessage(userText, attachedFiles);
    const seedMessages = [...orchestratorMessages, userMessage];
    const resumeSessionId = orchestratorAgentSessionId;
    const historyText = resumeSessionId
      ? null
      : buildFullAccessContext({
          orchestratorMessages,
          locale,
          agents: synthesisAgentSnapshots(),
        });
    const filesForSend = attachedFiles;
    const id = ensureConversationForSend(userText, seedMessages);

    setPrompt("");
    setAttachedFiles([]);
    setOrchestratorAgentBusy(true);

    invoke<{
      text: string;
      sessionId: string | null;
      delegatedCalls: DelegatedCall[];
    }>("run_orchestrator_agent", {
      prompt: composeContextPackage({ task: userText, history: historyText, attachedFiles: filesForSend }),
      sessionId: resumeSessionId,
      model: claudeModel,
      effort: claudeEffort,
      context: orchestratorContext,
      mode: "full",
    })
      .then((reply) => {
        if (isStillActive(id)) {
          setOrchestratorAgentSessionId(reply.sessionId);
        }
        upsertConversation(id, (c) => ({
          ...c,
          updatedAt: Date.now(),
          orchestrator: {
            messages: c.orchestrator?.messages ?? [],
            fullAccessSessionId: reply.sessionId,
            context: orchestratorContext,
            selectedAgents: c.orchestrator?.selectedAgents ?? selectedAgents,
          },
        }));
        for (const call of reply.delegatedCalls) {
          appendOrchestratorMessage(id, createDelegationMessage(call));
        }
        appendOrchestratorMessage(id, createAgentFullAccessMessage(reply.text));
      })
      .catch((e) => {
        appendOrchestratorMessage(
          id,
          createAgentFullAccessErrorMessage(String(e)),
        );
      })
      .finally(() => {
        sendBusyRef.current = false;
        setOrchestratorAgentBusy(false);
      });
  };

  const sendPlan = () => {
    if (!prompt.trim() || sendBusyRef.current || synthesizeBusyRef.current) return;
    if (orchestratorContext === "project" && !activeProfileProjectPath) return;
    sendBusyRef.current = true;
    const userText = prompt;
    const userMessage = createUserMessage(userText, attachedFiles);
    const seedMessages = [...orchestratorMessages, userMessage];
    const resumeSessionId = orchestratorPlanSessionId;
    const historyText = resumeSessionId
      ? null
      : buildFullAccessContext({
          orchestratorMessages,
          locale,
          agents: synthesisAgentSnapshots(),
        });
    const filesForSend = attachedFiles;
    const id = ensureConversationForSend(userText, seedMessages);

    setPrompt("");
    setAttachedFiles([]);
    setOrchestratorAgentBusy(true);

    invoke<{
      text: string;
      sessionId: string | null;
      delegatedCalls: DelegatedCall[];
    }>("run_orchestrator_agent", {
      prompt: composeContextPackage({ task: userText, history: historyText, attachedFiles: filesForSend }),
      sessionId: resumeSessionId,
      model: claudeModel,
      effort: claudeEffort,
      context: orchestratorContext,
      mode: "plan",
    })
      .then((reply) => {
        if (isStillActive(id)) {
          setOrchestratorPlanSessionId(reply.sessionId);
        }
        for (const call of reply.delegatedCalls) {
          appendOrchestratorMessage(id, createDelegationMessage(call));
        }
        appendOrchestratorMessage(id, createAgentPlanMessage(reply.text));
      })
      .catch((e) => {
        appendOrchestratorMessage(id, createAgentPlanErrorMessage(String(e)));
      })
      .finally(() => {
        sendBusyRef.current = false;
        setOrchestratorAgentBusy(false);
      });
  };

  const sendPropose = () => {
    if (!prompt.trim() || sendBusyRef.current || synthesizeBusyRef.current) return;
    if (orchestratorContext === "project" && !activeProfileProjectPath) return;
    sendBusyRef.current = true;
    const userText = prompt;
    const userMessage = createUserMessage(userText, attachedFiles);
    const seedMessages = [...orchestratorMessages, userMessage];
    const resumeSessionId = orchestratorProposeSessionId;
    const historyText = resumeSessionId
      ? null
      : buildFullAccessContext({
          orchestratorMessages,
          locale,
          agents: synthesisAgentSnapshots(),
        });
    const filesForSend = attachedFiles;
    const id = ensureConversationForSend(userText, seedMessages);

    setPrompt("");
    setAttachedFiles([]);
    setOrchestratorAgentBusy(true);

    invoke<{
      summary: string;
      changes: FileDiff[];
      sessionId: string | null;
      delegatedCalls: DelegatedCall[];
    }>("run_orchestrator_propose", {
      prompt: composeContextPackage({ task: userText, history: historyText, attachedFiles: filesForSend }),
      sessionId: resumeSessionId,
      model: claudeModel,
      effort: claudeEffort,
      context: orchestratorContext,
    })
      .then((reply) => {
        if (isStillActive(id)) {
          setOrchestratorProposeSessionId(reply.sessionId);
        }
        for (const call of reply.delegatedCalls) {
          appendOrchestratorMessage(id, createDelegationMessage(call));
        }
        appendOrchestratorMessage(
          id,
          createAgentProposalMessage(reply.summary, reply.changes, orchestratorContext),
        );
      })
      .catch((e) => {
        appendOrchestratorMessage(id, createAgentProposalErrorMessage(String(e)));
      })
      .finally(() => {
        sendBusyRef.current = false;
        setOrchestratorAgentBusy(false);
      });
  };

  const send = () => {
    if (!prompt.trim() || sendBusyRef.current) return;
    if (orchestratorContext === "project" && !activeProfileProjectPath) return;
    if (proposeMode) {
      sendPropose();
      return;
    }
    if (planMode) {
      sendPlan();
      return;
    }
    if (fullAccessMode) {
      sendFullAccess();
      return;
    }
    const agentsToRun =
      selectedAgents.length > 0
        ? ORCHESTRATOR_AGENT_IDS.filter((id) => selectedAgents.includes(id))
        : [...ORCHESTRATOR_AGENT_IDS];
    if (agentsToRun.length === 0) return;

    sendBusyRef.current = true;
    const userText = prompt;
    const followUp = !!activeConversationId;
    const userMessage = createUserMessage(userText, attachedFiles);
    const dispatchedMessage = createDispatchedMessage(agentsToRun);
    const seedMessages = followUp
      ? [...orchestratorMessages, userMessage, dispatchedMessage]
      : [userMessage, dispatchedMessage];
    const filesForSend = attachedFiles;
    const id = ensureConversationForSend(userText, seedMessages);

    setPrompt("");
    setAttachedFiles([]);
    setClaudeReply("");
    setCodexReply("");
    setCursorReply("");
    setOpencodeReply("");

    const markRunning = (idAgent: OrchestratorAgentId) => {
      if (idAgent === "claude") setClaude({ status: "running" });
      else if (idAgent === "codex") setCodex({ status: "running" });
      else if (idAgent === "cursor") setCursor({ status: "running" });
      else setOpencode({ status: "running" });
    };
    for (const agentId of agentsToRun) markRunning(agentId);

    const sessions = followUp
      ? {
          claude: claudeSessionId,
          codex: codexThreadId,
          cursor: cursorSessionId,
          opencode: opencodeSessionId,
        }
      : {};

    const roleInstructions: Partial<Record<OrchestratorAgentId, string>> = {};
    for (const agentId of agentsToRun) {
      const instruction = roleInstruction(
        activeProfile?.id ?? null,
        selectedRoles[agentId],
      );
      if (instruction) roleInstructions[agentId] = instruction;
    }

    void runOrchestratorFanout({
      prompt: userText,
      agents: agentsToRun,
      context: orchestratorContext,
      roleInstructions,
      structuredResultEnabled: structuredResultMode,
      attachedFiles: filesForSend,
      models: {
        claudeModel,
        claudeEffort,
        codexModel,
        codexEffort,
        cursorModel,
        opencodeModel,
        opencodeEffort,
      },
      sessions,
      isStillActive: () => isStillActive(id),
      onAgentResult: (result) => {
        if (result.ok) {
          applyAgentResult(id, result.id, followUp, userText, {
            ok: true,
            reply: result.reply,
          });
        } else {
          applyAgentResult(id, result.id, followUp, userText, {
            ok: false,
            error: result.error,
          });
        }
      },
    })
      .then((results) => {
        const summary = summarizeFanoutResults(results);
        const completed = createCompletedMessage(summary);
        setOrchestratorMessages((prev) =>
          prev.some((m) => m.id === completed.id) ? prev : [...prev, completed],
        );
        const updated = upsertConversation(id, (c) => {
          const existing = c.orchestrator?.messages ?? [];
          if (existing.some((m) => m.id === completed.id)) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            orchestrator: {
              messages: [...existing, completed],
              fullAccessSessionId: c.orchestrator?.fullAccessSessionId ?? null,
              context: orchestratorContext,
              selectedAgents,
            },
          };
        });
        if (updated) archiveTranscript(updated);
      })
      .finally(() => {
        sendBusyRef.current = false;
      });
  };

  const synthesisAgentSnapshots = (): AgentReplySnapshot[] => [
    {
      id: "claude",
      replyText: lastAssistantText(claudeHistory),
      state: claude,
      structured: structuredResults.claude ?? null,
    },
    {
      id: "codex",
      replyText: lastAssistantText(codexHistory),
      state: codex,
      structured: structuredResults.codex ?? null,
    },
    {
      id: "cursor",
      replyText: lastAssistantText(cursorHistory),
      state: cursor,
      structured: structuredResults.cursor ?? null,
    },
    {
      id: "opencode",
      replyText: lastAssistantText(opencodeHistory),
      state: opencode,
      structured: structuredResults.opencode ?? null,
    },
  ];

  const appendOrchestratorMessage = (
    conversationId: string,
    message: OrchestratorMessage,
  ) => {
    const updated = upsertConversation(conversationId, (c) => {
      const existing = c.orchestrator?.messages ?? [];
      if (existing.some((m) => m.id === message.id)) return c;
      return {
        ...c,
        updatedAt: Date.now(),
        orchestrator: {
          messages: [...existing, message],
          fullAccessSessionId:
            c.orchestrator?.fullAccessSessionId ?? orchestratorAgentSessionId,
          context: c.orchestrator?.context ?? orchestratorContext,
          selectedAgents: c.orchestrator?.selectedAgents ?? selectedAgents,
        },
      };
    });
    if (updated) archiveTranscript(updated);
    if (!isStillActive(conversationId)) return;
    setOrchestratorMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
  };

  const updateOrchestratorMessage = (
    conversationId: string,
    messageId: string,
    updater: (m: OrchestratorMessage) => OrchestratorMessage,
  ) => {
    upsertConversation(conversationId, (c) => {
      const existing = c.orchestrator?.messages ?? [];
      const idx = existing.findIndex((m) => m.id === messageId);
      if (idx === -1) return c;
      const nextMessages = [...existing];
      nextMessages[idx] = updater(existing[idx]);
      return {
        ...c,
        updatedAt: Date.now(),
        orchestrator: {
          messages: nextMessages,
          fullAccessSessionId: c.orchestrator?.fullAccessSessionId ?? null,
          context: c.orchestrator?.context ?? orchestratorContext,
          selectedAgents: c.orchestrator?.selectedAgents ?? selectedAgents,
        },
      };
    });
    if (!isStillActive(conversationId)) return;
    setOrchestratorMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = updater(prev[idx]);
      return next;
    });
  };

  const setProposalPathStatus = (
    conversationId: string,
    messageId: string,
    path: string,
    status: ProposalChangeStatus,
  ) => {
    updateOrchestratorMessage(conversationId, messageId, (m) => ({
      ...m,
      proposalChangeStatus: {
        ...(m.proposalChangeStatus ?? {}),
        [path]: status,
      },
    }));
  };

  const applyProposalChange = (messageId: string, path: string) => {
    if (!activeConversationId) return;
    const conversationId = activeConversationId;
    const message = orchestratorMessages.find((m) => m.id === messageId);
    if (!message || message.kind !== "agent_proposal") return;
    const change = message.proposalChanges?.find((c) => c.path === path);
    if (!change) return;
    const context = message.proposalContext ?? orchestratorContext;
    setProposalPathStatus(conversationId, messageId, path, { state: "applying" });
    invoke<{ journalId: string }>("apply_orchestrator_change", {
      request: {
        context,
        path: change.path,
        oldContent: change.oldContent,
        newContent: change.newContent,
      },
    })
      .then((res) => {
        setProposalPathStatus(conversationId, messageId, path, {
          state: "applied",
          journalId: res.journalId,
        });
      })
      .catch((e) => {
        setProposalPathStatus(conversationId, messageId, path, {
          state: "applyError",
          error: String(e),
        });
      });
  };

  const rejectProposalChange = (messageId: string, path: string) => {
    if (!activeConversationId) return;
    setProposalPathStatus(activeConversationId, messageId, path, {
      state: "rejected",
    });
  };

  const rollbackProposalChange = (messageId: string, path: string) => {
    if (!activeConversationId) return;
    const conversationId = activeConversationId;
    const message = orchestratorMessages.find((m) => m.id === messageId);
    const status = message?.proposalChangeStatus?.[path];
    const journalId =
      status &&
      (status.state === "applied" ||
        status.state === "rollingBack" ||
        status.state === "rollbackError")
        ? status.journalId
        : null;
    if (!journalId) return;
    setProposalPathStatus(conversationId, messageId, path, {
      state: "rollingBack",
      journalId,
    });
    invoke("rollback_orchestrator_change", { journalId })
      .then(() => {
        setProposalPathStatus(conversationId, messageId, path, {
          state: "rolledBack",
        });
      })
      .catch((e) => {
        setProposalPathStatus(conversationId, messageId, path, {
          state: "rollbackError",
          error: String(e),
          journalId,
        });
      });
  };

  const synthesize = () => {
    if (
      !activeConversationId ||
      fullAccessMode ||
      planMode ||
      proposeMode ||
      busy ||
      synthesizeBusyRef.current ||
      sendBusyRef.current
    ) {
      return;
    }
    const agents = synthesisAgentSnapshots();
    if (!canRunSynthesis(agents)) return;

    const conversationId = activeConversationId;
    const sourceText = lastUserRoundText(
      orchestratorMessages,
      conversations.find((c) => c.id === activeConversationId)?.prompt ?? "",
    );
    const promptText = buildSynthesisPrompt({ sourceText, agents });

    synthesizeBusyRef.current = true;
    setSynthesizing(true);

    invoke<EngineReply>("run_claude", {
      prompt: promptText,
      sessionId: null,
      model: claudeModel,
      effort: claudeEffort,
      context: orchestratorContext,
    })
      .then((reply) => {
        appendOrchestratorMessage(
          conversationId,
          createSynthesisMessage(reply.text),
        );
      })
      .catch((e) => {
        appendOrchestratorMessage(
          conversationId,
          createSynthesisErrorMessage(String(e)),
        );
      })
      .finally(() => {
        synthesizeBusyRef.current = false;
        if (isStillActive(conversationId)) setSynthesizing(false);
        else setSynthesizing(false);
      });
  };

  const continueClaude = () => {
    const text = claudeReply.trim();
    if (!text || !claudeSessionId || !activeConversationId || claudeBusyRef.current) return;
    claudeBusyRef.current = true;
    const conversationId = activeConversationId;
    setClaude({ status: "running" });
    setClaudeReply("");
    const withUserTurn: ConversationTurn[] = [...claudeHistory, { role: "user", text, createdAt: Date.now() }];
    setClaudeHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      claude: { ...c.claude, history: withUserTurn },
    }));
    invoke<EngineReply>("run_claude", {
      prompt: text,
      sessionId: claudeSessionId,
      model: claudeModel,
      effort: claudeEffort,
      context: orchestratorContext,
    })
      .then((reply) => {
        const replyTurn: ConversationTurn = { role: "assistant", text: reply.text, createdAt: Date.now() };
        const updated = upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          claude: {
            history: [...c.claude.history, replyTurn],
            sessionId: reply.sessionId,
          },
        }));
        if (updated) archiveTranscript(updated);
        if (!isStillActive(conversationId)) return;
        setClaudeSessionId(reply.sessionId);
        setClaudeHistory((h) => [...h, replyTurn]);
        setClaude({ status: "done" });
      })
      .catch((e) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          claude: { ...c.claude, history: claudeHistory },
        }));
        if (isStillActive(conversationId)) {
          setClaude({ status: "error", message: String(e) });
          setClaudeHistory(claudeHistory);
          setClaudeReply(text);
        }
      })
      .finally(() => {
        claudeBusyRef.current = false;
      });
  };

  const continueCodex = () => {
    const text = codexReply.trim();
    if (!text || !codexThreadId || !activeConversationId || codexBusyRef.current) return;
    codexBusyRef.current = true;
    const conversationId = activeConversationId;
    setCodex({ status: "running" });
    setCodexReply("");
    const withUserTurn: ConversationTurn[] = [...codexHistory, { role: "user", text, createdAt: Date.now() }];
    setCodexHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      codex: { ...c.codex, history: withUserTurn },
    }));
    invoke<EngineReply>("run_codex", {
      prompt: text,
      sessionId: codexThreadId,
      model: codexModel,
      effort: codexEffort,
      context: orchestratorContext,
    })
      .then((reply) => {
        const replyTurn: ConversationTurn = { role: "assistant", text: reply.text, createdAt: Date.now() };
        const updated = upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          codex: {
            history: [...c.codex.history, replyTurn],
            sessionId: reply.sessionId,
          },
        }));
        if (updated) archiveTranscript(updated);
        if (isStillActive(conversationId)) {
          setCodexThreadId(reply.sessionId);
          setCodexHistory((h) => [...h, replyTurn]);
          setCodex({ status: "done" });
        }
        void refreshCodexLimits();
      })
      .catch((e) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          codex: { ...c.codex, history: codexHistory },
        }));
        if (isStillActive(conversationId)) {
          setCodex({ status: "error", message: String(e) });
          setCodexHistory(codexHistory);
          setCodexReply(text);
        }
        void refreshCodexLimits();
      })
      .finally(() => {
        codexBusyRef.current = false;
      });
  };

  const continueCursor = () => {
    const text = cursorReply.trim();
    if (!text || !cursorSessionId || !activeConversationId || cursorBusyRef.current) return;
    cursorBusyRef.current = true;
    const conversationId = activeConversationId;
    setCursor({ status: "running" });
    setCursorReply("");
    const withUserTurn: ConversationTurn[] = [...cursorHistory, { role: "user", text, createdAt: Date.now() }];
    setCursorHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      cursor: { ...c.cursor, history: withUserTurn },
    }));
    invoke<EngineReply>("run_cursor", {
      prompt: text,
      sessionId: cursorSessionId,
      model: cursorModel,
      context: orchestratorContext,
    })
      .then((reply) => {
        const replyTurn: ConversationTurn = { role: "assistant", text: reply.text, createdAt: Date.now() };
        const updated = upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          cursor: {
            history: [...c.cursor.history, replyTurn],
            sessionId: reply.sessionId,
          },
        }));
        if (updated) archiveTranscript(updated);
        if (!isStillActive(conversationId)) return;
        setCursorSessionId(reply.sessionId);
        setCursorHistory((h) => [...h, replyTurn]);
        setCursor({ status: "done" });
      })
      .catch((e) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          cursor: { ...c.cursor, history: cursorHistory },
        }));
        if (isStillActive(conversationId)) {
          setCursor({ status: "error", message: String(e) });
          setCursorHistory(cursorHistory);
          setCursorReply(text);
        }
      })
      .finally(() => {
        cursorBusyRef.current = false;
      });
  };

  const continueOpencode = () => {
    const text = opencodeReply.trim();
    if (!text || !opencodeSessionId || !activeConversationId || opencodeBusyRef.current) return;
    opencodeBusyRef.current = true;
    const conversationId = activeConversationId;
    setOpencode({ status: "running" });
    setOpencodeReply("");
    const withUserTurn: ConversationTurn[] = [...opencodeHistory, { role: "user", text, createdAt: Date.now() }];
    setOpencodeHistory(withUserTurn);
    upsertConversation(conversationId, (c) => ({
      ...c,
      updatedAt: Date.now(),
      opencode: { ...c.opencode, history: withUserTurn },
    }));
    invoke<EngineReply>("run_opencode", {
      prompt: text,
      sessionId: opencodeSessionId,
      model: opencodeModel,
      effort: opencodeEffort,
      context: orchestratorContext,
    })
      .then((reply) => {
        const replyTurn: ConversationTurn = { role: "assistant", text: reply.text, createdAt: Date.now() };
        const updated = upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          opencode: {
            history: [...c.opencode.history, replyTurn],
            sessionId: reply.sessionId,
          },
        }));
        if (updated) archiveTranscript(updated);
        if (!isStillActive(conversationId)) return;
        setOpencodeSessionId(reply.sessionId);
        setOpencodeHistory((h) => [...h, replyTurn]);
        setOpencode({ status: "done" });
      })
      .catch((e) => {
        upsertConversation(conversationId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          opencode: { ...c.opencode, history: opencodeHistory },
        }));
        if (isStillActive(conversationId)) {
          setOpencode({ status: "error", message: String(e) });
          setOpencodeHistory(opencodeHistory);
          setOpencodeReply(text);
        }
      })
      .finally(() => {
        opencodeBusyRef.current = false;
      });
  };

  const openConversation = (conversation: AgentConversation) => {
    setActiveConversationId(conversation.id);
    persistActiveConversationId(conversation.id);
    setPrompt("");
    setAttachedFiles([]);
    setClaudeHistory(conversation.claude.history);
    setClaudeSessionId(conversation.claude.sessionId);
    setClaude({ status: conversation.claude.history.length > 0 ? "done" : "idle" });
    setCodexHistory(conversation.codex.history);
    setCodexThreadId(conversation.codex.sessionId);
    setCodex({ status: conversation.codex.history.length > 0 ? "done" : "idle" });
    setCursorHistory(conversation.cursor.history);
    setCursorSessionId(conversation.cursor.sessionId);
    setCursor({ status: conversation.cursor.history.length > 0 ? "done" : "idle" });
    setOpencodeHistory(conversation.opencode.history);
    setOpencodeSessionId(conversation.opencode.sessionId);
    setOpencode({ status: conversation.opencode.history.length > 0 ? "done" : "idle" });
    setClaudeReply("");
    setCodexReply("");
    setCursorReply("");
    setOpencodeReply("");
    const orch = conversation.orchestrator?.messages;
    setOrchestratorMessages(
      orch && orch.length > 0
        ? orch
        : legacyMessagesFromConversation(conversation.prompt),
    );
    setExpandedAgentPanel(null);
    setFullAccessMode(false);
    setPlanMode(false);
    setProposeMode(false);
    setSelectedRolesState({});
    setStructuredResultMode(false);
    setStructuredResults({});
    setOrchestratorAgentSessionId(
      conversation.orchestrator?.fullAccessSessionId ?? null,
    );
    setOrchestratorPlanSessionId(null);
    setOrchestratorProposeSessionId(null);
    setOrchestratorAgentBusy(false);
    const restoredContext = conversation.orchestrator?.context;
    if (restoredContext === "free" || restoredContext === "project") {
      setOrchestratorContext(restoredContext);
      persistOrchestratorContext(restoredContext);
    }
    const restoredAgents = conversation.orchestrator?.selectedAgents;
    setSelectedAgents(
      restoredAgents && restoredAgents.length > 0
        ? ORCHESTRATOR_AGENT_IDS.filter((id) => restoredAgents.includes(id))
        : [...ORCHESTRATOR_AGENT_IDS],
    );
    setWorkspaceMode("agents");
    setView("workspace");
  };

  const resetActiveConversation = () => {
    setActiveConversationId(null);
    persistActiveConversationId(null);
    setAttachedFiles([]);
    setClaudeHistory([]);
    setCodexHistory([]);
    setCursorHistory([]);
    setOpencodeHistory([]);
    setClaudeSessionId(null);
    setCodexThreadId(null);
    setCursorSessionId(null);
    setOpencodeSessionId(null);
    setClaudeReply("");
    setCodexReply("");
    setCursorReply("");
    setOpencodeReply("");
    setClaude({ status: "idle" });
    setCodex({ status: "idle" });
    setCursor({ status: "idle" });
    setOpencode({ status: "idle" });
    setOrchestratorMessages([]);
    setExpandedAgentPanel(null);
    setSynthesizing(false);
    synthesizeBusyRef.current = false;
    setFullAccessMode(false);
    setPlanMode(false);
    setProposeMode(false);
    setSelectedRolesState({});
    setStructuredResultMode(false);
    setStructuredResults({});
    setOrchestratorAgentSessionId(null);
    setOrchestratorPlanSessionId(null);
    setOrchestratorProposeSessionId(null);
    setOrchestratorAgentBusy(false);
    setSelectedAgents([...ORCHESTRATOR_AGENT_IDS]);
  };

  const deleteConversation = (id: string) => {
    if (!window.confirm(t(locale, "agentHistoryDeleteConfirm"))) return;
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      persistConversations(next);
      return next;
    });
    if (activeConversationId === id) {
      resetActiveConversation();
      setPrompt("");
    }
  };

  const busy =
    orchestratorAgentBusy ||
    claude.status === "running" ||
    codex.status === "running" ||
    cursor.status === "running" ||
    opencode.status === "running";

  // Timestamp the send/synthesize call actually started, not when the
  // composer last mounted — OrchestratorChat unmounts while an agent's own
  // panel is expanded, so a component-local timer would reset to 0 on every
  // trip back even though the call kept running the whole time.
  const [activeSince, setActiveSince] = useState<number | null>(null);
  const isActive = busy || synthesizing;
  useEffect(() => {
    if (isActive) {
      setActiveSince((prev) => prev ?? Date.now());
    } else {
      setActiveSince(null);
    }
  }, [isActive]);

  const canSynthesize =
    !fullAccessMode &&
    !planMode &&
    !proposeMode &&
    !busy &&
    !synthesizing &&
    !!activeConversationId &&
    canRunSynthesis(synthesisAgentSnapshots());


  return {
    conversations,
    activeConversationId,
    prompt,
    setPrompt,
    attachedFiles,
    addAttachedFile,
    removeAttachedFile,
    activeSince,
    claude,
    codex,
    cursor,
    opencode,
    claudeSessionId,
    codexThreadId,
    cursorSessionId,
    opencodeSessionId,
    claudeReply,
    setClaudeReply,
    codexReply,
    setCodexReply,
    cursorReply,
    setCursorReply,
    opencodeReply,
    setOpencodeReply,
    claudeHistory,
    codexHistory,
    cursorHistory,
    opencodeHistory,
    orchestratorMessages,
    expandedAgentPanel,
    setExpandedAgentPanel,
    fullAccessMode,
    planMode,
    proposeMode,
    orchestratorAgentSessionId,
    orchestratorPlanSessionId,
    orchestratorProposeSessionId,
    orchestratorAgentBusy,
    orchestratorContext,
    selectedAgents,
    selectedRoles,
    structuredResultMode,
    activeProfile,
    availableProfiles,
    profileSwitchError,
    activeProfileProjectPath,
    refreshActiveProfileProjectPath,
    synthesizing,
    busy,
    canSynthesize,
    send,
    sendFullAccess,
    sendPlan,
    sendPropose,
    synthesize,
    continueClaude,
    continueCodex,
    continueCursor,
    continueOpencode,
    toggleSelectedAgent,
    setAgentRole,
    setStructuredResultModeSafe,
    setActiveProfileId,
    setOrchestratorContextSafe,
    setFullAccessModeSafe,
    setPlanModeSafe,
    setProposeModeSafe,
    openConversation,
    deleteConversation,
    resetActiveConversation,
    applyProposalChange,
    rejectProposalChange,
    rollbackProposalChange,
  };
}
