import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth-config";

export async function POST(request: NextRequest) {
  const config = getOAuthConfig();

  try {
    const body = await request.json();
    const { refreshToken } = body as { refreshToken: string };

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token required" },
        { status: 400 }
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "Token refresh failed" },
        { status: 401 }
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;
    const expiresAt = Date.now() + (expires_in || 3600) * 1000;

    return NextResponse.json({
      accessToken: access_token,
      expiresAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
