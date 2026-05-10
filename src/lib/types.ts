export type AgentId = "openmanus" | "gemini";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent: AgentId;
  timestamp: number;
  toolCalls?: ToolCall[];
  imageData?: string;
  imagePrompt?: string;
  reaction?: ReactionType;
  parentId?: string; // For conversation forking
  forkId?: string;   // Which fork branch this belongs to
}

export type ReactionType = "helpful" | "not-helpful" | "insightful" | "bug" | "love";

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

// ─── New Feature Types ────────────────────────────────────────────────────

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  agent: AgentId;
  createdAt: number;
  pinned: boolean;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  createdAt: number;
  source: "user" | "agent" | "auto";
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
  category: "code" | "writing" | "research" | "creative" | "business" | "devops";
  agent: AgentId | "both";
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

// ─── Prompt Templates ─────────────────────────────────────────────────────

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "prd",
    title: "Write a PRD",
    description: "Product Requirements Document",
    icon: "📋",
    prompt: "Write a comprehensive Product Requirements Document for: ",
    category: "business",
    agent: "both",
  },
  {
    id: "landing-page",
    title: "Build a Landing Page",
    description: "Complete HTML/CSS/JS landing page",
    icon: "🌐",
    prompt: "Build a complete, modern landing page with HTML, CSS, and JavaScript for: ",
    category: "code",
    agent: "openmanus",
  },
  {
    id: "rest-api",
    title: "Design a REST API",
    description: "API endpoints with schemas",
    icon: "🔌",
    prompt: "Design a complete REST API with endpoints, request/response schemas, and error handling for: ",
    category: "code",
    agent: "gemini",
  },
  {
    id: "unit-tests",
    title: "Generate Unit Tests",
    description: "Comprehensive test suite",
    icon: "🧪",
    prompt: "Write a comprehensive unit test suite with edge cases for this code: ",
    category: "code",
    agent: "gemini",
  },
  {
    id: "blog-post",
    title: "Write a Blog Post",
    description: "Engaging article with SEO",
    icon: "📝",
    prompt: "Write an engaging, SEO-optimized blog post about: ",
    category: "writing",
    agent: "both",
  },
  {
    id: "competitor-analysis",
    title: "Competitor Analysis",
    description: "Research competitors in depth",
    icon: "🔍",
    prompt: "Research and provide a detailed competitor analysis for: ",
    category: "research",
    agent: "openmanus",
  },
  {
    id: "docker-compose",
    title: "Docker Compose Setup",
    description: "Containerized dev environment",
    icon: "🐳",
    prompt: "Create a complete Docker Compose setup with proper networking and volumes for: ",
    category: "devops",
    agent: "gemini",
  },
  {
    id: "app-architecture",
    title: "App Architecture Plan",
    description: "System design with diagrams",
    icon: "🏗️",
    prompt: "Design the complete architecture for a production-ready application: ",
    category: "code",
    agent: "openmanus",
  },
  {
    id: "email-campaign",
    title: "Email Campaign",
    description: "Marketing email sequence",
    icon: "📧",
    prompt: "Write a 5-email marketing campaign sequence for: ",
    category: "business",
    agent: "both",
  },
  {
    id: "data-pipeline",
    title: "Data Pipeline",
    description: "ETL/data processing script",
    icon: "📊",
    prompt: "Build a data pipeline/ETL script that: ",
    category: "code",
    agent: "openmanus",
  },
  {
    id: "pitch-deck",
    title: "Pitch Deck Outline",
    description: "Startup investor pitch",
    icon: "🎯",
    prompt: "Create a compelling pitch deck outline with key slides for: ",
    category: "business",
    agent: "both",
  },
  {
    id: "debug-error",
    title: "Debug an Error",
    description: "Find root cause & fix",
    icon: "🐛",
    prompt: "I'm getting this error, help me find the root cause and fix it: ",
    category: "code",
    agent: "gemini",
  },
];
