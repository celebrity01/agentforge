"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { MessageInput } from "@/components/chat/message-input";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useAppStore } from "@/lib/store";
import { AGENTS, type Message } from "@/lib/types";
import { useCallback } from "react";
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
    geminiApiKey,
    isGeminiConnected,
  } = useAppStore();

  const agent = AGENTS.find((a) => a.id === currentAgent);

  const handleSend = useCallback(
    async (content: string) => {
      if (!isGeminiConnected) {
        alert("Please connect your Gemini API key first. Click 'Enter API Key' in the sidebar.");
        return;
      }

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
            geminiApiKey: geminiApiKey || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send message");
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

        // Final update
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
            error instanceof Error
              ? `Error: ${error.message}`
              : "I'm sorry, I encountered an error. Please check your API key and try again.",
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
      geminiApiKey,
      isGeminiConnected,
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
                    : isGeminiConnected
                      ? "Gemini connected"
                      : "No API key"}
                </p>
              </div>
            </div>
            {/* Connection status */}
            {isGeminiConnected && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                  <div className={`size-1.5 rounded-full ${isLoading ? "animate-pulse" : ""} bg-emerald-500`} />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {isLoading ? "Streaming" : "Gemini Live"}
                  </span>
                </div>
              </div>
            )}
            {!isGeminiConnected && (
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                  <div className="size-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    API Key Required
                  </span>
                </div>
              </div>
            )}
          </header>

          {/* Chat Area */}
          <ChatInterface />

          {/* Input */}
          <MessageInput onSend={handleSend} disabled={isLoading || !isGeminiConnected} />
        </div>
      </SidebarInset>

      {/* Settings Panel */}
      <SettingsPanel />
    </SidebarProvider>
  );
}
