"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentCard } from "@/components/agent/agent-card";
import { useAppStore } from "@/lib/store";
import { AGENTS, type AgentId, type Conversation } from "@/lib/types";
import {
  Plus,
  Settings,
  Moon,
  Sun,
  Trash2,
  MessageSquare,
  Key,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Folder,
  File,
  RefreshCw,
  Download,
} from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { useSyncExternalStore, useCallback, useState, useEffect } from "react";

interface WorkspaceFile {
  name: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  path: string;
}

export function AppSidebar() {
  const {
    currentAgent,
    setCurrentAgent,
    conversations,
    currentConversationId,
    setCurrentConversationId,
    clearMessages,
    addConversation,
    deleteConversation,
    setSettingsOpen,
    geminiApiKey,
    setGeminiApiKey,
    isGeminiConnected,
    setIsGeminiConnected,
    messages,
  } = useAppStore();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const handleNewChat = () => {
    clearMessages();
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
  };

  const handleAgentSelect = (agentId: AgentId) => {
    setCurrentAgent(agentId);
    handleNewChat();
  };

  const handleConnectKey = useCallback(async () => {
    if (!tempKey.trim()) return;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${tempKey.trim()}`
      );
      if (res.ok) {
        setGeminiApiKey(tempKey.trim());
        setIsGeminiConnected(true);
        setShowKeyInput(false);
        setTempKey("");
      } else {
        const err = await res.json();
        alert(
          "Invalid API key: " + (err?.error?.message || "Please check your key")
        );
      }
    } catch {
      alert("Network error. Please try again.");
    }
  }, [tempKey, setGeminiApiKey, setIsGeminiConnected]);

  const handleDisconnect = useCallback(() => {
    setGeminiApiKey("");
    setIsGeminiConnected(false);
  }, [setGeminiApiKey, setIsGeminiConnected]);

  // Load workspace files
  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      const res = await fetch("/api/workspace");
      if (res.ok) {
        const data = await res.json();
        setWorkspaceFiles(data.files || []);
      }
    } catch {
      // Ignore
    }
    setWorkspaceLoading(false);
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace, messages]);

  // Export chat
  const exportChat = useCallback(() => {
    const agentInfo = AGENTS.find((a) => a.id === currentAgent);
    let md = `# AgentForge Chat Export\n\n`;
    md += `**Agent:** ${agentInfo?.name || "Unknown"}\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      if (msg.role === "user") {
        md += `### You (${time})\n\n${msg.content}\n\n`;
      } else {
        const a = AGENTS.find((ag) => ag.id === msg.agent);
        md += `### ${a?.name || "AI"} (${time})\n\n${msg.content}\n\n`;
      }
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentforge-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, currentAgent]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-violet-500/20">
            <span className="text-base">⚡</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">AgentForge</h1>
            <p className="text-[10px] text-muted-foreground">
              Unified AI Agent Hub
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Gemini API Key Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground flex items-center gap-1">
            <Key className="size-3" /> Gemini API
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isGeminiConnected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <Check className="size-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Gemini Connected
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {geminiApiKey.slice(0, 8)}...{geminiApiKey.slice(-4)}
                    </p>
                  </div>
                  <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={handleDisconnect}
                >
                  <X className="size-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground px-1">
                  Enter your Gemini API key to power both agents. Get a free key
                  at Google AI Studio.
                </p>
                {showKeyInput ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="AIzaSy..."
                        value={tempKey}
                        onChange={(e) => setTempKey(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConnectKey();
                        }}
                        className="text-xs pr-8 h-8"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 size-8"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </Button>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="flex-1 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleConnectKey}
                        disabled={!tempKey.trim()}
                      >
                        <Check className="size-3" />
                        Connect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setShowKeyInput(false);
                          setTempKey("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                      onClick={() => setShowKeyInput(true)}
                    >
                      <Key className="size-3.5" />
                      Enter API Key
                    </Button>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-1 text-[10px] text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Get free API key from Google AI Studio
                    </a>
                  </>
                )}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* New Chat & Export */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex gap-1.5">
              <Button
                onClick={handleNewChat}
                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                <Plus className="size-4" />
                New Chat
              </Button>
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-xs"
                  onClick={exportChat}
                  title="Export chat as markdown"
                >
                  <Download className="size-3.5" />
                </Button>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent Selection */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">
            Select Agent
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            {AGENTS.map((agent) => (
              <AgentCard
                key={agent.id}
                agentId={agent.id as AgentId}
                isSelected={currentAgent === agent.id}
                onSelect={handleAgentSelect}
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Workspace Files */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Folder className="size-3" /> Workspace
            </span>
            <button
              onClick={loadWorkspace}
              className="p-0.5 rounded hover:bg-accent transition-colors"
              title="Refresh files"
            >
              <RefreshCw className={`size-3 ${workspaceLoading ? "animate-spin" : ""}`} />
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {workspaceFiles.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-2 py-2">
                No files yet. OpenManus will create files here.
              </p>
            ) : (
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {workspaceFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/50 transition-colors cursor-default"
                  >
                    {file.type === "directory" ? (
                      <Folder className="size-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <File className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-[10px] truncate flex-1 font-mono">
                      {file.name}
                    </span>
                    {file.type === "file" && file.size > 0 && (
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {formatSize(file.size)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Conversation History */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground">
            Recent Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.length === 0 ? (
                <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No conversations yet
                </li>
              ) : (
                conversations.map((conv) => (
                  <SidebarMenuItem key={conv.id}>
                    <SidebarMenuButton
                      isActive={currentConversationId === conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="size-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-xs font-medium">
                          {conv.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(new Date(conv.updatedAt), "MMM d, HH:mm")}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 gap-2 justify-start text-xs"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
            <span>Settings</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
