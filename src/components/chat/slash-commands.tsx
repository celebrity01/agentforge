"use client";

import {
  Search,
  Code,
  Image,
  Trash2,
  Download,
  FileText,
  Terminal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  agent?: "openmanus" | "gemini" | "both";
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "search",
    command: "/search",
    label: "Web Search",
    description: "Search the web for current information",
    icon: <Search className="size-3.5 text-blue-500" />,
    agent: "openmanus",
  },
  {
    id: "code",
    command: "/code",
    label: "Run Code",
    description: "Execute Python code",
    icon: <Code className="size-3.5 text-emerald-500" />,
    agent: "openmanus",
  },
  {
    id: "image",
    command: "/image",
    label: "Generate Image",
    description: "Create an image from a description",
    icon: <Image className="size-3.5 text-violet-500" />,
    agent: "both",
  },
  {
    id: "debug",
    command: "/debug",
    label: "Debug Code",
    description: "Paste code to find and fix bugs",
    icon: <Terminal className="size-3.5 text-amber-500" />,
    agent: "gemini",
  },
  {
    id: "explain",
    command: "/explain",
    label: "Explain Code",
    description: "Get a clear explanation of code",
    icon: <FileText className="size-3.5 text-cyan-500" />,
    agent: "gemini",
  },
  {
    id: "improve",
    command: "/improve",
    label: "Improve Code",
    description: "Get suggestions to improve your code",
    icon: <Sparkles className="size-3.5 text-pink-500" />,
    agent: "gemini",
  },
  {
    id: "clear",
    command: "/clear",
    label: "Clear Chat",
    description: "Start a new conversation",
    icon: <Trash2 className="size-3.5 text-red-500" />,
    agent: "both",
  },
  {
    id: "export",
    command: "/export",
    label: "Export Chat",
    description: "Download conversation as markdown",
    icon: <Download className="size-3.5 text-teal-500" />,
    agent: "both",
  },
];

interface SlashCommandMenuProps {
  filter: string;
  currentAgent: string;
  onSelect: (command: SlashCommand) => void;
  selectedIndex: number;
}

export function SlashCommandMenu({
  filter,
  currentAgent,
  onSelect,
  selectedIndex,
}: SlashCommandMenuProps) {
  const filtered = SLASH_COMMANDS.filter((cmd) => {
    const matchesFilter = cmd.command
      .toLowerCase()
      .includes(filter.toLowerCase()) ||
      cmd.label.toLowerCase().includes(filter.toLowerCase());
    const matchesAgent =
      cmd.agent === "both" || cmd.agent === currentAgent;
    return matchesFilter && matchesAgent;
  });

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
      <div className="p-1.5 text-[10px] text-muted-foreground font-medium border-b border-border/50">
        Commands
      </div>
      {filtered.map((cmd, i) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
            i === selectedIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50"
          )}
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-muted shrink-0">
            {cmd.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium">{cmd.label}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {cmd.description}
            </div>
          </div>
          <code className="text-[10px] text-muted-foreground font-mono shrink-0">
            {cmd.command}
          </code>
        </button>
      ))}
    </div>
  );
}
