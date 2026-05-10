import { NextRequest } from "next/server";

/**
 * OAuth configuration for Gemini CLI integration.
 *
 * For WEB DEPLOYMENT (Vercel, etc.):
 *   Set these environment variables:
 *     - GOOGLE_CLIENT_ID (required)
 *     - GOOGLE_CLIENT_SECRET (required)
 *     - GEMINI_REDIRECT_URI (required - e.g. https://your-app.vercel.app/api/auth/gemini/callback)
 *
 * If GEMINI_REDIRECT_URI is not set, it is auto-detected from the request headers.
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

  // Determine redirect URI - use env var first, then auto-detect from request
  let redirectUri = process.env.GEMINI_REDIRECT_URI || "";

  if (!redirectUri && request) {
    // On Vercel: x-forwarded-host + x-forwarded-proto are set
    // Fallback: host header
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const proto =
      request.headers.get("x-forwarded-proto") || "https";

    if (host) {
      redirectUri = `${proto}://${host}/api/auth/gemini/callback`;
    }
  }

  return { clientId, clientSecret, redirectUri, scopes: SCOPES };
}

export { getOAuthConfig };
