export type AgentId = "openmanus" | "gemini";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent: AgentId;
  timestamp: number;
  toolCalls?: ToolCall[];
  imageData?: string; // base64 image data for generated images
  imagePrompt?: string;
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
  model: string;
  theme: "light" | "dark" | "system";
}

export const AGENTS: Agent[] = [
  {
    id: "openmanus",
    name: "OpenManus",
    description:
      "Autonomous task executor with web search, code execution, file I/O, and image generation. Powered by Gemini.",
    capabilities: [
      "Web Search & Research",
      "Code Execution (Python)",
      "File Read & Write",
      "Image Generation",
      "Multi-step Planning",
      "Tool Chain Orchestration",
    ],
    icon: "🔧",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    description:
      "Code-focused AI assistant with deep code understanding, debugging, and terminal expertise.",
    capabilities: [
      "Code Analysis & Generation",
      "Image Generation",
      "Debugging & Testing",
      "Documentation Lookup",
      "Code Improvement",
      "Multi-language Support",
    ],
    icon: "✨",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
  },
];
