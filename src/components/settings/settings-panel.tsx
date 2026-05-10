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
import { Key, Cpu, Info, Settings, ExternalLink, Eye, EyeOff, Check, X } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { toast } from "sonner";

const MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Default)" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
];

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings, geminiApiKey, setGeminiApiKey, isGeminiConnected, setIsGeminiConnected } =
    useAppStore();
  const { theme, setTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState(settings);
  const [localApiKey, setLocalApiKey] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleSave = async () => {
    updateSettings(localSettings);

    // Update API key if changed
    if (localApiKey !== geminiApiKey) {
      setGeminiApiKey(localApiKey);
      setIsGeminiConnected(!!localApiKey);
    }

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
      setLocalApiKey(geminiApiKey);
    }
  };

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
          {/* Gemini API Key */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Key className="size-4 text-emerald-500" />
              Gemini API Key
            </div>
            <div className="rounded-lg border border-border p-3 space-y-3">
              {isGeminiConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {geminiApiKey.slice(0, 8)}...{geminiApiKey.slice(-4)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Both OpenManus and Gemini CLI use this API key to access Gemini.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                    onClick={() => {
                      setLocalApiKey("");
                      setGeminiApiKey("");
                      setIsGeminiConnected(false);
                    }}
                  >
                    <X className="size-3" />
                    Remove API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Enter your Gemini API key to power both agents. Get a free key at Google AI Studio.
                  </p>
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={localApiKey}
                      onChange={(e) => setLocalApiKey(e.target.value)}
                      className="text-sm pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-violet-500 hover:underline"
                  >
                    Get free API key from Google AI Studio <ExternalLink className="size-2.5" />
                  </a>
                </div>
              )}
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
              Gemini 2.5 Pro offers the best reasoning. Flash is faster and cheaper. Model selection is saved locally.
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

          {/* Info */}
          <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-medium text-foreground">AgentForge v2.0</div>
            <p>Unified AI Agent Hub — OpenManus + Gemini CLI as one</p>
            <p>Powered by the Gemini API directly</p>
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
