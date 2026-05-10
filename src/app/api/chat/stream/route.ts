import { NextRequest } from "next/server";
import { getSystemPrompt } from "@/lib/prompts";
import type { AgentId } from "@/lib/types";
import { OPENMANUS_TOOLS, executeTool, TOOL_DISPLAY } from "@/lib/tools";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agent, geminiApiKey, model: clientModel, memories, persona } = body as {
      messages: { role: string; content: string }[];
      agent: AgentId;
      geminiApiKey?: string;
      model?: string;
      memories?: { key: string; value: string }[];
      persona?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for Gemini API key
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key required. Get yours at https://aistudio.google.com/apikey",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve model
    const VALID_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"];
    const model = clientModel && VALID_MODELS.includes(clientModel)
      ? clientModel
      : process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Build the system prompt (with memory and persona if available)
    let systemPrompt = getSystemPrompt(agent || "gemini", persona);
    if (memories && memories.length > 0) {
      const memoryContext = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
      systemPrompt += `\n\n## User Context (Remember These)\n\nThe user has provided the following preferences and context. Respect these in all responses:\n\n${memoryContext}`;
    }

    // Build initial chat messages with system prompt
    const chatMessages = [
      { role: "user" as const, parts: [{ text: systemPrompt }] },
      {
        role: "model" as const,
        parts: [{ text: "I understand. I will follow these instructions and use the available tools when needed." }],
      },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
    ];

    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
    const encoder = new TextEncoder();

    // Helper to send SSE event
    const sse = (data: Record<string, unknown>) =>
      encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

    // ─── OpenManus: ReAct loop with tool calling ────────────────────────────
    if (agent === "openmanus") {
      const readable = new ReadableStream({
        async start(controller) {
          try {
            let conversationContents = [...chatMessages];
            const MAX_ITERATIONS = 10;

            for (let i = 0; i < MAX_ITERATIONS; i++) {
              // Call Gemini (non-streaming for function call detection)
              const requestPayload: Record<string, unknown> = {
                contents: conversationContents,
                generationConfig: {
                  temperature: 1,
                  topP: 0.95,
                  topK: 64,
                  maxOutputTokens: 65536,
                },
                tools: OPENMANUS_TOOLS,
              };

              const geminiRes = await fetch(
                `${baseUrl}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(requestPayload),
                }
              );

              if (!geminiRes.ok) {
                const errorText = await geminiRes.text();
                let errorMessage = "Gemini API error";
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson?.error?.message || errorMessage;
                } catch { /* keep default */ }
                controller.enqueue(sse({ error: errorMessage }));
                break;
              }

              const geminiData = await geminiRes.json();
              const candidate = geminiData.candidates?.[0];
              if (!candidate?.content?.parts) {
                controller.enqueue(sse({ error: "No response from Gemini" }));
                break;
              }

              const parts = candidate.content.parts;

              // Check if any part is a function call
              const functionCalls = parts.filter(
                (p: Record<string, unknown>) => p.functionCall
              );
              const textParts = parts.filter(
                (p: Record<string, unknown>) => p.text
              );

              // If there's text along with or without function calls, stream it
              for (const part of textParts) {
                if (part.text) {
                  controller.enqueue(sse({
                    content: part.text,
                    agent: "openmanus",
                  }));
                }
              }

              // If no function calls, we're done
              if (functionCalls.length === 0) {
                break;
              }

              // Add model's response to conversation history
              conversationContents.push({
                role: "model" as const,
                parts: parts,
              });

              // Execute each function call
              const functionResponses = [];
              for (const fc of functionCalls) {
                const { name, args } = fc.functionCall;
                const display = TOOL_DISPLAY[name as string] || { icon: "🔧", label: name };

                // Notify client that a tool is being called
                controller.enqueue(sse({
                  tool_call: {
                    name,
                    args,
                    icon: display.icon,
                    label: display.label,
                  },
                }));

                // Execute the tool
                const result = await executeTool(name, args || {});

                // Notify client of the result
                controller.enqueue(sse({
                  tool_result: {
                    name,
                    success: result.success,
                    output: result.output?.slice(0, 2000) || "",
                    error: result.error?.slice(0, 500) || undefined,
                  },
                }));

                functionResponses.push({
                  functionResponse: {
                    name,
                    response: {
                      success: result.success,
                      output: result.output || "",
                      error: result.error || "",
                    },
                  },
                });
              }

              // Add function responses to conversation
              conversationContents.push({
                role: "user" as const,
                parts: functionResponses,
              });
            }

            // Done
            controller.enqueue(sse({ done: true }));
            controller.close();
          } catch (streamError) {
            console.error("OpenManus stream error:", streamError);
            controller.enqueue(sse({ error: "Stream interrupted" }));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ─── Gemini CLI: Simple streaming (no tools) ────────────────────────────
    const geminiResponse = await fetch(
      `${baseUrl}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: chatMessages,
          generationConfig: {
            temperature: 1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 65536,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);

      let errorMessage = "Gemini API error";
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson?.error?.message || errorMessage;
      } catch {
        // Use default error message
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: geminiResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the Gemini SSE response to our client
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const reader = geminiResponse.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (!data || data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const text =
                    parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(sse({
                      content: text,
                      agent: "gemini",
                    }));
                  }
                } catch {
                  // Skip malformed SSE data
                }
              }
            }
          }

          controller.enqueue(sse({ done: true }));
          controller.close();
        } catch (streamError) {
          console.error("Stream error:", streamError);
          controller.enqueue(sse({ error: "Stream interrupted" }));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Stream API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start stream. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
