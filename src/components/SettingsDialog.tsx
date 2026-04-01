import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FolderOpen } from "lucide-react";
import {
  type TerminalSettings,
  type TerminalTheme,
  BUILTIN_THEMES,
  APP_THEMES,
  getTheme,
} from "@/lib/terminal-settings";

interface SettingsDialogProps {
  open: boolean;
  settings: TerminalSettings;
  onSave: (settings: TerminalSettings) => void;
  onCancel: () => void;
}

const ALL_MONO_FONTS = [
  "Menlo",
  "Monaco",
  "Courier New",
  "Fira Code",
  "JetBrains Mono",
  "Source Code Pro",
  "Cascadia Code",
  "Cascadia Mono",
  "IBM Plex Mono",
  "SF Mono",
  "Consolas",
  "Inconsolata",
  "Hack",
  "Ubuntu Mono",
  "Roboto Mono",
  "Anonymous Pro",
  "DejaVu Sans Mono",
  "Droid Sans Mono",
  "Liberation Mono",
  "Noto Sans Mono",
];

function detectAvailableFonts(candidates: string[]): string[] {
  const testStr = "mmmmmmmmmmlli1|W@#";
  const size = "72px";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return candidates;

  // Measure with two different fallback baselines
  ctx.font = `${size} monospace`;
  const monoWidth = ctx.measureText(testStr).width;
  ctx.font = `${size} sans-serif`;
  const sansWidth = ctx.measureText(testStr).width;
  ctx.font = `${size} serif`;
  const serifWidth = ctx.measureText(testStr).width;

  return candidates.filter((font) => {
    // Test against all three baselines — if width differs from ANY, font exists
    ctx.font = `${size} "${font}", monospace`;
    const w1 = ctx.measureText(testStr).width;
    ctx.font = `${size} "${font}", sans-serif`;
    const w2 = ctx.measureText(testStr).width;
    ctx.font = `${size} "${font}", serif`;
    const w3 = ctx.measureText(testStr).width;
    return w1 !== monoWidth || w2 !== sansWidth || w3 !== serifWidth;
  });
}

function toFontFamily(name: string): string {
  return `"${name}", monospace`;
}

function isLightTheme(theme: TerminalTheme): boolean {
  // Parse hex to luminance — light backgrounds have high luminance
  const hex = theme.background.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 128;
}

const darkThemes = Object.keys(BUILTIN_THEMES).filter((n) => !isLightTheme(BUILTIN_THEMES[n]));
const lightThemes = Object.keys(BUILTIN_THEMES).filter((n) => isLightTheme(BUILTIN_THEMES[n]));

export function SettingsDialog({
  open,
  settings: initial,
  onSave,
  onCancel,
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<TerminalSettings>(initial);
  const [availableFonts, setAvailableFonts] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSettings(initial);
      setAvailableFonts(detectAvailableFonts(ALL_MONO_FONTS));
    }
  }, [open]);

  const theme = getTheme(settings);

  const update = (patch: Partial<TerminalSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Terminal Settings</DialogTitle>
          <DialogDescription>
            Configure terminal appearance and behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* App Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">App Theme</Label>
            <Select
              value={settings.appTheme}
              onChange={(e) => update({ appTheme: e.target.value })}
            >
              <optgroup label="Dark">
                {APP_THEMES.filter((t) => t.dark).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
              <optgroup label="Light">
                {APP_THEMES.filter((t) => !t.dark).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            </Select>
          </div>

          {/* Terminal Theme */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Terminal Color Theme</Label>
            <Select
              value={settings.themeName}
              onChange={(e) => update({ themeName: e.target.value })}
            >
              <optgroup label="Dark">
                {darkThemes.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
              <optgroup label="Light">
                {lightThemes.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
            </Select>
            {/* Theme preview */}
            <div
              className="rounded-md border border-border p-3 font-mono text-xs leading-relaxed"
              style={{ background: theme.background, color: theme.foreground }}
            >
              <div>
                <span style={{ color: theme.green }}>user@host</span>
                <span style={{ color: theme.foreground }}>:</span>
                <span style={{ color: theme.blue }}>~/project</span>
                <span style={{ color: theme.foreground }}>$ </span>
                <span style={{ color: theme.yellow }}>echo</span>
                <span style={{ color: theme.foreground }}> </span>
                <span style={{ color: theme.red }}>"Hello World"</span>
              </div>
              <div style={{ color: theme.foreground }}>Hello World</div>
              <div>
                <span style={{ color: theme.cyan }}>➜</span>
                <span style={{ color: theme.magenta }}> npm </span>
                <span style={{ color: theme.foreground }}>run build</span>
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Family</Label>
              <Select
                value={settings.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
              >
                {availableFonts.map((font) => (
                  <option key={font} value={toFontFamily(font)}>
                    {font}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Size</Label>
              <Input
                type="number"
                min={8}
                max={32}
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                className="h-9"
              />
            </div>
          </div>

          {/* Cursor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Style</Label>
              <Select
                value={settings.cursorStyle}
                onChange={(e) =>
                  update({
                    cursorStyle: e.target.value as "block" | "underline" | "bar",
                  })
                }
              >
                <option value="block">Block</option>
                <option value="underline">Underline</option>
                <option value="bar">Bar</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cursor Blink</Label>
              <Select
                value={settings.cursorBlink ? "on" : "off"}
                onChange={(e) =>
                  update({ cursorBlink: e.target.value === "on" })
                }
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto text-muted-foreground"
            onClick={() => invoke("config_open_folder")}
          >
            <FolderOpen className="size-4 mr-1.5" />
            Open Config Folder
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(settings)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
