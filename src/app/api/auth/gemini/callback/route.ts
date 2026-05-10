import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/oauth-config";

export async function GET(request: NextRequest) {
  const config = getOAuthConfig(request);

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth error (user denied access, etc.)
  if (error) {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Auth Failed</title></head>
<body>
<script>
  window.opener?.postMessage({ type: 'gemini-auth-error', error: '${error}' }, '*');
  window.close();
</script>
<p>Authentication failed: ${error}. You can close this window.</p>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code || !state) {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Auth Failed</title></head>
<body>
<script>
  window.opener?.postMessage({ type: 'gemini-auth-error', error: 'Missing code or state' }, '*');
  window.close();
</script>
<p>Authentication failed: missing parameters. You can close this window.</p>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Verify state (CSRF protection)
  const storedState = request.cookies.get("oauth_state")?.value;
  if (state !== storedState) {
    const html = `
<!DOCTYPE html>
<html>
<head><title>Auth Failed</title></head>
<body>
<script>
  window.opener?.postMessage({ type: 'gemini-auth-error', error: 'Invalid state parameter' }, '*');
  window.close();
</script>
<p>Authentication failed: security check failed. You can close this window.</p>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Get the redirect URI that was used during the auth request
  const redirectUri = request.cookies.get("oauth_redirect_uri")?.value ||
    config.redirectUri;

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Token exchange failed");
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user info from userinfo endpoint
    let userInfo = { email: "", name: "", picture: "" };
    try {
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      }
    } catch {
      // Non-critical: proceed without user info
    }

    const expiresAt = Date.now() + (expires_in || 3600) * 1000;

    // Return HTML that sends the auth data back to the opener window via postMessage
    const authData = JSON.stringify({
      type: "gemini-auth-success",
      accessToken: access_token,
      refreshToken: refresh_token || null,
      expiresAt,
      userEmail: userInfo.email || null,
      userName: userInfo.name || null,
      userAvatar: userInfo.picture || null,
    });

    const html = `
<!DOCTYPE html>
<html>
<head><title>Auth Successful</title></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;margin:0;background:#0a0a0a;color:#fff">
<div style="text-align:center;padding:2rem">
  <div style="font-size:3rem;margin-bottom:1rem">&#10003;</div>
  <h2 style="margin:0 0 0.5rem;color:#10b981">Connected!</h2>
  <p style="color:#888;margin:0">Gemini is now your brain. You can close this window.</p>
</div>
<script>
  window.opener?.postMessage(${authData}, '*');
  setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>`;

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });

    // Clear OAuth cookies
    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_return_to");
    response.cookies.delete("oauth_redirect_uri");

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    const html = `
<!DOCTYPE html>
<html>
<head><title>Auth Failed</title></head>
<body>
<script>
  window.opener?.postMessage({ type: 'gemini-auth-error', error: 'Token exchange failed' }, '*');
  window.close();
</script>
<p>Authentication failed. You can close this window.</p>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }
}
