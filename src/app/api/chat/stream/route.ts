import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getSystemPrompt } from "@/lib/prompts";
import type { AgentId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agent, geminiAccessToken } = body as {
      messages: { role: string; content: string }[];
      agent: AgentId;
      geminiAccessToken?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if we have a Gemini OAuth token
    const hasGeminiToken = !!geminiAccessToken;

    // Build the system prompt based on agent selection
    const systemPrompt = getSystemPrompt(agent || "gemini");

    // Add authentication context to the system prompt
    let authContext = "";
    if (hasGeminiToken) {
      if (agent === "openmanus") {
        authContext = `\n\n[SYSTEM] You are currently authenticated with Google Gemini via OAuth. Use your full Gemini brain capabilities including search grounding and advanced reasoning. The user has signed in with their Google account, giving you access to the complete Gemini API with higher rate limits (60 req/min, 1000 req/day on free tier).`;
      } else {
        authContext = `\n\n[SYSTEM] You are authenticated with Google Gemini via OAuth. The user has signed in with their Google account. You have access to the complete Gemini API with higher rate limits and search grounding capabilities.`;
      }
    }

    const zai = await ZAI.create();

    const chatMessages = [
      {
        role: "system" as const,
        content: systemPrompt + authContext,
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const stream = await zai.chat.completions.create({
      messages: chatMessages,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              const data = `data: ${JSON.stringify({
                content,
                agent: agent || "gemini",
                authenticated: hasGeminiToken,
              })}\n\n`;
              controller.enqueue(encoder.encode(data));
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
