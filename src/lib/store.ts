import { create } from "zustand";
import type { AgentId, Message, Conversation, Settings, GeminiAuthState } from "./types";

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

  // Gemini Auth
  geminiAuth: GeminiAuthState;
  setGeminiAuth: (auth: Partial<GeminiAuthState>) => void;
  clearGeminiAuth: () => void;
}

const initialGeminiAuth: GeminiAuthState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  userEmail: null,
  userAvatar: null,
  userName: null,
};

// Try to load persisted auth from localStorage on client
function getInitialAuth(): GeminiAuthState {
  if (typeof window === "undefined") return initialGeminiAuth;
  try {
    const stored = localStorage.getItem("agentforge-gemini-auth");
    if (stored) {
      const parsed = JSON.parse(stored) as GeminiAuthState;
      // Check if token is expired
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return parsed;
      }
      // Token expired, clear it
      localStorage.removeItem("agentforge-gemini-auth");
    }
  } catch {
    // Ignore parse errors
  }
  return initialGeminiAuth;
}

function persistAuth(auth: GeminiAuthState) {
  if (typeof window === "undefined") return;
  try {
    if (auth.isAuthenticated) {
      localStorage.setItem("agentforge-gemini-auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("agentforge-gemini-auth");
    }
  } catch {
    // Ignore storage errors
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
    openaiApiKey: "",
    model: "gemini-2.5-pro",
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

  // Gemini Auth
  geminiAuth: getInitialAuth(),
  setGeminiAuth: (authUpdate) => {
    const newAuth = { ...get().geminiAuth, ...authUpdate };
    persistAuth(newAuth);
    set({ geminiAuth: newAuth });
  },
  clearGeminiAuth: () => {
    persistAuth(initialGeminiAuth);
    set({ geminiAuth: initialGeminiAuth });
  },
}));
