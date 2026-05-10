"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, ChevronDown, Zap } from "lucide-react";
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
import { SlashCommandMenu, SLASH_COMMANDS, type SlashCommand } from "./slash-commands";

interface MessageInputProps {
  onSend: (content: string) => void;
  onSlashCommand: (command: SlashCommand, args: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onSlashCommand, disabled }: MessageInputProps) {
  const [input, setInput] = useState("");
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { currentAgent, setCurrentAgent } = useAppStore();
  const agent = AGENTS.find((a) => a.id === currentAgent);

  // Check if input starts with /
  useEffect(() => {
    if (input.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashFilter(input.slice(1));
      setSelectedIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  }, [input]);

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      const args = input.slice(cmd.command.length).trim();
      setShowSlashMenu(false);
      setInput("");
      onSlashCommand(cmd, args);
    },
    [input, onSlashCommand]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    // Check if it's a slash command
    const slashCmd = SLASH_COMMANDS.find(
      (c) => trimmed.startsWith(c.command) &&
        (trimmed.length === c.command.length || trimmed[c.command.length] === " ")
    );

    if (slashCmd) {
      const args = trimmed.slice(slashCmd.command.length).trim();
      setInput("");
      setShowSlashMenu(false);
      onSlashCommand(slashCmd, args);
      return;
    }

    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, disabled, onSend, onSlashCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSlashMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => prev + 1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          // Find the filtered command at selectedIndex and trigger it
          const filtered = SLASH_COMMANDS.filter(
            (cmd) =>
              (cmd.command.toLowerCase().includes(slashFilter.toLowerCase()) ||
                cmd.label.toLowerCase().includes(slashFilter.toLowerCase())) &&
              (cmd.agent === "both" || cmd.agent === currentAgent)
          );
          if (filtered[selectedIndex]) {
            handleSlashSelect(filtered[selectedIndex]);
          }
          return;
        }
        if (e.key === "Escape") {
          setShowSlashMenu(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, showSlashMenu, slashFilter, selectedIndex, currentAgent, handleSlashSelect]
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
          {showSlashMenu && (
            <SlashCommandMenu
              filter={slashFilter}
              currentAgent={currentAgent}
              onSelect={handleSlashSelect}
              selectedIndex={selectedIndex}
            />
          )}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent?.name || "AI"}... (type / for commands)`}
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
      <div className="flex items-center justify-center gap-3 mt-1.5">
        <p className="text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for new line · <span className="text-emerald-500">/</span> for commands
        </p>
      </div>
    </div>
  );
}
