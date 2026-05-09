import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { getSystemPrompt } from "@/lib/prompts";
import type { AgentId } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agent } = body as {
      messages: { role: string; content: string }[];
      agent: AgentId;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();
    const systemPrompt = getSystemPrompt(agent || "gemini");

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const response = await zai.chat.completions.create({
      messages: chatMessages,
      stream: false,
    });

    const assistantMessage =
      response.choices?.[0]?.message?.content ||
      "I apologize, but I couldn't generate a response. Please try again.";

    return NextResponse.json({
      response: assistantMessage,
      agent: agent || "gemini",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
