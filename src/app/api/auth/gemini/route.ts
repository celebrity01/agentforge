import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth-config";

export async function GET(request: NextRequest) {
  const config = getOAuthConfig(request);

  if (!config) {
    return NextResponse.json(
      {
        error: "OAuth not configured",
        message:
          "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. " +
          "See .env.example for instructions.",
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const returnTo = searchParams.get("returnTo") || "/";

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  // Store state and redirect URI in cookies for the callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
  });
  response.cookies.set("oauth_return_to", returnTo, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });
  response.cookies.set("oauth_redirect_uri", config.redirectUri, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
