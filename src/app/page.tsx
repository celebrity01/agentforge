"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { ChatInterface } from "@/components/chat/chat-interface";
import { MessageInput } from "@/components/chat/message-input";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { useAppStore } from "@/lib/store";
import { AGENTS, type Message, type ToolCall } from "@/lib/types";
import { SLASH_COMMANDS, COMMAND_CATEGORIES, type SlashCommand } from "@/components/chat/slash-commands";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { TemplateModal } from "@/components/templates/template-modal";
import { SnippetLibrary } from "@/components/snippet/snippet-library";
import { MemoryPanel } from "@/components/memory/memory-panel";
import { SplitView } from "@/components/split-view/split-view";
import { useCallback, useRef, useState, useEffect } from "react";
import type { PromptTemplate, Snippet as SnippetType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { X, Maximize2, Minimize2, Timer, Keyboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Utility API helper ──────────────────────────────────────────────────
async function callToolApi(tool: string, args: Record<string, unknown>): Promise<string> {
  try {
    const res = await fetch("/api/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, args }),
    });
    const data = await res.json();
    return data.result || data.error || "No result";
  } catch {
    return "Error: Failed to process utility command.";
  }
}

export default function Home() {
  const {
    messages,
    addMessage,
    updateMessage,
    currentAgent,
    isLoading,
    setIsLoading,
    currentConversationId,
    addConversation,
    updateConversation,
    geminiApiKey,
    isGeminiConnected,
    clearMessages,
    setCurrentConversationId,
    // New state
    focusMode,
    toggleFocusMode,
    compactMode,
    toggleCompactMode,
    wordWrap,
    toggleWordWrap,
    voiceAutoRead,
    toggleVoiceAutoRead,
    draftMessage,
    setDraftMessage,
    addToCommandHistory,
    agentPersona,
    featureHubOpen,
    setFeatureHubOpen,
    shortcutsOpen,
    setShortcutsOpen,
    pomodoroState,
    setPomodoroState,
    pinMessage,
  } = useAppStore();

  const agent = AGENTS.find((a) => a.id === currentAgent);

  // Ref for handleSend so slash commands can call it
  const handleSendRef = useRef<(content: string) => void>(() => {});

  // Modal states
  const [templateOpen, setTemplateOpen] = useState(false);
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  // Pomodoro timer effect
  useEffect(() => {
    if (!pomodoroState.isRunning) return;
    const interval = setInterval(() => {
      const s = useAppStore.getState().pomodoroState;
      if (s.secondsLeft <= 1) {
        // Timer done
        if (s.mode === "work") {
          useAppStore.getState().setPomodoroState({ mode: "break", secondsLeft: 5 * 60 });
        } else {
          useAppStore.getState().setPomodoroState({ mode: "work", secondsLeft: 25 * 60, isRunning: false });
        }
      } else {
        useAppStore.getState().setPomodoroState({ secondsLeft: s.secondsLeft - 1 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pomodoroState.isRunning]);

  // Cmd+K shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useAppStore.getState().setCommandPaletteOpen(!useAppStore.getState().commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Helper: add a system-style result message ──────────────────────────
  const addResultMessage = useCallback((content: string, toolCalls?: ToolCall[]) => {
    const msg: Message = {
      id: uuidv4(),
      role: "assistant",
      content,
      agent: currentAgent,
      timestamp: Date.now(),
      toolCalls,
    };
    addMessage(msg);
  }, [addMessage, currentAgent]);

  // ─── Export chat as markdown ─────────────────────────────────────────────
  const exportChat = useCallback(() => {
    const agentInfo = AGENTS.find((a) => a.id === currentAgent);
    let md = `# AgentForge Chat Export\n\n`;
    md += `**Agent:** ${agentInfo?.name || "Unknown"}\n`;
    md += `**Date:** ${new Date().toLocaleString()}\n`;
    md += `**Messages:** ${messages.length}\n\n---\n\n`;

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      if (msg.role === "user") {
        md += `### You (${time})\n\n${msg.content}\n\n`;
      } else {
        const a = AGENTS.find((ag) => ag.id === msg.agent);
        md += `### ${a?.name || "AI"} (${time})\n\n${msg.content}\n\n`;
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          md += `**Tools used:** ${msg.toolCalls.map((t) => `${t.name} (${t.status})`).join(", ")}\n\n`;
        }
      }
    }

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agentforge-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, currentAgent]);

  // ─── Image generation ────────────────────────────────────────────────────
  const generateImage = useCallback(
    async (prompt: string) => {
      if (!isGeminiConnected) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: `/image ${prompt}`,
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      const assistantMessageId = uuidv4();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "Generating image...",
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);

      setIsLoading(true);

      try {
        const response = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Image generation failed");
        }

        const data = await response.json();

        updateMessage(assistantMessageId, {
          content: `Here's the image I generated based on: **${prompt}**`,
          imageData: data.base64,
          imagePrompt: prompt,
        });
      } catch (error) {
        updateMessage(assistantMessageId, {
          content: `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentAgent, isGeminiConnected, addMessage, updateMessage, setIsLoading]
  );

  // ─── Slash command handler ───────────────────────────────────────────────
  const handleSlashCommand = useCallback(
    (cmd: SlashCommand, args: string) => {
      addToCommandHistory(cmd.command);

      switch (cmd.id) {
        // ═══ ORIGINAL COMMANDS ═══════════════════════════════════════════
        case "search":
          handleSendRef.current(args ? `Search the web for: ${args}. Provide a comprehensive summary of what you find.` : "What would you like me to search for?");
          break;
        case "code":
          handleSendRef.current(args ? `Execute this Python code and show the results:\n\n\`\`\`python\n${args}\n\`\`\`` : "What Python code would you like me to execute?");
          break;
        case "image":
          generateImage(args || "A beautiful futuristic city at sunset with flying cars");
          break;
        case "debug":
          handleSendRef.current(args ? `Debug this code and find all issues:\n\n${args}` : "Paste the code you'd like me to debug.");
          break;
        case "explain":
          handleSendRef.current(args ? `Explain this code step by step in simple terms:\n\n${args}` : "Paste the code you'd like me to explain.");
          break;
        case "improve":
          handleSendRef.current(args ? `Review and improve this code with best practices:\n\n${args}` : "Paste the code you'd like me to improve.");
          break;
        case "clear":
          clearMessages();
          setCurrentConversationId(null);
          break;
        case "export":
          exportChat();
          break;
        case "templates":
          setTemplateOpen(true);
          break;
        case "snippets":
          setSnippetOpen(true);
          break;
        case "memory":
          setMemoryOpen(true);
          break;
        case "split":
          useAppStore.getState().setSplitView({ isOpen: true });
          break;
        case "palette":
          useAppStore.getState().setCommandPaletteOpen(true);
          break;

        // ═══ NEW OPENMANUS TOOL COMMANDS ═════════════════════════════════
        case "url":
          handleSendRef.current(args ? `Analyze the content of this webpage: ${args}. Extract the main content, key points, and any important links.` : "What URL would you like me to analyze?");
          break;
        case "chart":
          handleSendRef.current(args ? `Create a ${args} chart with appropriate sample data. Make it visually appealing.` : "What type of chart would you like? (bar, line, pie, scatter, area)");
          break;
        case "translate":
          handleSendRef.current(args ? `Translate the following text. If I specify a target language, translate to that. Otherwise translate to English:\n\n${args}` : "What text would you like me to translate? Specify the target language.");
          break;
        case "sentiment":
          handleSendRef.current(args ? `Analyze the sentiment of this text:\n\n${args}` : "Paste the text you'd like me to analyze for sentiment.");
          break;
        case "password":
          handleSendRef.current(args ? `Generate ${args} secure passwords with 16 characters each, including uppercase, lowercase, numbers, and symbols.` : "Generate 3 secure passwords with 16 characters each.");
          break;
        case "diff":
          handleSendRef.current(args ? `Compare these two texts and show the differences:\n\n${args}` : "Paste two texts separated by '---' and I'll compare them.");
          break;
        case "json":
          handleSendRef.current(args ? `Format and validate this JSON data:\n\n${args}` : "Paste the JSON you'd like me to format.");
          break;
        case "qrcode":
          handleSendRef.current(args ? `Generate a QR code for: ${args}` : "What text or URL should I generate a QR code for?");
          break;
        case "diagram":
          handleSendRef.current(args ? `Create a Mermaid diagram for: ${args}` : "What diagram would you like? (flowchart, sequence, class, state, gantt)");
          break;
        case "stats":
          if (args) {
            handleSendRef.current(`Compute detailed text statistics for: ${args}`);
          } else {
            // Stats of the conversation
            const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
            const totalWords = messages.reduce((sum, m) => sum + m.content.split(/\s+/).filter(Boolean).length, 0);
            addResultMessage(`**Chat Statistics**\n\n- Total messages: ${messages.length}\n- User messages: ${messages.filter((m) => m.role === "user").length}\n- AI messages: ${messages.filter((m) => m.role === "assistant").length}\n- Total words: ${totalWords}\n- Total characters: ${totalChars}\n- Estimated tokens: ~${Math.ceil(totalChars / 4)}`);
          }
          break;

        // ═══ DEV UTILITY COMMANDS ════════════════════════════════════════
        case "encode":
          if (args) {
            callToolApi("base64_encode", { text: args }).then((r) => addResultMessage(`**Base64 Encoded:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/encode <text>` — encodes text to Base64"); }
          break;
        case "decode":
          if (args) {
            callToolApi("base64_decode", { text: args }).then((r) => addResultMessage(`**Base64 Decoded:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/decode <base64>` — decodes Base64 to text"); }
          break;
        case "hash":
          if (args) {
            Promise.all([
              callToolApi("hash_md5", { text: args }),
              callToolApi("hash_sha1", { text: args }),
              callToolApi("hash_sha256", { text: args }),
            ]).then(([md5, sha1, sha256]) => {
              addResultMessage(`**Hash for:** \`${args.slice(0, 50)}${args.length > 50 ? "..." : ""}\`\n\n- MD5: \`${md5}\`\n- SHA-1: \`${sha1}\`\n- SHA-256: \`${sha256}\``);
            });
          } else { addResultMessage("Usage: `/hash <text>` — generates MD5, SHA-1, SHA-256 hashes"); }
          break;
        case "uuid":
          callToolApi("uuid_multiple", { count: args ? parseInt(args) || 5 : 5 }).then((r) => addResultMessage(`**Generated UUIDs:**\n\`\`\`\n${r}\n\`\`\``));
          break;
        case "timestamp":
          if (args && !isNaN(Number(args))) {
            callToolApi("timestamp_to_date", { timestamp: args }).then((r) => addResultMessage(`**Timestamp ${args}:**\n${r}`));
          } else {
            callToolApi("timestamp_now", {}).then((r) => addResultMessage(`**Current Timestamp:**\n${r}`));
          }
          break;
        case "color":
          if (args) {
            callToolApi("color_convert", { color: args }).then((r) => addResultMessage(`**Color Conversion for \`${args}\`:**\n${r}`));
          } else { addResultMessage("Usage: `/color #10b981` or `/color rgb(16,185,129)` — converts between HEX, RGB, HSL"); }
          break;
        case "urlencode":
          if (args) {
            Promise.all([
              callToolApi("url_encode", { text: args }),
              callToolApi("url_decode", { text: args }),
            ]).then(([encoded, decoded]) => {
              addResultMessage(`**URL Encoding:**\n- Encoded: \`${encoded}\`\n- Decoded: \`${decoded}\``);
            });
          } else { addResultMessage("Usage: `/urlencode <text>` — URL encodes/decodes text"); }
          break;
        case "regex":
          if (args) {
            handleSendRef.current(`Explain this regex pattern and give examples of matching strings: ${args}`);
          } else { addResultMessage("Usage: `/regex /pattern/flags` — tests and explains regex patterns"); }
          break;
        case "lorem":
          callToolApi("lorem_ipsum", { count: args ? parseInt(args) || 3 : 3 }).then((r) => addResultMessage(`**Lorem Ipsum:**\n\n${r}`));
          break;
        case "case":
          if (args) {
            Promise.all([
              callToolApi("case_upper", { text: args }),
              callToolApi("case_lower", { text: args }),
              callToolApi("case_title", { text: args }),
              callToolApi("case_camel", { text: args }),
              callToolApi("case_snake", { text: args }),
              callToolApi("case_kebab", { text: args }),
              callToolApi("case_constant", { text: args }),
            ]).then(([upper, lower, title, camel, snake, kebab, constant]) => {
              addResultMessage(`**Case Conversions for:** \`${args}\`\n\n- UPPER: \`${upper}\`\n- lower: \`${lower}\`\n- Title: \`${title}\`\n- camelCase: \`${camel}\`\n- snake_case: \`${snake}\`\n- kebab-case: \`${kebab}\`\n- CONSTANT: \`${constant}\``);
            });
          } else { addResultMessage("Usage: `/case <text>` — shows all case conversions"); }
          break;
        case "sort":
          if (args) {
            callToolApi("sort_lines", { text: args }).then((r) => addResultMessage(`**Sorted Lines:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/sort <multiline text>` — sorts lines alphabetically"); }
          break;
        case "dedup":
          if (args) {
            callToolApi("dedup_lines", { text: args }).then((r) => addResultMessage(`**Deduplicated:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/dedup <multiline text>` — removes duplicate lines"); }
          break;
        case "trim":
          if (args) {
            callToolApi("trim_whitespace", { text: args }).then((r) => addResultMessage(`**Trimmed:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/trim <text>` — removes extra whitespace"); }
          break;
        case "base":
          if (args) {
            callToolApi("number_info", { number: args }).then((r) => addResultMessage(`**Number Conversions for \`${args}\`:**\n${r}`));
          } else { addResultMessage("Usage: `/base 255` or `/base 0xFF` — converts number between bases"); }
          break;
        case "unit":
          if (args) {
            handleSendRef.current(`Convert these units: ${args}. Show all equivalent values.`);
          } else { addResultMessage("Usage: `/unit 100 km` or `/unit 72 f` — converts between units"); }
          break;
        case "count":
          if (args) {
            const words = args.split(/\s+/).filter(Boolean).length;
            const chars = args.length;
            const sentences = (args.match(/[.!?]+/g) || []).length;
            addResultMessage(`**Text Count:**\n- Words: ${words}\n- Characters: ${chars}\n- Sentences: ${sentences || 1}\n- Reading time: ~${Math.ceil(words / 200)} min`);
          } else {
            const totalWords = messages.reduce((sum, m) => sum + m.content.split(/\s+/).filter(Boolean).length, 0);
            addResultMessage(`**Chat Count:**\n- Messages: ${messages.length}\n- Total words: ${totalWords}\n- Estimated tokens: ~${Math.ceil(messages.reduce((s, m) => s + m.content.length, 0) / 4)}`);
          }
          break;
        case "reverse":
          if (args) {
            const reversed = args.split("").reverse().join("");
            addResultMessage(`**Reversed:** \`${reversed}\``);
          } else { addResultMessage("Usage: `/reverse <text>` — reverses the text"); }
          break;
        case "pad":
          if (args) {
            callToolApi("add_line_numbers", { text: args }).then((r) => addResultMessage(`**With Line Numbers:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/pad <multiline text>` — adds line numbers"); }
          break;
        case "minify":
          if (args) {
            handleSendRef.current(`Minify this code, removing all unnecessary whitespace while keeping it functional:\n\n${args}`);
          } else { addResultMessage("Usage: `/minify <code>` — minifies HTML, CSS, or JS code"); }
          break;
        case "beautify":
          if (args) {
            handleSendRef.current(`Format and beautify this code with proper indentation:\n\n${args}`);
          } else { addResultMessage("Usage: `/beautify <code>` — formats code nicely"); }
          break;

        // ═══ CIPHER COMMANDS ═════════════════════════════════════════════
        case "rot13":
          if (args) {
            callToolApi("rot13", { text: args }).then((r) => addResultMessage(`**ROT13:** \`${r}\``));
          } else { addResultMessage("Usage: `/rot13 <text>` — encodes/decodes with ROT13 cipher"); }
          break;
        case "binary_enc":
          if (args) {
            callToolApi("binary_encode", { text: args }).then((r) => addResultMessage(`**Binary:** \`${r}\``));
          } else { addResultMessage("Usage: `/binary <text>` — converts text to binary"); }
          break;
        case "morse":
          if (args) {
            callToolApi("morse_encode", { text: args }).then((r) => addResultMessage(`**Morse Code:** \`${r}\``));
          } else { addResultMessage("Usage: `/morse <text>` — encodes text to Morse code"); }
          break;
        case "caesar":
          if (args) {
            callToolApi("caesar_encrypt", { text: args, shift: 3 }).then((r) => addResultMessage(`**Caesar Cipher (shift 3):** \`${r}\``));
          } else { addResultMessage("Usage: `/caesar <text>` — encodes with Caesar cipher (shift 3)"); }
          break;
        case "hex":
          if (args) {
            callToolApi("hex_encode", { text: args }).then((r) => addResultMessage(`**Hex:** \`${r}\``));
          } else { addResultMessage("Usage: `/hex <text>` — converts text to hexadecimal"); }
          break;
        case "escape":
          if (args) {
            callToolApi("string_escape", { text: args }).then((r) => addResultMessage(`**Escaped:** \`${r}\``));
          } else { addResultMessage("Usage: `/escape <text>` — escapes special characters"); }
          break;
        case "slug":
          if (args) {
            callToolApi("slugify", { text: args }).then((r) => addResultMessage(`**Slug:** \`${r}\``));
          } else { addResultMessage("Usage: `/slug <text>` — generates URL-friendly slug"); }
          break;
        case "strip":
          if (args) {
            callToolApi("strip_html", { text: args }).then((r) => addResultMessage(`**Stripped HTML:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/strip <html>` — removes all HTML tags"); }
          break;
        case "indent":
          if (args) {
            handleSendRef.current(`Fix the indentation of this code to be consistent and proper:\n\n${args}`);
          } else { addResultMessage("Usage: `/indent <code>` — fixes code indentation"); }
          break;
        case "csv":
          if (args) {
            callToolApi("csv_parse", { csv: args }).then((r) => addResultMessage(`**CSV as Table:**\n\`\`\`\n${r}\n\`\`\``));
          } else { addResultMessage("Usage: `/csv <comma-separated data>` — formats CSV as table"); }
          break;

        // ═══ AI-POWERED COMMANDS ═════════════════════════════════════════
        case "summarize": {
          const chatContent = messages.slice(-20).map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 200)}`).join("\n");
          handleSendRef.current(chatContent ? `Summarize this conversation in 5 key points:\n\n${chatContent}` : "No conversation to summarize yet. Start chatting first!");
          break;
        }
        case "rewrite":
          handleSendRef.current(args ? `Rewrite the following text in a more professional and engaging tone:\n\n${args}` : "Paste the text you'd like me to rewrite.");
          break;
        case "quiz":
          handleSendRef.current(args ? `Generate a 5-question quiz about: ${args}. Include answers.` : "What topic should I generate a quiz about?");
          break;
        case "flashcard":
          handleSendRef.current(args ? `Create 10 study flashcards (question on front, answer on back) about: ${args}` : "What topic should I create flashcards for?");
          break;
        case "analogy":
          handleSendRef.current(args ? `Explain this concept using 3 creative analogies that a non-technical person would understand: ${args}` : "What concept should I explain using analogies?");
          break;
        case "debate":
          handleSendRef.current(args ? `Present a balanced debate on: "${args}". Give 3 strong arguments FOR and 3 strong arguments AGAINST, then provide a neutral conclusion.` : "What topic should I debate both sides of?");
          break;
        case "factcheck":
          handleSendRef.current(args ? `Search the web and fact-check this claim with evidence: ${args}` : "What claim would you like me to fact-check?");
          break;
        case "email":
          handleSendRef.current(args ? `Draft a professional email about: ${args}. Include subject line, greeting, body, and sign-off.` : "What should the email be about?");
          break;
        case "tweet":
          handleSendRef.current(args ? `Write a viral tweet (under 280 chars) about: ${args}. Make it engaging and include relevant hashtags.` : "What should I tweet about?");
          break;
        case "headline":
          handleSendRef.current(args ? `Generate 5 catchy headlines for: ${args}. Make them attention-grabbing and shareable.` : "What topic should I generate headlines for?");
          break;
        case "tagline":
          handleSendRef.current(args ? `Generate 5 creative taglines for: ${args}. They should be memorable and impactful.` : "What project/product should I create taglines for?");
          break;
        case "acronym":
          handleSendRef.current(args ? `Create creative backronyms for: ${args}. Generate 3 fun and 3 professional options.` : "What word should I create an acronym for?");
          break;
        case "eli5":
          handleSendRef.current(args ? `Explain this like I'm 5 years old, using simple words and relatable examples: ${args}` : "What should I explain simply?");
          break;
        case "proscons":
          handleSendRef.current(args ? `List 5 pros and 5 cons of: ${args}. Be balanced and objective.` : "What should I list pros and cons for?");
          break;
        case "checklist":
          handleSendRef.current(args ? `Create a comprehensive step-by-step checklist for: ${args}` : "What should I create a checklist for?");
          break;
        case "outline":
          handleSendRef.current(args ? `Create a detailed outline for: ${args}. Include main sections and subsections.` : "What should I create an outline for?");
          break;
        case "review":
          handleSendRef.current(args ? `Review this code thoroughly. Check for bugs, security issues, performance problems, and suggest improvements:\n\n${args}` : "Paste the code you'd like me to review.");
          break;
        case "commit":
          handleSendRef.current(args ? `Generate 3 git commit message options for these changes:\n\n${args}` : "Describe your changes and I'll generate commit messages.");
          break;
        case "readme":
          handleSendRef.current(args ? `Generate a comprehensive README.md for: ${args}. Include description, installation, usage, and contributing sections.` : "What project should I generate a README for?");
          break;
        case "gitignore":
          if (args) {
            callToolApi("gitignore", { type: args }).then((r) => addResultMessage(`**.gitignore for ${args}:**\n\`\`\`\n${r}\n\`\`\``));
          } else {
            addResultMessage("**Available .gitignore templates:**\n- `/gitignore node`\n- `/gitignore python`\n- `/gitignore go`\n- `/gitignore rust`\n- `/gitignore java`\n- `/gitignore react`");
          }
          break;
        case "docker":
          handleSendRef.current(args ? `Generate a Dockerfile and docker-compose.yml for: ${args}. Include proper multi-stage builds and best practices.` : "What project should I generate Docker files for?");
          break;
        case "api":
          handleSendRef.current(args ? `Design a REST API for: ${args}. Include endpoints, request/response schemas, authentication, and error handling.` : "What should I design an API for?");
          break;
        case "test":
          handleSendRef.current(args ? `Write comprehensive unit tests for this code:\n\n${args}` : "Paste the code you'd like tests for.");
          break;
        case "refactor":
          handleSendRef.current(args ? `Refactor this code to be cleaner, more maintainable, and follow best practices:\n\n${args}` : "Paste the code you'd like me to refactor.");
          break;
        case "schema":
          handleSendRef.current(args ? `Design a database schema for: ${args}. Include tables, columns, types, relationships, and indexes.` : "What should I design a database schema for?");
          break;

        // ═══ CREATIVE COMMANDS ═══════════════════════════════════════════
        case "haiku":
          handleSendRef.current(args ? `Write a haiku poem about: ${args}` : "What topic should I write a haiku about?");
          break;
        case "story":
          handleSendRef.current(args ? `Write a short creative story (300 words) about: ${args}` : "What should the story be about?");
          break;
        case "name":
          handleSendRef.current(args ? `Generate 10 creative project/code names for: ${args}. Make them memorable and unique.` : "What should I generate names for?");
          break;
        case "ascii":
          if (args) {
            callToolApi("ascii_art", { text: args }).then((r) => addResultMessage(`**ASCII Art:**\n\`\`\`\n${r}\n\`\`\``));
          } else {
            callToolApi("ascii_art", { text: "HELLO" }).then((r) => addResultMessage(`**ASCII Art:**\n\`\`\`\n${r}\n\`\`\``));
          }
          break;
        case "riddle":
          handleSendRef.current(args ? `Create a riddle about: ${args}. Include the answer.` : "Create a fun riddle for me!");
          break;
        case "motivate":
          handleSendRef.current("Give me a powerful, specific motivational message for a developer who is working hard. Be inspiring and genuine.");
          break;
        case "joke":
          handleSendRef.current("Tell me a clever programming joke that most developers would find funny.");
          break;
        case "mantra":
          handleSendRef.current(args ? `Create a short, powerful focus mantra (one sentence) for someone working on: ${args}` : "Create a short focus mantra for my coding session today.");
          break;
        case "codename":
          handleSendRef.current(args ? `Generate 5 secret agent-style codenames for: ${args}. Use NATO alphabet + animal combinations.` : "Generate 5 cool secret agent codenames for me!");
          break;
        case "pitch":
          handleSendRef.current(args ? `Create a compelling 30-second elevator pitch for: ${args}` : "What should I create an elevator pitch for?");
          break;
        case "recipe":
          handleSendRef.current(args ? `Generate a code recipe (ready-to-use implementation) for: ${args}. Include full working code with comments.` : "What code pattern should I generate a recipe for?");
          break;
        case "blog":
          handleSendRef.current(args ? `Write an engaging, SEO-optimized blog post (500+ words) about: ${args}. Include a catchy title, intro hook, and actionable takeaways.` : "What should I write a blog post about?");
          break;
        case "letter":
          handleSendRef.current(args ? `Compose a well-written letter about: ${args}. Make it professional yet warm.` : "What should I write a letter about?");
          break;
        case "slogan":
          handleSendRef.current(args ? `Generate 7 catchy slogans for: ${args}. Mix playful and professional tones.` : "What should I create slogans for?");
          break;
        case "horoscope":
          handleSendRef.current("Give me a fun developer horoscope reading. Be creative and humorous, mixing astrology with coding references.");
          break;

        // ═══ POWER USER COMMANDS ═════════════════════════════════════════
        case "focus":
          toggleFocusMode();
          addResultMessage(focusMode ? "**Focus Mode OFF** — Sidebar restored." : "**Focus Mode ON** — Distraction-free mode. Press `/focus` again to exit.");
          break;
        case "pin":
          if (messages.length > 0) {
            const lastAiMsg = [...messages].reverse().find((m) => m.role === "assistant");
            if (lastAiMsg) {
              pinMessage(lastAiMsg.id);
              addResultMessage(`**Pinned** message from ${lastAiMsg.content.slice(0, 50)}...`);
            }
          } else { addResultMessage("No messages to pin yet."); }
          break;
        case "searchchat":
          if (args) {
            useAppStore.getState().setSearchQuery(args);
            const found = messages.filter((m) => m.content.toLowerCase().includes(args.toLowerCase()));
            addResultMessage(`**Search Results** for "${args}": Found ${found.length} message(s).\n\n${found.slice(0, 5).map((m) => `- **${m.role}**: ${m.content.slice(0, 80)}...`).join("\n")}`);
          } else { addResultMessage("Usage: `/searchchat <query>` — searches through all messages"); }
          break;
        case "shortcuts":
          setShortcutsOpen(true);
          break;
        case "speed":
          addResultMessage("**Streaming Speed:** Current speed is normal. Speed adjustment is handled by your network connection to the Gemini API.");
          break;
        case "voice":
          toggleVoiceAutoRead();
          addResultMessage(voiceAutoRead ? "**Voice Auto-Read OFF** — AI responses won't be spoken automatically." : "**Voice Auto-Read ON** — AI responses will be spoken aloud automatically.");
          break;
        case "timer":
          if (args === "stop") {
            setPomodoroState({ isRunning: false });
            addResultMessage("**Pomodoro Timer Stopped.**");
          } else if (args === "break") {
            setPomodoroState({ mode: "break", secondsLeft: 5 * 60, isRunning: true });
            addResultMessage("**Break Timer Started!** 5 minutes. Take a rest! ☕");
          } else {
            setPomodoroState({ mode: "work", secondsLeft: 25 * 60, isRunning: true });
            addResultMessage("**Pomodoro Timer Started!** 25 minutes of focused work. Use `/timer stop` to stop, `/timer break` for a 5-min break.");
          }
          break;
        case "persona":
          if (args) {
            useAppStore.getState().setAgentPersona(args);
            addResultMessage(`**Agent Persona Updated!** The agent will now adopt this personality: "${args}"`);
          } else {
            addResultMessage(`**Current Persona:** ${agentPersona || "Default"}\n\nUsage: \`/persona <description>\` — e.g., \`/persona You are a sarcastic senior developer who loves TypeScript\``);
          }
          break;
        case "import":
          addResultMessage("**Import Chat:** To import a previous chat, drag and drop a .md file onto the chat area, or paste the content and use `/summarize` to process it.");
          break;
        case "token":
          if (args) {
            callToolApi("estimate_tokens", { text: args }).then((r) => addResultMessage(`**Token Estimate:**\n${r}`));
          } else {
            const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
            addResultMessage(`**Conversation Token Estimate:**\n- Total characters: ${totalChars}\n- Estimated tokens: ~${Math.ceil(totalChars / 4)}\n- Cost estimate (Gemini Flash): ~$${(totalChars / 4 * 0.000000075).toFixed(6)}`);
          }
          break;
        case "theme":
          useAppStore.getState().updateSettings({ theme: useAppStore.getState().settings.theme === "dark" ? "light" : "dark" });
          break;
        case "compact":
          toggleCompactMode();
          addResultMessage(compactMode ? "**Compact Mode OFF** — Normal display restored." : "**Compact Mode ON** — Tighter message spacing.");
          break;
        case "wrap":
          toggleWordWrap();
          addResultMessage(wordWrap ? "**Word Wrap OFF** — Code blocks scroll horizontally." : "**Word Wrap ON** — Code blocks will wrap long lines.");
          break;
        case "autoscroll":
          useAppStore.getState().setAutoScroll(!useAppStore.getState().autoScroll);
          addResultMessage(useAppStore.getState().autoScroll ? "**Auto-Scroll ON**" : "**Auto-Scroll OFF**");
          break;
        case "save":
          if (args) {
            setDraftMessage(args);
            addResultMessage(`**Draft Saved:** "${args.slice(0, 50)}${args.length > 50 ? "..." : ""}"`);
          } else { addResultMessage("Usage: `/save <message>` — saves a draft message for later"); }
          break;
        case "history": {
          const history = useAppStore.getState().commandHistory.slice(0, 20);
          addResultMessage(`**Command History** (last 20):\n\n${history.map((c) => `- \`${c}\``).join("\n") || "No commands in history yet."}`);
          break;
        }
        case "batch":
          if (args) {
            const queries = args.split("|").map((q) => q.trim()).filter(Boolean);
            addResultMessage(`**Batch Mode:** I'll process ${queries.length} queries in sequence.\n\n${queries.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nProcessing first query...`);
            if (queries[0]) handleSendRef.current(queries[0]);
          } else { addResultMessage("Usage: `/batch query1 | query2 | query3` — runs multiple queries separated by |"); }
          break;
        case "snapshot":
          exportChat();
          addResultMessage("**Chat Snapshot Saved!** Downloaded as markdown file.");
          break;
        case "plugins":
          addResultMessage("**Plugin System:** Coming soon! AgentForge will support custom plugins that extend the agent's capabilities. Stay tuned for the plugin marketplace.");
          break;
        case "features":
          setFeatureHubOpen(true);
          break;

        default:
          addResultMessage(`Unknown command: /${cmd.id}. Type / to see all available commands.`);
      }
    },
    [
      generateImage, exportChat, clearMessages, setCurrentConversationId,
      addResultMessage, currentAgent, messages, addToCommandHistory,
      focusMode, toggleFocusMode, compactMode, toggleCompactMode,
      wordWrap, toggleWordWrap, voiceAutoRead, toggleVoiceAutoRead,
      draftMessage, setDraftMessage, agentPersona, setPomodoroState,
      pomodoroState.isRunning, pinMessage, setFeatureHubOpen, setShortcutsOpen,
    ]
  );

  // ─── Main send handler ──────────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      if (!isGeminiConnected) {
        alert("Please connect your Gemini API key first. Click 'Enter API Key' in the sidebar.");
        return;
      }

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content,
        agent: currentAgent,
        timestamp: Date.now(),
      };
      addMessage(userMessage);

      // Save conversation if new
      if (!currentConversationId) {
        const convId = uuidv4();
        const conv = {
          id: convId,
          title: content.slice(0, 40) + (content.length > 40 ? "..." : ""),
          agent: currentAgent,
          messages: [userMessage],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        addConversation(conv);
        setCurrentConversationId(convId);
      } else {
        updateConversation(currentConversationId, {
          messages: [...messages, userMessage],
          updatedAt: Date.now(),
        });
      }

      setIsLoading(true);

      const assistantMessageId = uuidv4();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        agent: currentAgent,
        timestamp: Date.now(),
        toolCalls: [],
      };
      addMessage(assistantMessage);

      try {
        const chatMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const { settings, memories } = useAppStore.getState();
        const persona = useAppStore.getState().agentPersona;

        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: chatMessages,
            agent: currentAgent,
            geminiApiKey: geminiApiKey || undefined,
            model: settings.model || undefined,
            memories: memories.length > 0 ? memories.map((m) => ({ key: m.key, value: m.value })) : undefined,
            persona: persona || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let accumulatedContent = "";
        const toolCalls: ToolCall[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.done) break;
                if (parsed.error) {
                  accumulatedContent += `\n\n*Error: ${parsed.error}*`;
                  updateMessage(assistantMessageId, { content: accumulatedContent });
                  break;
                }

                if (parsed.tool_call) {
                  const tc = parsed.tool_call;
                  const toolCallId = uuidv4();
                  toolCalls.push({ id: toolCallId, name: tc.name, status: "running", args: tc.args });
                  const displayText = tc.label || tc.name;
                  const argsDisplay = tc.args
                    ? Object.entries(tc.args).map(([k, v]) => {
                        const val = typeof v === "string" ? v : JSON.stringify(v);
                        return `${k}: ${val.length > 80 ? val.slice(0, 80) + "..." : val}`;
                      }).join(", ")
                    : "";
                  accumulatedContent += `\n> ${tc.icon || "🔧"} **${displayText}**${argsDisplay ? ` — \`${argsDisplay}\`` : ""}\n`;
                  updateMessage(assistantMessageId, { content: accumulatedContent, toolCalls: [...toolCalls] });
                }

                if (parsed.tool_result) {
                  const tr = parsed.tool_result;
                  const tcIndex = toolCalls.findIndex((tc) => tc.name === tr.name && tc.status === "running");
                  if (tcIndex >= 0) {
                    toolCalls[tcIndex] = { ...toolCalls[tcIndex], status: tr.success ? "completed" : "error", result: tr.output?.slice(0, 500) || tr.error?.slice(0, 200) };
                  }
                  if (tr.success && tr.output) {
                    const outputPreview = tr.output.length > 300 ? tr.output.slice(0, 300) + "..." : tr.output;
                    accumulatedContent += `> ✅ *Result:* ${outputPreview.replace(/\n/g, " ")}\n\n`;
                  } else if (tr.error) {
                    accumulatedContent += `> ❌ *Error:* ${tr.error.slice(0, 200)}\n\n`;
                  }
                  updateMessage(assistantMessageId, { content: accumulatedContent, toolCalls: [...toolCalls] });
                }

                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateMessage(assistantMessageId, { content: accumulatedContent, toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined });
                }
              } catch {
                // Skip malformed data
              }
            }
          }
        }

        if (!accumulatedContent) {
          updateMessage(assistantMessageId, { content: "I apologize, but I couldn't generate a response. Please try again." });
        }

        // Voice auto-read
        if (useAppStore.getState().voiceAutoRead) {
          const text = accumulatedContent
            .replace(/```[\s\S]*?```/g, " code block ")
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/`(.*?)`/g, "$1")
            .slice(0, 2000);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.0;
          speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessage(assistantMessageId, {
          content: error instanceof Error ? `Error: ${error.message}` : "I'm sorry, I encountered an error. Please check your API key and try again.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, currentAgent, currentConversationId, addMessage, updateMessage, setIsLoading, addConversation, updateConversation, geminiApiKey, isGeminiConnected]
  );

  // Keep ref up to date for slash commands
  handleSendRef.current = handleSend;

  // Format pomodoro time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={focusMode ? "fixed inset-0 z-50 bg-background" : ""}>
      <SidebarProvider defaultOpen>
        {!focusMode && <AppSidebar />}
        <SidebarInset>
          <div className={`flex ${focusMode ? "h-screen" : "min-h-svh"} flex-col`}>
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-border px-4 py-2.5 bg-background/80 backdrop-blur-sm">
              {!focusMode && <SidebarTrigger className="-ml-1" />}
              {focusMode && (
                <Button variant="ghost" size="sm" onClick={toggleFocusMode} className="gap-1.5 text-xs">
                  <Minimize2 className="size-3.5" />
                  Exit Focus
                </Button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-base">{agent?.icon}</span>
                <div>
                  <h2 className="text-sm font-semibold leading-none">
                    {agent?.name || "AgentForge"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isLoading
                      ? currentAgent === "openmanus" ? "Working..." : "Thinking..."
                      : isGeminiConnected ? "Gemini connected" : "No API key"}
                  </p>
                </div>
              </div>
              {/* Connection status + Pomodoro */}
              <div className="ml-auto flex items-center gap-2">
                {/* Pomodoro Timer */}
                {pomodoroState.isRunning && (
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${pomodoroState.mode === "work" ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                    <Timer className={`size-3 ${pomodoroState.mode === "work" ? "text-red-500" : "text-emerald-500"}`} />
                    <span className={`text-[10px] font-mono font-medium ${pomodoroState.mode === "work" ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {pomodoroState.mode === "work" ? "Focus" : "Break"} {formatTime(pomodoroState.secondsLeft)}
                    </span>
                  </div>
                )}
                {isGeminiConnected && (
                  <>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1">
                      <div className={`size-1.5 rounded-full ${isLoading ? "animate-pulse" : ""} bg-emerald-500`} />
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        {isLoading ? (currentAgent === "openmanus" ? "Executing" : "Streaming") : "Gemini Live"}
                      </span>
                    </div>
                    {currentAgent === "openmanus" && (
                      <div className="hidden sm:flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          16 Tools Active
                        </span>
                      </div>
                    )}
                  </>
                )}
                {!isGeminiConnected && (
                  <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1">
                    <div className="size-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">API Key Required</span>
                  </div>
                )}
                {focusMode && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setFeatureHubOpen(true)}>
                    <Sparkles className="size-4" />
                  </Button>
                )}
              </div>
            </header>

            {/* Chat Area */}
            <ChatInterface />

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onSlashCommand={handleSlashCommand}
              disabled={isLoading || !isGeminiConnected}
            />
          </div>
        </SidebarInset>

        {/* Settings Panel */}
        <SettingsPanel />

        {/* Command Palette */}
        <CommandPalette />

        {/* Template Modal */}
        {templateOpen && (
          <TemplateModal
            onSelect={(template) => { handleSendRef.current(template.prompt); }}
            onClose={() => setTemplateOpen(false)}
          />
        )}

        {/* Snippet Library */}
        {snippetOpen && (
          <SnippetLibrary
            onClose={() => setSnippetOpen(false)}
            onUseSnippet={(snippet) => {
              handleSendRef.current(`Here is a saved snippet in ${snippet.language}:\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\nPlease review and improve it.`);
            }}
          />
        )}

        {/* Memory Panel */}
        {memoryOpen && <MemoryPanel onClose={() => setMemoryOpen(false)} />}

        {/* Split View */}
        <SplitView />

        {/* Feature Hub Modal */}
        {featureHubOpen && <FeatureHubModal onClose={() => setFeatureHubOpen(false)} />}

        {/* Shortcuts Modal */}
        {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      </SidebarProvider>
    </div>
  );
}

// ─── Feature Hub Modal ──────────────────────────────────────────────────────
function FeatureHubModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-500" />
              AgentForge Feature Hub
            </h2>
            <p className="text-xs text-muted-foreground mt-1">100+ features at your fingertips</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {COMMAND_CATEGORIES.map((cat) => {
          const cmds = SLASH_COMMANDS.filter((c) => c.category === cat.id);
          return (
            <div key={cat.id} className="mb-4">
              <h3 className={`text-sm font-semibold ${cat.color} mb-2`}>{cat.label}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {cmds.map((cmd) => (
                  <div key={cmd.id} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
                    <div className="flex size-6 items-center justify-center rounded bg-muted shrink-0">
                      {cmd.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{cmd.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{cmd.description}</div>
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono shrink-0">{cmd.command}</code>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shortcuts Modal ────────────────────────────────────────────────────────
function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: "⌘/Ctrl + K", action: "Open Command Palette" },
    { keys: "Enter", action: "Send message" },
    { keys: "Shift + Enter", action: "New line" },
    { keys: "/", action: "Open slash commands" },
    { keys: "↑/↓", action: "Navigate slash commands" },
    { keys: "Tab", action: "Select slash command" },
    { keys: "Esc", action: "Close menus/modals" },
    { keys: "/focus", action: "Toggle distraction-free mode" },
    { keys: "/clear", action: "Clear chat" },
    { keys: "/export", action: "Export chat as markdown" },
    { keys: "/features", action: "Browse all 100+ features" },
    { keys: "/shortcuts", action: "Show this help" },
    { keys: "/timer", action: "Start Pomodoro timer" },
    { keys: "/voice", action: "Toggle auto-read" },
    { keys: "/compact", action: "Toggle compact mode" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Keyboard className="size-5 text-violet-500" />
            Keyboard Shortcuts
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
              <span className="text-xs text-muted-foreground">{s.action}</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-[10px] font-mono">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
