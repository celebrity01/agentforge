"use client";

import { useAppStore } from "@/lib/store";
import { AGENTS, type MemoryEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X, Brain, Trash2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { v4 as uuidv4 } from "uuid";

interface MemoryPanelProps {
  onClose: () => void;
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const { memories, addMemory, removeMemory, clearMemories } = useAppStore();
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    addMemory({
      id: uuidv4(),
      key: newKey.trim(),
      value: newValue.trim(),
      createdAt: Date.now(),
      source: "user",
    });
    setNewKey("");
    setNewValue("");
  };

  // Build a context string from memories for the AI
  const memoryContext = memories
    .map((m) => `${m.key}: ${m.value}`)
    .join("\n");

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Agent Memory</h3>
            <span className="text-[10px] text-muted-foreground">
              ({memories.length} memories)
            </span>
          </div>
          <div className="flex items-center gap-1">
            {memories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-red-500 h-7"
                onClick={clearMemories}
              >
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Add memory */}
        <div className="p-3 border-b border-border/50 space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Add facts, preferences, or context. The agent will remember these across sessions.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Key (e.g., favorite_language)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="text-xs h-8"
            />
            <Input
              placeholder="Value (e.g., TypeScript)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="text-xs h-8 flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAdd}
              disabled={!newKey.trim() || !newValue.trim()}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Memory list */}
        <div className="max-h-[300px] overflow-y-auto p-3 space-y-2">
          {memories.length === 0 ? (
            <div className="py-12 text-center">
              <Brain className="size-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No memories yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Add preferences, project context, or facts for the agent to remember
              </p>
            </div>
          ) : (
            memories.map((memory) => (
              <div
                key={memory.id}
                className="flex items-start gap-2 rounded-lg border border-border/50 p-2.5"
              >
                <Sparkles className="size-3.5 text-violet-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium font-mono">{memory.key}</div>
                  <div className="text-[10px] text-muted-foreground">{memory.value}</div>
                  <div className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {memory.source === "auto" ? "Auto-detected" : "Manual"} · {new Date(memory.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removeMemory(memory.id)}
                >
                  <Trash2 className="size-3 text-red-500" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Context preview */}
        {memories.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <p className="text-[9px] text-muted-foreground mb-1">Context sent to AI:</p>
            <pre className="text-[9px] font-mono text-emerald-500 bg-emerald-500/5 rounded p-2 max-h-16 overflow-auto">
              {memoryContext}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
