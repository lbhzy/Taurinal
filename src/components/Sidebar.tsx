import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bookmark,
  TerminalSquare,
  Globe,
  Usb,
  Plus,
  Settings,
  Trash2,
  Play,
} from "lucide-react";
import type { SavedSession } from "@/lib/saved-sessions";
import type { ConnectionConfig } from "./Terminal";

type SidebarPanel = "sessions" | null;

interface SidebarProps {
  sessions: SavedSession[];
  onOpenSession: (config: ConnectionConfig) => void;
  onManageSessions: () => void;
  onSettings: () => void;
  visible: boolean;
  panelWidth: number;
  onPanelWidthChange: (width: number) => void;
}

function getSessionIcon(type: ConnectionConfig["type"]) {
  switch (type) {
    case "pty":
      return <TerminalSquare className="size-3.5 shrink-0" />;
    case "ssh":
      return <Globe className="size-3.5 shrink-0" />;
    case "serial":
      return <Usb className="size-3.5 shrink-0" />;
  }
}

function getSessionDescription(config: ConnectionConfig): string {
  switch (config.type) {
    case "pty":
      return "Local Shell";
    case "ssh":
      return `${config.username}@${config.host}:${config.port}`;
    case "serial":
      return `${config.portName} @ ${config.baudRate}`;
  }
}

export function Sidebar({
  sessions,
  onOpenSession,
  onManageSessions,
  onSettings,
  visible,
  panelWidth,
  onPanelWidthChange,
}: SidebarProps) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>("sessions");
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = panelWidth;
    e.preventDefault();
  }, [panelWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(400, Math.max(150, startWidth.current + delta));
      onPanelWidthChange(newWidth);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onPanelWidthChange]);

  const togglePanel = (panel: SidebarPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  if (!visible) return null;

  return (
    <div className="flex h-full shrink-0">
      {/* Activity Bar */}
      <div className="flex flex-col items-center w-12 bg-card/60 border-r border-border/50 py-2 shrink-0 justify-between">
        <div className="flex flex-col items-center gap-1">
          <button
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 relative",
              activePanel === "sessions"
                ? "text-foreground"
                : "text-muted-foreground/60 hover:text-foreground/80"
            )}
            onClick={() => togglePanel("sessions")}
            title="Saved Sessions"
          >
            <Bookmark className="size-[18px]" />
            {activePanel === "sessions" && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-primary rounded-r" />
            )}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150 text-muted-foreground/60 hover:text-foreground/80"
            onClick={onSettings}
            title="Settings"
          >
            <Settings className="size-[18px]" />
          </button>
        </div>
      </div>

      {/* Panel content */}
      {activePanel && (
        <div
          className="bg-card/40 border-r border-border/50 flex flex-col shrink-0 relative"
          style={{ width: panelWidth }}
        >          {activePanel === "sessions" && (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 h-9 border-b border-border/50 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Sessions
                </span>
                <button
                  className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/50 hover:text-foreground/80 hover:bg-accent/40 transition-colors"
                  onClick={onManageSessions}
                  title="Manage sessions"
                >
                  <Settings className="size-3.5" />
                </button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {sessions.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground/60 text-center leading-relaxed">
                    No saved sessions.
                    <br />
                    Click the gear icon to add one.
                  </div>
                ) : (
                  <div className="py-0.5">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/40 transition-all duration-100 group"
                        onClick={() => onOpenSession(session.config)}
                        title={`Connect: ${session.name}`}
                      >
                        <span className="text-muted-foreground/60 group-hover:text-primary/80 transition-colors">
                          {getSessionIcon(session.config.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] truncate text-foreground/85 group-hover:text-foreground transition-colors">{session.name}</div>
                          <div className="text-[11px] text-muted-foreground/50 truncate">
                            {getSessionDescription(session.config)}
                          </div>
                        </div>
                        <Play className="size-3 text-primary/0 group-hover:text-primary/60 shrink-0 transition-all duration-150" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500/50 transition-colors z-10"
            onMouseDown={onMouseDown}
          />
        </div>
      )}
    </div>
  );
}
