---
Task ID: 1
Agent: Main Agent
Task: Fix all errors and implement Gemini OAuth + OpenManus-Gemini-Brain

Work Log:
- Fixed critical `useState` import missing in settings-panel.tsx (was removed in previous edit)
- Fixed hydration mismatch by using `useSyncExternalStore` for mounted state
- Added GeminiAuthState type to store with accessToken, refreshToken, expiresAt, user info
- Added auth persistence to localStorage with auto-expiry check
- Created Google OAuth flow: /api/auth/gemini (initiates) → /api/auth/gemini/callback (handles callback)
- OAuth callback uses postMessage to send auth data back to opener window
- Created /api/auth/status endpoint to check if OAuth is configured
- Created /api/auth/refresh endpoint for automatic token refresh
- Updated chat stream API to accept geminiAccessToken and add auth context to system prompt
- Updated OpenManus system prompt to reflect "powered by Gemini as your brain"
- Updated sidebar with Gemini Connection section (login/logout, user avatar, status)
- Updated settings panel with OAuth setup guide, Google Sign-in button, fallback API keys
- Updated agent cards to show "Gemini-powered brain" badge and auth requirement
- Updated chat interface with "Powered by Gemini via your Google account" indicator
- Updated vercel.json with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GEMINI_REDIRECT_URI env vars
- All lint checks pass with zero errors

Stage Summary:
- Critical useState bug fixed
- Full Google OAuth flow implemented (popup-based with postMessage)
- OpenManus now uses Gemini as its "brain" when authenticated
- Both agents share the same Gemini connection
- Auth state persisted in localStorage with auto-refresh
- OAuth setup guide included in settings for self-hosting
