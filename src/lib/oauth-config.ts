import { NextRequest } from "next/server";

/**
 * OAuth configuration for Gemini CLI integration.
 *
 * For WEB DEPLOYMENT (Vercel, etc.):
 *   You MUST create your own Google OAuth 2.0 credentials and set:
 *     - GOOGLE_CLIENT_ID (required)
 *     - GOOGLE_CLIENT_SECRET (required)
 *     - GEMINI_REDIRECT_URI (required - e.g. https://your-app.vercel.app/api/auth/gemini/callback)
 *
 *   The Gemini CLI's built-in client only works with localhost redirects,
 *   so it cannot be used for web deployments.
 *
 * For LOCAL DEVELOPMENT:
 *   Works automatically using the Gemini CLI's built-in OAuth client
 *   with http://localhost redirect.
 *
 * Setup instructions:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create a project (or use existing)
 *   3. Click "Create Credentials" → "OAuth client ID"
 *   4. Select "Web application" as the application type
 *   5. Add Authorized redirect URI: https://your-app.vercel.app/api/auth/gemini/callback
 *   6. Copy the Client ID and Client Secret
 *   7. Enable "Generative Language API" at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
 *   8. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GEMINI_REDIRECT_URI env vars
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
