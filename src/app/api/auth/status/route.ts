import { NextResponse } from "next/server";

// We now always have OAuth configured because we use Gemini CLI's built-in client ID
export async function GET() {
  // Check if user has overridden with custom credentials
  const hasCustomCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );

  return NextResponse.json({
    oauthConfigured: true, // Always true now - we use Gemini CLI's built-in OAuth
    usingBuiltinClient: !hasCustomCredentials,
    clientId: hasCustomCredentials
      ? `${process.env.GOOGLE_CLIENT_ID!.slice(0, 8)}... (custom)`
      : "68125580... (Gemini CLI built-in)",
  });
}
