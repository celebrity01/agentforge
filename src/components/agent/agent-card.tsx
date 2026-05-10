"use client";

import { AGENTS, type AgentId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface AgentCardProps {
  agentId: AgentId;
  isSelected: boolean;
  onSelect: (agentId: AgentId) => void;
}

export function AgentCard({ agentId, isSelected, onSelect }: AgentCardProps) {
  const agent = AGENTS.find((a) => a.id === agentId);
  const isGeminiConnected = useAppStore((s) => s.isGeminiConnected);
  if (!agent) return null;

  return (
    <button
      onClick={() => onSelect(agentId)}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all duration-200",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        isSelected
          ? `${agent.borderColor} ${agent.bgColor} shadow-sm`
          : "border-border hover:border-muted-foreground/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-lg relative",
            agent.bgColor
          )}
        >
          {agent.icon}
          {isGeminiConnected && (
            <div className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Zap className="size-2.5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{agent.name}</span>
            {isSelected && (
              <Check className={cn("size-4", agent.color)} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {agent.description}
          </p>
          {isGeminiConnected && (
            <div className="flex items-center gap-1 mt-1">
              <Zap className="size-2.5 text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-medium">
                Gemini-powered
              </span>
            </div>
          )}
        </div>
      </div>
      {isSelected && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                agent.bgColor,
                agent.color
              )}
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}
