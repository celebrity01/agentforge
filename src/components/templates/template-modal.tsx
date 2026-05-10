"use client";

import { useAppStore } from "@/lib/store";
import { PROMPT_TEMPLATES, type PromptTemplate } from "@/lib/types";
import { X, Sparkles, Code, Search, Pen, Briefcase, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TemplateModalProps {
  onSelect: (template: PromptTemplate) => void;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  code: <Code className="size-3.5 text-emerald-500" />,
  writing: <Pen className="size-3.5 text-blue-500" />,
  research: <Search className="size-3.5 text-amber-500" />,
  creative: <Sparkles className="size-3.5 text-pink-500" />,
  business: <Briefcase className="size-3.5 text-violet-500" />,
  devops: <Server className="size-3.5 text-cyan-500" />,
};

export function TemplateModal({ onSelect, onClose }: TemplateModalProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const currentAgent = useAppStore((s) => s.currentAgent);

  const categories = [...new Set(PROMPT_TEMPLATES.map((t) => t.category))];

  const filtered = PROMPT_TEMPLATES.filter((t) => {
    const matchesAgent = t.agent === "both" || t.agent === currentAgent;
    const matchesCategory = !activeCategory || t.category === activeCategory;
    return matchesAgent && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Quick Templates</h3>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b border-border/50">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
              !activeCategory ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition-colors flex items-center gap-1",
                activeCategory === cat ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {CATEGORY_ICONS[cat]}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Template list */}
        <div className="max-h-[350px] overflow-y-auto p-3 space-y-1.5">
          {filtered.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template);
                onClose();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent"
            >
              <span className="text-lg shrink-0">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">{template.title}</div>
                <div className="text-[10px] text-muted-foreground">{template.description}</div>
              </div>
              <span className="text-[9px] text-muted-foreground capitalize shrink-0">
                {template.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
