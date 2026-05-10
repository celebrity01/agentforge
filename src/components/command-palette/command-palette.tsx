"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Settings,
  Key,
  Plus,
  MessageSquare,
  Code,
  FileText,
  Eye,
  Columns,
  Volume2,
  Brain,
  Trash2,
  Download,
  Layout,
  Cpu,
  Sparkles,
  Wrench,
  Image,
  Folder,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { AGENTS, PROMPT_TEMPLATES, type AgentId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "action" | "agent" | "model" | "template" | "navigation";
  onSelect: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentAgent,
    setSettingsOpen,
    clearMessages,
    setCurrentConversationId,
    setSplitView,
    geminiApiKey,
    setGeminiApiKey,
    setIsGeminiConnected,
  } = useAppStore();

  const MODELS = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", icon: <Cpu className="size-3.5 text-emerald-500" /> },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", icon: <Cpu className="size-3.5 text-violet-500" /> },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", icon: <Cpu className="size-3.5 text-blue-500" /> },
  ];

  const actions: PaletteAction[] = [
    // Navigation
    { id: "settings", label: "Open Settings", description: "Configure API key, model, theme", icon: <Settings className="size-3.5" />, category: "navigation", onSelect: () => setSettingsOpen(true) },
    { id: "new-chat", label: "New Chat", description: "Start a fresh conversation", icon: <Plus className="size-3.5 text-emerald-500" />, category: "action", onSelect: () => { clearMessages(); setCurrentConversationId(null); } },
    { id: "split-view", label: "Toggle Split View", description: "Chat with both agents side by side", icon: <Columns className="size-3.5 text-blue-500" />, category: "action", onSelect: () => setSplitView({ isOpen: !useAppStore.getState().splitView.isOpen }) },

    // Agents
    ...AGENTS.map((a) => ({
      id: `agent-${a.id}`,
      label: `Switch to ${a.name}`,
      description: a.description.slice(0, 60),
      icon: <span className="text-sm">{a.icon}</span>,
      category: "agent" as const,
      onSelect: () => setCurrentAgent(a.id as AgentId),
    })),

    // Models
    ...MODELS.map((m) => ({
      id: `model-${m.id}`,
      label: `Use ${m.name}`,
      description: "Switch AI model",
      icon: m.icon,
      category: "model" as const,
      onSelect: () => useAppStore.getState().updateSettings({ model: m.id }),
    })),

    // Templates
    ...PROMPT_TEMPLATES.map((t) => ({
      id: `template-${t.id}`,
      label: t.title,
      description: t.description,
      icon: <span className="text-sm">{t.icon}</span>,
      category: "template" as const,
      onSelect: () => {
        // This will be handled by the parent
        setCommandPaletteOpen(false);
      },
    })),

    // Quick actions
    { id: "clear-history", label: "Clear Chat History", description: "Remove all messages", icon: <Trash2 className="size-3.5 text-red-500" />, category: "action", onSelect: () => { clearMessages(); setCurrentConversationId(null); } },
    { id: "export", label: "Export Chat", description: "Download as markdown", icon: <Download className="size-3.5 text-teal-500" />, category: "action", onSelect: () => { /* handled by parent */ } },
  ];

  const filtered = query
    ? actions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase())
      )
    : actions;

  const categories = ["action", "agent", "model", "template", "navigation"] as const;
  const categoryLabels: Record<string, string> = {
    action: "Actions",
    agent: "Switch Agent",
    model: "Change Model",
    template: "Quick Templates",
    navigation: "Navigation",
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].onSelect();
        setCommandPaletteOpen(false);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    },
    [filtered, selectedIndex, setCommandPaletteOpen]
  );

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found
            </p>
          )}
          {categories.map((cat) => {
            const catItems = filtered.filter((a) => a.category === cat);
            if (catItems.length === 0) return null;
            const catIdx = filtered.indexOf(catItems[0]);

            return (
              <div key={cat}>
                <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {categoryLabels[cat]}
                </div>
                {catItems.map((action, i) => {
                  const globalIdx = catIdx + i;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onSelect();
                        setCommandPaletteOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors",
                        globalIdx === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex size-7 items-center justify-center rounded-md bg-muted shrink-0">
                        {action.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{action.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {action.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
