import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    geminiApiKey: process.env.GEMINI_API_KEY ? "***configured***" : "",
    openaiApiKey: process.env.OPENAI_API_KEY ? "***configured***" : "",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geminiApiKey, openaiApiKey, model } = body as {
      geminiApiKey?: string;
      openaiApiKey?: string;
      model?: string;
    };

    // In a production app, you would save these securely
    // For now, we acknowledge the settings
    const response: Record<string, string> = {
      status: "saved",
    };

    if (model) {
      response.model = model;
    }

    if (geminiApiKey) {
      process.env.GEMINI_API_KEY = geminiApiKey;
      response.geminiApiKey = "***configured***";
    }

    if (openaiApiKey) {
      process.env.OPENAI_API_KEY = openaiApiKey;
      response.openaiApiKey = "***configured***";
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
