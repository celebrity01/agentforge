"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "../common/typing-indicator";
import { useAppStore } from "@/lib/store";
import { AGENTS } from "@/lib/types";
import { motion } from "framer-motion";
import { Sparkles, Brain } from "lucide-react";

export function ChatInterface() {
  const { messages, isLoading, currentAgent, geminiAuth } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const agent = AGENTS.find((a) => a.id === currentAgent);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 mb-4"
          >
            <Sparkles className="size-8 text-emerald-500" />
          </motion.div>
          <motion.h2
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-xl font-bold mb-2"
          >
            Welcome to AgentForge
          </motion.h2>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm text-muted-foreground mb-2"
          >
            Chat with{" "}
            <span className={`font-semibold ${agent?.color || "text-emerald-500"}`}>
              {agent?.name || "an AI agent"}
            </span>{" "}
            to get started.
          </motion.p>
          {geminiAuth.isAuthenticated && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex items-center justify-center gap-1.5 mb-6"
            >
              <Brain className="size-3.5 text-violet-500" />
              <span className="text-xs text-violet-500 font-medium">
                Powered by Gemini via your Google account
              </span>
            </motion.div>
          )}
          {!geminiAuth.isAuthenticated && (
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="text-xs text-muted-foreground mb-6"
            >
              Sign in with Google in the sidebar to connect Gemini as the brain for both agents.
            </motion.p>
          )}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left"
          >
            {[
              {
                title: "Write code",
                desc: "Build a React component with TypeScript",
              },
              {
                title: "Debug issues",
                desc: "Help me fix this error in my Python script",
              },
              {
                title: "Research topics",
                desc: "Search for the latest AI frameworks",
              },
              {
                title: "Plan projects",
                desc: "Create a roadmap for my SaaS app",
              },
            ].map((suggestion) => (
              <button
                key={suggestion.title}
                className="rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-accent hover:border-border"
              >
                <div className="text-xs font-medium">{suggestion.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {suggestion.desc}
                </div>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto max-w-3xl py-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
          >
            <MessageBubble message={message} />
          </motion.div>
        ))}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div
              className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm ${agent?.bgColor}`}
            >
              {agent?.icon || "🤖"}
            </div>
            <div className="rounded-2xl bg-card border border-border px-4 py-2">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
