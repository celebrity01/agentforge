"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { MessageInput } from "@/components/chat/message-input";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useAppStore } from "@/lib/store";
import { AGENTS, type Message } from "@/lib/types";
import { useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const {
    messages,
    addMessage,
    updateMessage,
    currentAgent,
    isLoading,
    setIsLoading,
    currentConversationId,
    addConversation,
    updateConversation,
    geminiAuth,
    setGeminiAuth,
    clearGeminiAuth,
  } = useAppStore();

  const agent = AGENTS.find((a) => a.id === currentAgent);

  // Listen for OAuth callback messages from the popup window
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "gemini-auth-success") {
        setGeminiAuth({
          isAuthenticated: true,
          accessToken: event.data.accessToken,
          refreshToken: event.data.refreshToken,
          expiresAt: event.data.expiresAt,
          userEmail: event.data.userEmail,
          userName: event.data.userName,
          userAvatar: event.data.userAvatar,
        });
      } else if (event.data?.type === "gemini-auth-error") {
        console.error("Gemini auth error:", event.data.error);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setGeminiAuth]);

  // Auto-refresh token before it expires
  useEffect(() => {
    if (!geminiAuth.isAuthenticated || !geminiAuth.refreshToken || !geminiAuth.expiresAt) {
      return;
    }

    // Refresh 5 minutes before expiry
    const refreshTime = geminiAuth.expiresAt - 5 * 60 * 1000;
    const now = Date.now();

    if (refreshTime <= now) {
      // Token needs immediate refresh
      refreshAuthToken(geminiAuth.refreshToken);
      return;
    }

    const timeout = setTimeout(() => {
      refreshAuthToken(geminiAuth.refreshToken!);
    }, refreshTime - now);

    return () => clearTimeout(timeout);
  }, [geminiAuth.isAuthenticated, geminiAuth.refreshToken, geminiAuth.expiresAt, setGeminiAuth]);

  async function refreshAuthToken(refreshToken: string) {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiAuth({
          accessToken: data.accessToken,
          expiresAt: data.expiresAt,
        });
      } else {
        // Refresh failed, clear auth
        clearGeminiAuth();
      }
    } catch {
      // Network error, don't clear auth — might be temporary
    }
  }

  // Check auth status on mount
  useEffect(() => {
    // Check if stored auth is still valid
    if (geminiAuth.isAuthenticated && geminiAuth.expiresAt) {
      if (geminiAuth.expiresAt <= Date.now()) {
        // Token expired, try to refresh
        if (geminiAuth.refreshToken) {
          refreshAuthToken(geminiAuth.refreshToken);
        } else {
          clearGeminiAuth();
        }
      }
    }
  }, [geminiAuth.isAuthenticated, geminiAuth.expiresAt, geminiAuth.refreshToken, clearGeminiAuth, setGeminiAuth]);

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      // Save conversation if new
      if (!currentConversationId) {
        const convId = uuidv4();
        const conv = {
          id: convId,
          title: content.slice(0, 40) + (content.length > 40 ? "..." : ""),
          agent: currentAgent,
          messages: [userMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addConversation(conv);
        useAppStore.setState({ currentConversationId: convId });
      } else {
        updateConversation(currentConversationId, {
          messages: [...messages, userMessage],
          updatedAt: Date.now(),
        });
      }

      setIsLoading(true);

      const assistantMessageId = uuidv4();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);

      try {
        const chatMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatMessages,
            agent: currentAgent,
            geminiAccessToken: geminiAuth.isAuthenticated
              ? geminiAuth.accessToken
              : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.done) {
                  break;
                }
                if (parsed.error) {
                  accumulatedContent += `\n\n*Error: ${parsed.error}*`;
                  updateMessage(assistantMessageId, {
                    content: accumulatedContent,
                  });
                  break;
                }
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateMessage(assistantMessageId, {
                    content: accumulatedContent,
                  });
                }
              } catch {
                // Skip malformed data
              }
            }
          }
        }

        // Final update to ensure content is set
        if (!accumulatedContent) {
          updateMessage(assistantMessageId, {
            content:
              "I apologize, but I couldn't generate a response. Please try again.",
          });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessage(assistantMessageId, {
          content:
            "I'm sorry, I encountered an error while processing your request. Please check your connection and try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      currentAgent,
      currentConversationId,
      addMessage,
      updateMessage,
      setIsLoading,
      addConversation,
      updateConversation,
      geminiAuth.isAuthenticated,
      geminiAuth.accessToken,
    ]
  );

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-background/80 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <span className="text-base">{agent?.icon}</span>
              <div>
                <h2 className="text-sm font-semibold leading-none">
                  {agent?.name || "AgentForge"}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isLoading
                    ? "Thinking..."
                    : geminiAuth.isAuthenticated
                      ? `Gemini connected · ${geminiAuth.userEmail || "Authenticated"}`
                      : "Ready"}
                </p>
              </div>
            </div>
            {/* Auth status indicator */}
            {geminiAuth.isAuthenticated && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Gemini Connected
                  </span>
                </div>
              </div>
            )}
            {isLoading && !geminiAuth.isAuthenticated && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                  <div className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Streaming
                  </span>
                </div>
              </div>
            )}
            {isLoading && geminiAuth.isAuthenticated && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                  <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Streaming
                  </span>
                </div>
              </div>
            )}
          </header>

          {/* Chat Area */}
          <ChatInterface />

          {/* Input */}
          <MessageInput onSend={handleSend} disabled={isLoading} />
        </div>
      </SidebarInset>

      {/* Settings Panel */}
      <SettingsPanel />
    </SidebarProvider>
  );
}
