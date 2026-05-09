"use client";

import { useState, useRef, useCallback } from "react";
import { Send, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENTS, type AgentId } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentAgent, setCurrentAgent } = useAppStore();
  const agent = AGENTS.find((a) => a.id === currentAgent);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    },
    []
  );

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "shrink-0 gap-1.5 text-xs h-10 px-3",
                agent?.borderColor
              )}
            >
              <span>{agent?.icon}</span>
              <span className="hidden sm:inline max-w-[80px] truncate">
                {agent?.name}
              </span>
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {AGENTS.map((a) => (
              <DropdownMenuItem
                key={a.id}
                onClick={() => setCurrentAgent(a.id as AgentId)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  currentAgent === a.id && a.bgColor
                )}
              >
                <span>{a.icon}</span>
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.description.slice(0, 50)}...
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent?.name || "AI"}...`}
            disabled={disabled}
            rows={1}
            className="min-h-[40px] max-h-[200px] resize-none pr-12 py-2.5 text-sm rounded-xl border-border/50 focus-visible:ring-emerald-500/30"
          />
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            size="icon"
            className="absolute right-1.5 bottom-1.5 size-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-1.5">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
