import { create } from "zustand";
import type { AgentId, Message, Conversation, Settings, Snippet, MemoryEntry, ReactionType } from "./types";

interface PreviewState {
  code: string;
  language: string;
  isOpen: boolean;
}

interface SplitViewState {
  isOpen: boolean;
  leftAgent: AgentId;
  rightAgent: AgentId;
  leftMessages: Message[];
  rightMessages: Message[];
}

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

  // Code Preview
  preview: PreviewState;
  openPreview: (code: string, language: string) => void;
  closePreview: () => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Snippet Library
  snippets: Snippet[];
  addSnippet: (snippet: Snippet) => void;
  removeSnippet: (id: string) => void;
  togglePinSnippet: (id: string) => void;

  // Agent Memory
  memories: MemoryEntry[];
  addMemory: (entry: MemoryEntry) => void;
  removeMemory: (id: string) => void;
  clearMemories: () => void;

  // Reaction on message
  setReaction: (messageId: string, reaction: ReactionType) => void;

  // Split View
  splitView: SplitViewState;
  setSplitView: (update: Partial<SplitViewState>) => void;
  addSplitMessage: (side: "left" | "right", message: Message) => void;

  // Voice
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;

  // Fork
  forkFromMessage: (messageId: string) => void;
  activeForkId: string | null;
  setActiveForkId: (id: string | null) => void;
}

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  geminiApiKey: getStored("agentforge-api-key", ""),
  setGeminiApiKey: (key) => {
    persist("agentforge-api-key", key);
    set({ geminiApiKey: key, isGeminiConnected: !!key });
  },
  isGeminiConnected: !!getStored("agentforge-api-key", ""),
  setIsGeminiConnected: (connected) => set({ isGeminiConnected: connected }),

  // Code Preview
  preview: { code: "", language: "", isOpen: false },
  openPreview: (code, language) =>
    set({ preview: { code, language, isOpen: true } }),
  closePreview: () =>
    set({ preview: { code: "", language: "", isOpen: false } }),

  // Command Palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Snippet Library
  snippets: getStored("agentforge-snippets", []),
  addSnippet: (snippet) =>
    set((state) => {
      const updated = [snippet, ...state.snippets];
      persist("agentforge-snippets", updated);
      return { snippets: updated };
    }),
  removeSnippet: (id) =>
    set((state) => {
      const updated = state.snippets.filter((s) => s.id !== id);
      persist("agentforge-snippets", updated);
      return { snippets: updated };
    }),
  togglePinSnippet: (id) =>
    set((state) => {
      const updated = state.snippets.map((s) =>
        s.id === id ? { ...s, pinned: !s.pinned } : s
      );
      persist("agentforge-snippets", updated);
      return { snippets: updated };
    }),

  // Agent Memory
  memories: getStored("agentforge-memories", []),
  addMemory: (entry) =>
    set((state) => {
      const updated = [entry, ...state.memories].slice(0, 100); // Max 100
      persist("agentforge-memories", updated);
      return { memories: updated };
    }),
  removeMemory: (id) =>
    set((state) => {
      const updated = state.memories.filter((m) => m.id !== id);
      persist("agentforge-memories", updated);
      return { memories: updated };
    }),
  clearMemories: () => {
    persist("agentforge-memories", []);
    set({ memories: [] });
  },

  // Reaction
  setReaction: (messageId, reaction) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reaction } : m
      ),
    })),

  // Split View
  splitView: {
    isOpen: false,
    leftAgent: "openmanus",
    rightAgent: "gemini",
    leftMessages: [],
    rightMessages: [],
  },
  setSplitView: (update) =>
    set((state) => ({
      splitView: { ...state.splitView, ...update },
    })),
  addSplitMessage: (side, message) =>
    set((state) => {
      const key = side === "left" ? "leftMessages" : "rightMessages";
      return {
        splitView: {
          ...state.splitView,
          [key]: [...state.splitView[key], message],
        },
      };
    }),

  // Voice
  isSpeaking: false,
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  // Fork
  forkFromMessage: (messageId) => {
    const state = get();
    const idx = state.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const forkId = `fork-${Date.now()}`;
    const forkedMessages = state.messages.slice(0, idx + 1).map((m) => ({
      ...m,
      forkId,
    }));
    set({
      messages: forkedMessages,
      activeForkId: forkId,
    });
  },
  activeForkId: null,
  setActiveForkId: (id) => set({ activeForkId: id }),
}));
