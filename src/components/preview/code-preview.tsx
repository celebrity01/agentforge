"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Code, Eye, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

export function CodePreview({ code, language, onClose }: CodePreviewProps) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isPreviewable = useMemo(() => {
    return ["html", "htm", "svg", "css"].includes(language?.toLowerCase()) ||
      code.includes("<!DOCTYPE") ||
      code.includes("<html") ||
      code.includes("<body") ||
      code.includes("<div");
  }, [code, language]);

  const srcDoc = useMemo(() => {
    if (!isPreviewable) return "";

    // If it's already a complete HTML doc, use as-is
    if (code.includes("<!DOCTYPE") || code.includes("<html")) {
      return code;
    }

    // Wrap in a basic HTML template
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; background: #0a0a0a; color: #e5e5e5; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
  }, [code, isPreviewable]);

  return (
    <div
      className={cn(
        "border border-border rounded-xl overflow-hidden bg-card shadow-lg",
        isFullscreen && "fixed inset-4 z-50 rounded-xl"
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setView("preview")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "preview"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="size-3" /> Preview
          </button>
          <button
            onClick={() => setView("code")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              view === "code"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="size-3" /> Code
          </button>
        </div>

        <span className="text-[10px] text-muted-foreground font-mono">
          {language || "html"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "preview" && isPreviewable ? (
        <iframe
          srcDoc={srcDoc}
          className="w-full border-0"
          style={{ height: isFullscreen ? "calc(100vh - 120px)" : "400px" }}
          sandbox="allow-scripts allow-same-origin"
          title="Code Preview"
        />
      ) : (
        <div className="max-h-[400px] overflow-auto p-4">
          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}
