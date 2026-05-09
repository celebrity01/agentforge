import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth configuration for Gemini CLI integration.
 *
 * All credentials are read from environment variables:
 *   - GOOGLE_CLIENT_ID (required)
 *   - GOOGLE_CLIENT_SECRET (required)
 *   - GEMINI_REDIRECT_URI (optional, auto-detected from request origin)
 *
 * To set up OAuth credentials:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID (Web application type)
 *   3. Add your redirect URI: https://your-domain.com/api/auth/gemini/callback
 *   4. Enable "Generative Language API" at https://console.cloud.google.com/apis/library
 *
 * Scopes match Gemini CLI's OAuth flow for Google AI Pro subscription access.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

function getOAuthConfig(request?: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  // Determine redirect URI
  let redirectUri = process.env.GEMINI_REDIRECT_URI || "";
  if (!redirectUri && request) {
    const origin = request.headers.get("origin") || request.headers.get("host")
      ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
      : "";
    redirectUri = `${origin}/api/auth/gemini/callback`;
  }

  return { clientId, clientSecret, redirectUri, scopes: SCOPES };
}

export { getOAuthConfig };
