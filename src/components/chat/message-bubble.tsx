"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Wrench, Eye, Volume2, VolumeX, GitFork, Bookmark } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { AGENTS } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { ReactionBar } from "@/components/reactions/reaction-bar";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
}

function CodeBlock({
  language,
  children,
  agentId,
}: {
  language: string | undefined;
  children: string;
  agentId: string;
}) {
  const [copied, setCopied] = useState(false);
  const { openPreview, addSnippet } = useAppStore();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSnippet = () => {
    addSnippet({
      id: uuidv4(),
      title: `${language || "code"} snippet`,
      code: children,
      language: language || "text",
      agent: agentId as "openmanus" | "gemini",
      createdAt: Date.now(),
      pinned: false,
    });
  };

  const isPreviewable =
    ["html", "htm", "svg"].includes(language?.toLowerCase() || "") ||
    children.includes("<!DOCTYPE") ||
    children.includes("<html") ||
    children.includes("<div");

  return (
    <div className="group relative my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between bg-zinc-900 dark:bg-zinc-950 px-4 py-2 text-xs text-zinc-400">
        <span>{language || "code"}</span>
        <div className="flex items-center gap-0.5">
          {isPreviewable && (
            <button
              onClick={() => openPreview(children, language || "html")}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-zinc-800 hover:text-emerald-400"
            >
              <Eye className="size-3" /> Preview
            </button>
          )}
          <button
            onClick={handleSaveSnippet}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-zinc-800 hover:text-violet-400"
            title="Save to snippet library"
          >
            <Bookmark className="size-3" /> Save
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            {copied ? (
              <>
                <Check className="size-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "rgb(24 24 27)",
          fontSize: "0.8125rem",
          lineHeight: "1.5",
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const agent = AGENTS.find((a) => a.id === message.agent);
  const time = format(new Date(message.timestamp), "HH:mm");
  const { isSpeaking, setIsSpeaking, forkFromMessage } = useAppStore();

  // Voice output for assistant messages
  const handleSpeak = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    // Strip markdown for speech
    const text = message.content
      .replace(/```[\s\S]*?```/g, " code block ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/>\s/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .slice(0, 2000);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3 group/msg",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm",
            agent?.bgColor
          )}
        >
          {agent?.icon || "🤖"}
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-600 text-white dark:bg-emerald-600"
            : "bg-card border border-border shadow-sm"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("text-xs font-semibold", agent?.color)}>
              {agent?.name || "AI"}
            </span>
            <span className="text-[10px] text-muted-foreground">{time}</span>
          </div>
        )}

        {/* Image display */}
        {message.imageData && (
          <div className="mb-3 rounded-xl overflow-hidden border border-border/30">
            <img
              src={`data:image/png;base64,${message.imageData}`}
              alt={message.imagePrompt || "Generated image"}
              className="w-full max-w-md"
            />
            {message.imagePrompt && (
              <div className="px-3 py-2 bg-muted/30 text-[10px] text-muted-foreground italic">
                {message.imagePrompt}
              </div>
            )}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline =
                    !match && !className?.includes("language-");
                  if (isInline) {
                    return (
                      <code
                        className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <CodeBlock language={match?.[1]} agentId={message.agent}>
                      {String(children).replace(/\n$/, "")}
                    </CodeBlock>
                  );
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                ul({ children }) {
                  return (
                    <ul className="mb-2 list-disc pl-4 space-y-1">
                      {children}
                    </ul>
                  );
                },
                ol({ children }) {
                  return (
                    <ol className="mb-2 list-decimal pl-4 space-y-1">
                      {children}
                    </ol>
                  );
                },
                h1({ children }) {
                  return <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>;
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-2 border-emerald-500/50 pl-3 my-2 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  );
                },
                a({ href, children }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Tool call badges */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.toolCalls.map((tool) => (
              <span
                key={tool.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  tool.status === "running"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : tool.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}
              >
                <Wrench className="size-2.5" />
                {tool.name}
                {tool.status === "running" && "..."}
              </span>
            ))}
          </div>
        )}

        {/* Action bar for assistant messages */}
        {!isUser && message.content && (
          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            <button
              onClick={handleSpeak}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
            </button>
            <button
              onClick={() => forkFromMessage(message.id)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Fork conversation from here"
            >
              <GitFork className="size-3" />
            </button>
            <ReactionBar messageId={message.id} currentReaction={message.reaction} />
          </div>
        )}

        {isUser && (
          <span className="text-[10px] text-emerald-200/60 mt-1 block text-right">
            {time}
          </span>
        )}
      </div>
      {isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-sm">
          👤
        </div>
      )}
    </div>
  );
}
