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
  LogOut,
  User,
  Crown,
  Brain,
} from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { useSyncExternalStore, useCallback } from "react";

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
    geminiAuth,
    clearGeminiAuth,
  } = useAppStore();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

  const handleGeminiLogin = useCallback(() => {
    // Open OAuth flow in a popup window — uses Gemini CLI's built-in
    // Google OAuth client, same as running `gemini` and choosing "Login with Google"
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      "/api/auth/gemini",
      "gemini-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes,status=no`
    );
  }, []);

  const handleGeminiLogout = useCallback(() => {
    clearGeminiAuth();
  }, [clearGeminiAuth]);

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
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
        {/* Gemini Connection Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-muted-foreground flex items-center gap-1">
            <Brain className="size-3" /> Gemini Connection
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {geminiAuth.isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                  {geminiAuth.userAvatar ? (
                    <img
                      src={geminiAuth.userAvatar}
                      alt=""
                      className="size-8 rounded-full"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <User className="size-4 text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {geminiAuth.userName || "Authenticated"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {geminiAuth.userEmail || "Gemini connected"}
                    </p>
                  </div>
                  <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  <Crown className="size-3 text-amber-500" />
                  <span className="text-[10px] text-muted-foreground">
                    Pro sub? You get 1,500 req/day. Free tier: 1,000 req/day.
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Both agents use Gemini as their brain via your Google account
                  — same login as Gemini CLI.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={handleGeminiLogout}
                >
                  <LogOut className="size-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground px-1">
                  Sign in with the same Google account you use for Gemini CLI.
                  Uses the official Gemini OAuth flow — your Pro subscription
                  gives you higher limits automatically.
                </p>
                <Button
                  className="w-full gap-2 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:border-white/20"
                  size="sm"
                  onClick={handleGeminiLogin}
                >
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign in with Google
                </Button>
                <div className="flex items-center gap-1.5 px-1">
                  <Crown className="size-3 text-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    Gemini Pro subscribers get 1,500 req/day
                  </span>
                </div>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* New Chat Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              onClick={handleNewChat}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Plus className="size-4" />
              New Chat
            </Button>
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
