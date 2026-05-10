import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = !!process.env.GEMINI_API_KEY;

  return NextResponse.json({
    apiConfigured: hasApiKey,
    message: hasApiKey
      ? "Gemini API key configured on server"
      : "No server-side API key. Enter your Gemini API key in the app settings.",
  });
}
