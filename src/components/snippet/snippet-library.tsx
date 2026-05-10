"use client";

import { useAppStore } from "@/lib/store";
import { AGENTS, type Snippet } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X, Pin, Copy, Check, Trash2, Code, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SnippetLibraryProps {
  onClose: () => void;
  onUseSnippet: (snippet: Snippet) => void;
}

export function SnippetLibrary({ onClose, onUseSnippet }: SnippetLibraryProps) {
  const { snippets, removeSnippet, togglePinSnippet } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sorted = [...snippets].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Code className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Snippet Library</h3>
            <span className="text-[10px] text-muted-foreground">({snippets.length} saved)</span>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <Code className="size-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No snippets yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Code blocks from AI responses will be saved here automatically
              </p>
            </div>
          ) : (
            sorted.map((snippet) => {
              const agent = AGENTS.find((a) => a.id === snippet.agent);
              return (
                <div
                  key={snippet.id}
                  className={cn(
                    "rounded-lg border border-border/50 p-3 transition-colors",
                    snippet.pinned && "border-emerald-500/30 bg-emerald-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {snippet.pinned && <Star className="size-3 text-emerald-500 fill-emerald-500" />}
                        <span className="text-xs font-medium truncate">{snippet.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-mono text-muted-foreground bg-muted rounded px-1">
                          {snippet.language}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {agent?.icon} {agent?.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => togglePinSnippet(snippet.id)}
                      >
                        <Pin className={cn("size-3", snippet.pinned && "text-emerald-500")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => handleCopy(snippet.code, snippet.id)}
                      >
                        {copiedId === snippet.id ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => removeSnippet(snippet.id)}
                      >
                        <Trash2 className="size-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <pre className="text-[10px] font-mono text-muted-foreground bg-muted/50 rounded p-2 max-h-20 overflow-auto">
                    {snippet.code.slice(0, 300)}
                    {snippet.code.length > 300 && "..."}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full text-[10px] h-6"
                    onClick={() => onUseSnippet(snippet)}
                  >
                    Use This Snippet
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
