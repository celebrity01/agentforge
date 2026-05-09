"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { Key, Cpu, Info, Settings, ExternalLink, LogIn, Crown } from "lucide-react";
import { useSyncExternalStore, useState, useCallback } from "react";
import { toast } from "sonner";

const MODELS = [
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
];

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings, geminiAuth, clearGeminiAuth } =
    useAppStore();
  const { theme, setTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState(settings);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleSave = async () => {
    updateSettings(localSettings);

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localSettings),
      });
    } catch {
      // Settings saved locally even if API fails
    }

    toast.success("Settings saved successfully");
    setSettingsOpen(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSettingsOpen(false);
      setLocalSettings(settings);
    }
  };

  const handleGeminiLogin = useCallback(() => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      "/api/auth/gemini",
      "gemini-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=yes,status=no`
    );
  }, []);

  return (
    <Dialog open={settingsOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5 text-emerald-500" /> Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AgentForge experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Gemini Connection (Primary) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="size-4 text-violet-500" />
              Gemini Connection
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              {geminiAuth.isAuthenticated ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Connected via Google OAuth
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Signed in as <span className="font-medium text-foreground">{geminiAuth.userEmail || "authenticated user"}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Both OpenManus and Gemini CLI use Gemini as their brain through your Google account.
                    Free tier: 60 req/min, 1,000 req/day.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                    onClick={clearGeminiAuth}
                  >
                    Disconnect Google Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Sign in with your Google account to use Gemini as the brain for both agents.
                    This gives you free access (60 req/min, 1K req/day) without needing an API key.
                  </p>
                  <Button
                    className="w-full gap-2 bg-white text-gray-800 hover:bg-gray-100 border border-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:border-white/20"
                    size="sm"
                    onClick={handleGeminiLogin}
                  >
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* API Keys (Fallback) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="size-4 text-amber-500" />
              API Keys (Fallback)
            </div>
            <p className="text-[10px] text-muted-foreground">
              Only needed if Google OAuth is not configured. API keys are stored locally in your browser.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="gemini-key" className="text-xs">
                  Gemini API Key
                </Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder="AIza..."
                  value={localSettings.geminiApiKey}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      geminiApiKey: e.target.value,
                    })
                  }
                  className="text-sm"
                />
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-violet-500 hover:underline"
                >
                  Get API key from Google AI Studio <ExternalLink className="size-2.5" />
                </a>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openai-key" className="text-xs">
                  OpenManus Backend API Key
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={localSettings.openaiApiKey}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      openaiApiKey: e.target.value,
                    })
                  }
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Only needed if OpenManus uses a non-Gemini backend. With Gemini OAuth, this is not required.
                </p>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cpu className="size-4 text-violet-500" />
              Model
            </div>
            <Select
              value={localSettings.model}
              onValueChange={(value) =>
                setLocalSettings({ ...localSettings, model: value })
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              This model is used as the brain for both agents. Gemini 2.5 Pro offers the best reasoning, while Flash is faster.
            </p>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="size-4 text-emerald-500" />
              Appearance
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-xs">
                Dark Mode
              </Label>
              <Switch
                id="dark-mode"
                checked={mounted ? theme === "dark" : true}
                onCheckedChange={(checked) => {
                  setTheme(checked ? "dark" : "light");
                  setLocalSettings({
                    ...localSettings,
                    theme: checked ? "dark" : "light",
                  });
                }}
              />
            </div>
          </div>

          {/* Pro Subscription Info */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-2">
            <div className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Crown className="size-3.5" /> Gemini Pro Subscription Benefits
            </div>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><span className="text-foreground font-medium">Free tier:</span> 1,000 requests/day with any Google account</li>
              <li><span className="text-foreground font-medium">AI Pro ($20/mo):</span> 1,500 requests/day + higher AI Studio limits</li>
              <li><span className="text-foreground font-medium">AI Ultra ($250/mo):</span> 2,000 requests/day + $100/mo cloud credits</li>
            </ul>
            <p className="text-muted-foreground">
              Just sign in with the Google account tied to your Pro subscription —
              higher limits are applied automatically. This uses the same OAuth flow
              as the official Gemini CLI.
            </p>
          </div>

          {/* OAuth Setup Guide (Advanced) */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <svg className="size-3 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              Advanced: Custom OAuth Setup
            </summary>
            <div className="mt-2 rounded-lg border border-border p-3 text-xs space-y-2">
              <p className="text-muted-foreground">
                By default, AgentForge uses the Gemini CLI&apos;s built-in Google OAuth client —
                no configuration needed. If you want to use your own OAuth credentials:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-violet-500 hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select existing</li>
                <li>Enable the &quot;Generative Language API&quot;</li>
                <li>Create OAuth 2.0 Client ID (Web application)</li>
                <li>Add redirect URI: your domain + /api/auth/gemini/callback</li>
                <li>Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GEMINI_REDIRECT_URI</li>
              </ol>
            </div>
          </details>

          {/* About */}
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">AgentForge v1.1</div>
            <p>Unified AI Agent Hub — OpenManus + Gemini CLI as one</p>
            <p>Both agents use Google Gemini as their brain via OAuth or API key</p>
            <p>Built with Next.js 16, TypeScript, and shadcn/ui</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
