import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth-config";

/**
 * Debug endpoint to check OAuth configuration.
 * Visit /api/auth/debug to see what redirect URI will be sent to Google.
 */
export async function GET(request: NextRequest) {
  const config = getOAuthConfig(request);

  return NextResponse.json({
    configured: !!config,
    clientId: config
      ? `${config.clientId.slice(0, 12)}...${config.clientId.slice(-20)}`
      : null,
    redirectUri: config?.redirectUri || null,
    scopes: config?.scopes || null,
    envCheck: {
      GOOGLE_CLIENT_ID_set: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET_set: !!process.env.GOOGLE_CLIENT_SECRET,
      GEMINI_REDIRECT_URI: process.env.GEMINI_REDIRECT_URI || "(not set)",
    },
    requestInfo: {
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      xForwardedProto: request.headers.get("x-forwarded-proto"),
      xForwardedHost: request.headers.get("x-forwarded-host"),
      suggestedRedirectUri: `https://${request.headers.get("host")}/api/auth/gemini/callback`,
    },
    instructions: !config
      ? "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars, then add the suggestedRedirectUri to your Google Cloud Console OAuth credentials."
      : !config.redirectUri
        ? "Set GEMINI_REDIRECT_URI env var to the suggestedRedirectUri above, then add it to your Google Cloud Console OAuth credentials."
        : `Make sure this exact redirect URI is added in Google Cloud Console → Credentials → Your OAuth Client → Authorized redirect URIs: ${config.redirectUri}`,
  });
}
