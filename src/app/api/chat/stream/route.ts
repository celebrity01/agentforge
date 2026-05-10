import { NextRequest } from "next/server";
import { getSystemPrompt } from "@/lib/prompts";
import type { AgentId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agent, geminiApiKey } = body as {
      messages: { role: string; content: string }[];
      agent: AgentId;
      geminiApiKey?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for Gemini API key — either from client or env var
    const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key required. Get yours at https://aistudio.google.com/apikey",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build the system prompt
    const systemPrompt = getSystemPrompt(agent || "gemini");

    // Call the Gemini API directly
    const chatMessages = [
      { role: "user" as const, parts: [{ text: systemPrompt }] },
      {
        role: "model" as const,
        parts: [{ text: "I understand. I will follow these instructions." }],
      },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      })),
    ];

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-05-20";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
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
    const encoder = new TextEncoder();
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
                    const outData = `data: ${JSON.stringify({
                      content: text,
                      agent: agent || "gemini",
                    })}\n\n`;
                    controller.enqueue(encoder.encode(outData));
                  }
                } catch {
                  // Skip malformed SSE data
                }
              }
            }
          }

          const doneData = `data: ${JSON.stringify({ done: true })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (streamError) {
          console.error("Stream error:", streamError);
          const errorData = `data: ${JSON.stringify({
            error: "Stream interrupted",
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
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
