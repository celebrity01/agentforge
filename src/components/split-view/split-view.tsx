"use client";

import { useAppStore } from "@/lib/store";
import { AGENTS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Columns, Send } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { MessageBubble } from "@/components/chat/message-bubble";
import { cn } from "@/lib/utils";

export function SplitView() {
  const { splitView, setSplitView, addSplitMessage, geminiApiKey, isGeminiConnected } = useAppStore();
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const leftAgent = AGENTS.find((a) => a.id === splitView.leftAgent);
  const rightAgent = AGENTS.find((a) => a.id === splitView.rightAgent);

  const handleSendSplit = useCallback(
    async (side: "left" | "right", content: string) => {
      if (!content.trim() || !isGeminiConnected) return;
      const agent = side === "left" ? splitView.leftAgent : splitView.rightAgent;

      const userMessage = {
        id: uuidv4(),
        role: "user" as const,
        content,
        agent,
        timestamp: Date.now(),
      };
      addSplitMessage(side, userMessage);

      const assistantId = uuidv4();
      addSplitMessage(side, {
        id: assistantId,
        role: "assistant" as const,
        content: "",
        agent,
        timestamp: Date.now(),
      });

      // Simple streaming call
      try {
        const { settings } = useAppStore.getState();
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content }],
            agent,
            geminiApiKey,
            model: settings.model || undefined,
          }),
        });

        if (!response.ok) throw new Error("Failed");

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let content = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(line.slice(6).trim());
                if (parsed.content) {
                  content += parsed.content;
                  // Update the message in split view
                  const state = useAppStore.getState();
                  const key = side === "left" ? "leftMessages" : "rightMessages";
                  const messages = state.splitView[key].map((m) =>
                    m.id === assistantId ? { ...m, content } : m
                  );
                  setSplitView({ [key]: messages });
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch {
        const state = useAppStore.getState();
        const key = side === "left" ? "leftMessages" : "rightMessages";
        const messages = state.splitView[key].map((m) =>
          m.id === assistantId ? { ...m, content: "Error: Failed to get response" } : m
        );
        setSplitView({ [key]: messages });
      }
    },
    [splitView, geminiApiKey, isGeminiConnected, addSplitMessage, setSplitView]
  );

  if (!splitView.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80">
        <div className="flex items-center gap-2">
          <Columns className="size-4 text-blue-500" />
          <h2 className="text-sm font-semibold">Dual Agent Mode</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setSplitView({ isOpen: false })}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Split panels */}
      <div className="flex h-[calc(100vh-49px)]">
        {/* Left Panel */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-border", leftAgent?.bgColor)}>
            <span className="text-sm">{leftAgent?.icon}</span>
            <span className={cn("text-xs font-semibold", leftAgent?.color)}>{leftAgent?.name}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {splitView.leftMessages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground mt-8">
                Ask {leftAgent?.name} anything
              </p>
            ) : (
              splitView.leftMessages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))
            )}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={leftInput}
                onChange={(e) => setLeftInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSplit("left", leftInput);
                    setLeftInput("");
                  }
                }}
                placeholder={`Ask ${leftAgent?.name}...`}
                className="text-xs min-h-[36px] max-h-[80px]"
                rows={1}
              />
              <Button
                size="icon"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 size-9"
                onClick={() => {
                  handleSendSplit("left", leftInput);
                  setLeftInput("");
                }}
                disabled={!leftInput.trim()}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 flex flex-col">
          <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-border", rightAgent?.bgColor)}>
            <span className="text-sm">{rightAgent?.icon}</span>
            <span className={cn("text-xs font-semibold", rightAgent?.color)}>{rightAgent?.name}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {splitView.rightMessages.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground mt-8">
                Ask {rightAgent?.name} anything
              </p>
            ) : (
              splitView.rightMessages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))
            )}
          </div>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                value={rightInput}
                onChange={(e) => setRightInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendSplit("right", rightInput);
                    setRightInput("");
                  }
                }}
                placeholder={`Ask ${rightAgent?.name}...`}
                className="text-xs min-h-[36px] max-h-[80px]"
                rows={1}
              />
              <Button
                size="icon"
                className="shrink-0 bg-violet-600 hover:bg-violet-700 size-9"
                onClick={() => {
                  handleSendSplit("right", rightInput);
                  setRightInput("");
                }}
                disabled={!rightInput.trim()}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
