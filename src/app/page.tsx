"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { MessageInput } from "@/components/chat/message-input";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useAppStore } from "@/lib/store";
import { AGENTS, type Message, type ToolCall } from "@/lib/types";
import { SLASH_COMMANDS, type SlashCommand } from "@/components/chat/slash-commands";
import { useCallback, useRef } from "react";
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
    clearMessages,
    setCurrentConversationId,
  } = useAppStore();

  const agent = AGENTS.find((a) => a.id === currentAgent);

  // Ref for handleSend so slash commands can call it
  const handleSendRef = useRef<(content: string) => void>(() => {});

  // ─── Export chat as markdown ─────────────────────────────────────────────
  const exportChat = useCallback(() => {
    const agentInfo = AGENTS.find((a) => a.id === currentAgent);
    let md = `# AgentForge Chat Export\n\n`;
    md += `**Agent:** ${agentInfo?.name || "Unknown"}\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Messages:** ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      if (msg.role === "user") {
        md += `### You (${time})\n\n${msg.content}\n\n`;
      } else {
        const a = AGENTS.find((ag) => ag.id === msg.agent);
        md += `### ${a?.name || "AI"} (${time})\n\n${msg.content}\n\n`;
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          md += `**Tools used:** ${msg.toolCalls.map((t) => `${t.name} (${t.status})`).join(", ")}\n\n`;
        }
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

  // ─── Image generation ────────────────────────────────────────────────────
  const generateImage = useCallback(
    async (prompt: string) => {
      if (!isGeminiConnected) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: `/image ${prompt}`,
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      const assistantMessageId = uuidv4();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "Generating image...",
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);

      setIsLoading(true);

      try {
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Image generation failed");
        }

        const data = await response.json();

        updateMessage(assistantMessageId, {
          content: `Here's the image I generated based on: **${prompt}**`,
          imageData: data.base64,
          imagePrompt: prompt,
        });
      } catch (error) {
        updateMessage(assistantMessageId, {
          content: `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentAgent, isGeminiConnected, addMessage, updateMessage, setIsLoading]
  );

  // ─── Slash command handler ───────────────────────────────────────────────
  const handleSlashCommand = useCallback(
    (cmd: SlashCommand, args: string) => {
      switch (cmd.id) {
        case "search":
          handleSendRef.current(
            args
              ? `Search the web for: ${args}. Provide a comprehensive summary of what you find.`
              : "What would you like me to search for?"
          );
          break;
        case "code":
          handleSendRef.current(
            args
              ? `Execute this Python code and show the results:\n\n\`\`\`python\n${args}\n\`\`\``
              : "What Python code would you like me to execute?"
          );
          break;
        case "image":
          generateImage(args || "A beautiful futuristic city at sunset with flying cars");
          break;
        case "debug":
          handleSendRef.current(
            args
              ? `Debug this code and find all issues:\n\n${args}`
              : "Paste the code you'd like me to debug."
          );
          break;
        case "explain":
          handleSendRef.current(
            args
              ? `Explain this code step by step in simple terms:\n\n${args}`
              : "Paste the code you'd like me to explain."
          );
          break;
        case "improve":
          handleSendRef.current(
            args
              ? `Review and improve this code with best practices:\n\n${args}`
              : "Paste the code you'd like me to improve."
          );
          break;
        case "clear":
          clearMessages();
          setCurrentConversationId(null);
          break;
        case "export":
          exportChat();
          break;
      }
    },
    [generateImage, exportChat, clearMessages, setCurrentConversationId]
  );

  // ─── Main send handler ──────────────────────────────────────────────────
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
        setCurrentConversationId(convId);
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
        toolCalls: [],
      };
      addMessage(assistantMessage);

      try {
        const chatMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { settings } = useAppStore.getState();

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatMessages,
            agent: currentAgent,
            geminiApiKey: geminiApiKey || undefined,
            model: settings.model || undefined,
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
        const toolCalls: ToolCall[] = [];

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

                // Handle tool calls (OpenManus)
                if (parsed.tool_call) {
                  const tc = parsed.tool_call;
                  const toolCallId = uuidv4();

                  toolCalls.push({
                    id: toolCallId,
                    name: tc.name,
                    status: "running",
                    args: tc.args,
                  });

                  const displayText = tc.label || tc.name;
                  const argsDisplay = tc.args
                    ? Object.entries(tc.args)
                        .map(([k, v]) => {
                          const val = typeof v === "string" ? v : JSON.stringify(v);
                          return `${k}: ${val.length > 80 ? val.slice(0, 80) + "..." : val}`;
                        })
                        .join(", ")
                    : "";

                  accumulatedContent += `\n> ${tc.icon || "🔧"} **${displayText}**${argsDisplay ? ` — \`${argsDisplay}\`` : ""}\n`;

                  updateMessage(assistantMessageId, {
                    content: accumulatedContent,
                    toolCalls: [...toolCalls],
                  });
                }

                // Handle tool results (OpenManus)
                if (parsed.tool_result) {
                  const tr = parsed.tool_result;

                  const tcIndex = toolCalls.findIndex(
                    (tc) => tc.name === tr.name && tc.status === "running"
                  );
                  if (tcIndex >= 0) {
                    toolCalls[tcIndex] = {
                      ...toolCalls[tcIndex],
                      status: tr.success ? "completed" : "error",
                      result: tr.output?.slice(0, 500) || tr.error?.slice(0, 200),
                    };
                  }

                  if (tr.success && tr.output) {
                    const outputPreview = tr.output.length > 300
                      ? tr.output.slice(0, 300) + "..."
                      : tr.output;
                    accumulatedContent += `> ✅ *Result:* ${outputPreview.replace(/\n/g, " ")}\n\n`;
                  } else if (tr.error) {
                    accumulatedContent += `> ❌ *Error:* ${tr.error.slice(0, 200)}\n\n`;
                  }

                  updateMessage(assistantMessageId, {
                    content: accumulatedContent,
                    toolCalls: [...toolCalls],
                  });
                }

                // Handle text content (both agents)
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateMessage(assistantMessageId, {
                    content: accumulatedContent,
                    toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
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

  // Keep ref up to date for slash commands
  handleSendRef.current = handleSend;

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
                    ? currentAgent === "openmanus"
                      ? "Working..."
                      : "Thinking..."
                    : isGeminiConnected
                      ? "Gemini connected"
                      : "No API key"}
                </p>
              </div>
            </div>
            {/* Connection status */}
            <div className="ml-auto flex items-center gap-2">
              {isGeminiConnected && (
                <>
                  <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                    <div className={`size-1.5 rounded-full ${isLoading ? "animate-pulse" : ""} bg-emerald-500`} />
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      {isLoading
                        ? currentAgent === "openmanus"
                          ? "Executing"
                          : "Streaming"
                        : "Gemini Live"}
                    </span>
                  </div>
                  {currentAgent === "openmanus" && (
                    <div className="hidden sm:flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Tools Active
                      </span>
                    </div>
                  )}
                </>
              )}
              {!isGeminiConnected && (
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                  <div className="size-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    API Key Required
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Chat Area */}
          <ChatInterface />

          {/* Input */}
          <MessageInput
            onSend={handleSend}
            onSlashCommand={handleSlashCommand}
            disabled={isLoading || !isGeminiConnected}
          />
        </div>
      </SidebarInset>

      {/* Settings Panel */}
      <SettingsPanel />
    </SidebarProvider>
  );
}
