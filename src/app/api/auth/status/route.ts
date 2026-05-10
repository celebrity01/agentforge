import { NextResponse } from "next/server";

export async function GET() {
  const hasCustomCredentials = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );

  return NextResponse.json({
    oauthConfigured: hasCustomCredentials,
    message: hasCustomCredentials
      ? "OAuth configured with your Google credentials"
      : "OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars. " +
        "Create credentials at https://console.cloud.google.com/apis/credentials (Web application type)",
  });
}
