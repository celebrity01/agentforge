import { create } from "zustand";
import type { AgentId, Message, Conversation, Settings } from "./types";

interface AppState {
  // Agent
  currentAgent: AgentId;
  setCurrentAgent: (agent: AgentId) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;

  // Conversations
  conversations: Conversation[];
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Settings panel
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Gemini API Key
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  isGeminiConnected: boolean;
  setIsGeminiConnected: (connected: boolean) => void;
}

function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("agentforge-gemini-api-key") || "";
  } catch {
    return "";
  }
}

function persistApiKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    if (key) {
      localStorage.setItem("agentforge-gemini-api-key", key);
    } else {
      localStorage.removeItem("agentforge-gemini-api-key");
    }
  } catch {
    // Ignore
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Agent
  currentAgent: "gemini",
  setCurrentAgent: (agent) => set({ currentAgent: agent }),

  // Messages
  messages: [],
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  clearMessages: () => set({ messages: [] }),

  // Conversations
  conversations: [],
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    })),
  currentConversationId: null,
  setCurrentConversationId: (id) => set({ currentConversationId: id }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Settings
  settings: {
    geminiApiKey: "",
    model: "gemini-2.5-flash",
    theme: "dark",
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Settings panel
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Gemini API Key
  geminiApiKey: getStoredApiKey(),
  setGeminiApiKey: (key) => {
    persistApiKey(key);
    set({ geminiApiKey: key, isGeminiConnected: !!key });
  },
  isGeminiConnected: !!getStoredApiKey(),
  setIsGeminiConnected: (connected) => set({ isGeminiConnected: connected }),
}));
