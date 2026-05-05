import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export type AgentDomain = "finance" | "code" | "research" | "web" | "system";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agents_used?: AgentDomain[];
  duration_ms?: number;
}

export interface AgentNode {
  domain: AgentDomain;
  status: "idle" | "running" | "complete" | "error";
  last_run?: Date;
  duration_ms?: number;
  tools_used?: string[];
}

export interface OrchestratorPlan {
  intent: string;
  domains: AgentDomain[];
  parallel: boolean;
  reasoning: string;
}

export interface WSEvent {
  type: string;
  session_id: string;
  data: Record<string, any>;
  timestamp: string;
}

const DEFAULT_AGENTS: Record<AgentDomain, AgentNode> = {
  finance:  { domain: "finance",  status: "idle" },
  code:     { domain: "code",     status: "idle" },
  research: { domain: "research", status: "idle" },
  web:      { domain: "web",      status: "idle" },
  system:   { domain: "system",   status: "idle" },
};

interface AXIOMState {
  sessionId: string;
  newSession: () => void;
  messages: Message[];
  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  clearMessages: () => void;
  agents: Record<AgentDomain, AgentNode>;
  setAgentStatus: (domain: AgentDomain, status: AgentNode["status"], meta?: Partial<AgentNode>) => void;
  resetAgents: () => void;
  isRunning: boolean;
  currentPlan: OrchestratorPlan | null;
  streamingContent: string;
  appendStreamToken: (token: string) => void;
  clearStream: () => void;
  setRunning: (v: boolean) => void;
  setPlan: (plan: OrchestratorPlan | null) => void;
  wsStatus: "disconnected" | "connecting" | "connected" | "error";
  setWsStatus: (s: AXIOMState["wsStatus"]) => void;
  handleWSEvent: (event: WSEvent) => void;
}

export const useAXIOMStore = create<AXIOMState>()((set, get) => ({
  sessionId: uuidv4(),
  newSession: () => set({ sessionId: uuidv4(), messages: [], currentPlan: null, streamingContent: "", isRunning: false, agents: { ...DEFAULT_AGENTS } }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: uuidv4(), timestamp: new Date() }] })),
  clearMessages: () => set({ messages: [] }),

  agents: { ...DEFAULT_AGENTS },
  setAgentStatus: (domain, status, meta = {}) => set((s) => ({ agents: { ...s.agents, [domain]: { ...s.agents[domain], status, ...meta } } })),
  resetAgents: () => set({ agents: { ...DEFAULT_AGENTS } }),

  isRunning: false,
  currentPlan: null,
  streamingContent: "",
  appendStreamToken: (token) => set((s) => ({ streamingContent: s.streamingContent + token })),
  clearStream: () => set({ streamingContent: "" }),
  setRunning: (v) => set({ isRunning: v }),
  setPlan: (plan) => set({ currentPlan: plan }),

  wsStatus: "disconnected",
  setWsStatus: (s) => set({ wsStatus: s }),

  handleWSEvent: (event) => {
    const { type, data } = event;
    const store = get();

    switch (type) {
      case "connected":
        set({ wsStatus: "connected" });
        break;

      case "plan":
        set({
          currentPlan: {
            intent: data.intent as string,
            domains: data.domains as AgentDomain[],
            parallel: data.parallel as boolean,
            reasoning: data.reasoning as string,
          },
          isRunning: true,
          streamingContent: "",
        });
        // Mark all plan domains as running
        const planDomains = data.domains as AgentDomain[];
        planDomains.forEach(d => store.setAgentStatus(d, "running"));
        break;

      case "agent_start":
        store.setAgentStatus(data.domain as AgentDomain, "running");
        break;

      case "agent_complete":
        store.setAgentStatus(data.domain as AgentDomain, "complete", {
          duration_ms: data.duration_ms as number,
          tools_used: data.tools_used as string[],
          last_run: new Date(),
        });
        break;

      case "synthesis_token":
        // This carries the full output — set it directly, don't append
        const token = data.token as string;
        if (token) {
          set({ streamingContent: token });
        }
        break;

      case "complete": {
        const content = get().streamingContent;
        const plan = get().currentPlan;
        if (content) {
          store.addMessage({
            role: "assistant",
            content,
            agents_used: plan?.domains,
          });
        }
        set({ isRunning: false, streamingContent: "", currentPlan: null });
        // Reset agents to idle after short delay
        setTimeout(() => store.resetAgents(), 2000);
        break;
      }

      case "error":
        set({ isRunning: false, streamingContent: "" });
        break;
    }
  },
}));