export type AgentId = "openmanus" | "gemini";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent: AgentId;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  args?: Record<string, unknown>;
  result?: string;
}

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  capabilities: string[];
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  requiresAuth: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  agent: AgentId;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  geminiApiKey: string;
  openaiApiKey: string;
  model: string;
  theme: "light" | "dark" | "system";
}

export interface GeminiAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  userEmail: string | null;
  userAvatar: string | null;
  userName: string | null;
}

export const AGENTS: Agent[] = [
  {
    id: "openmanus",
    name: "OpenManus",
    description:
      "Multi-agent autonomous task executor powered by Gemini. Plans, codes, and deploys complex workflows with tool-using capabilities — using Gemini as its brain.",
    capabilities: [
      "Autonomous Task Planning",
      "Code Generation & Execution",
      "Web Search & Browsing",
      "Gemini-Powered Reasoning",
      "Multi-step Reasoning",
      "Tool Chain Orchestration",
    ],
    icon: "🔧",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    requiresAuth: true,
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    description:
      "Code-focused AI assistant powered by Gemini. Terminal-native with search-grounded responses and deep code understanding.",
    capabilities: [
      "Code Analysis & Generation",
      "Search-Grounded Answers",
      "Terminal Command Help",
      "Debugging & Testing",
      "Documentation Lookup",
      "Multi-language Support",
    ],
    icon: "✨",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    requiresAuth: true,
  },
];
