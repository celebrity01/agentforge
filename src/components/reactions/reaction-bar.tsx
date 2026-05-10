"use client";

import { useAppStore } from "@/lib/store";
import type { ReactionType } from "@/lib/types";
import { ThumbsUp, ThumbsDown, Lightbulb, Bug, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ReactionBarProps {
  messageId: string;
  currentReaction?: ReactionType;
}

const REACTIONS: { type: ReactionType; icon: React.ReactNode; label: string }[] = [
  { type: "helpful", icon: <ThumbsUp className="size-3" />, label: "Helpful" },
  { type: "not-helpful", icon: <ThumbsDown className="size-3" />, label: "Not helpful" },
  { type: "insightful", icon: <Lightbulb className="size-3" />, label: "Insightful" },
  { type: "bug", icon: <Bug className="size-3" />, label: "Bug" },
  { type: "love", icon: <Heart className="size-3" />, label: "Love it" },
];

export function ReactionBar({ messageId, currentReaction }: ReactionBarProps) {
  const { setReaction } = useAppStore();
  const [showAll, setShowAll] = useState(false);

  const handleReaction = (type: ReactionType) => {
    // Toggle off if same reaction
    if (currentReaction === type) {
      setReaction(messageId, undefined as unknown as ReactionType);
    } else {
      setReaction(messageId, type);
    }
  };

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {(showAll ? REACTIONS : REACTIONS.slice(0, 3)).map((reaction) => (
        <button
          key={reaction.type}
          onClick={() => handleReaction(reaction.type)}
          className={cn(
            "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] transition-colors",
            currentReaction === reaction.type
              ? reaction.type === "helpful" || reaction.type === "love" || reaction.type === "insightful"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : reaction.type === "bug" || reaction.type === "not-helpful"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-amber-500/10 text-amber-600"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
          title={reaction.label}
        >
          {reaction.icon}
        </button>
      ))}
      {!showAll && REACTIONS.length > 3 && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
        >
          ···
        </button>
      )}
    </div>
  );
}
