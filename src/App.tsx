import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Terminal, type ConnectionConfig, type TerminalHandle } from "./components/Terminal";
import { ConnectDialog } from "./components/ConnectDialog";
import { QuickCommandBar } from "./components/QuickCommandBar";
import { QuickCommandManager } from "./components/QuickCommandManager";
import { BottomPanel, type PanelTab } from "./components/BottomPanel";
import { HexView } from "./components/HexView";
import { Sidebar } from "./components/Sidebar";
import { SessionManager } from "./components/SessionManager";
import { SettingsDialog } from "./components/SettingsDialog";
import { loadQuickCommands, saveQuickCommands, type QuickCommand } from "@/lib/quick-commands";
import { loadSavedSessions, saveSessions, type SavedSession } from "@/lib/saved-sessions";
import { loadTerminalSettings, saveTerminalSettings, type TerminalSettings } from "@/lib/terminal-settings";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import {
  Plus, X, TerminalSquare, Globe, Usb, Zap, Binary,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TabInfo {
  id: number;
  label: string;
  config: ConnectionConfig;
}

function getTabLabel(config: ConnectionConfig): string {
  switch (config.type) {
    case "pty":
      return config.command ? config.command.split(/\s/)[0].split("/").pop()! : "Local Shell";
    case "ssh":
      return `${config.username}@${config.host}`;
    case "serial":
      return config.portName;
  }
}

function getTabIcon(type: ConnectionConfig["type"]) {
  switch (type) {
    case "pty":
      return <TerminalSquare className="size-3.5" />;
    case "ssh":
      return <Globe className="size-3.5" />;
    case "serial":
      return <Usb className="size-3.5" />;
  }
}

// VS Code-style layout icons
function SidebarIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="2.5" width="4" height="11" rx="0" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function PanelIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="13" height="11" rx="0.5" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="9.5" width="13" height="4" rx="0" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function App() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState(-1);
  const [nextId, setNextId] = useState(1);
  const [showDialog, setShowDialog] = useState(false);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);
  const [showCommandManager, setShowCommandManager] = useState(false);
  const terminalRefs = useRef<Map<number, TerminalHandle>>(new Map());
  const [hexDataMap, setHexDataMap] = useState<Map<number, string>>(new Map());
  const [hexEnabled, setHexEnabled] = useState(false);
  const hexEnabledRef = useRef(hexEnabled);
  hexEnabledRef.current = hexEnabled;

  // Saved sessions
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessionManager, setShowSessionManager] = useState(false);

  // Layout visibility
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);

  // Terminal size tracking
  const [terminalSize, setTerminalSize] = useState<{ rows: number; cols: number } | null>(null);

  // Terminal settings
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettings>({
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    cursorBlink: true,
    cursorStyle: "block",
    themeName: "Dark (Default)",
    appTheme: "dark-blue",
  });
  const [showSettings, setShowSettings] = useState(false);

  // Apply app theme to root element
  useEffect(() => {
    document.documentElement.setAttribute("data-app-theme", terminalSettings.appTheme);
  }, [terminalSettings.appTheme]);

  // Load configs from Tauri on mount
  useEffect(() => {
    loadQuickCommands().then(setQuickCommands);
    loadSavedSessions().then(setSavedSessions);
    loadTerminalSettings().then(setTerminalSettings);
    invoke<Record<string, unknown> | null>("config_read", { key: "layout" }).then((data) => {
      if (!data) return;
      if (typeof data.showSidebar === "boolean") setShowSidebar(data.showSidebar);
      if (typeof data.showBottomPanel === "boolean") setShowBottomPanel(data.showBottomPanel);
      if (typeof data.sidebarWidth === "number") setSidebarWidth(data.sidebarWidth);
      if (typeof data.bottomPanelHeight === "number") setBottomPanelHeight(data.bottomPanelHeight);
    }).catch(() => {});
  }, []);

  // Save layout on change
  const layoutRef = useRef({ showSidebar, showBottomPanel, sidebarWidth, bottomPanelHeight });
  layoutRef.current = { showSidebar, showBottomPanel, sidebarWidth, bottomPanelHeight };
  const saveLayoutTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveLayout = useCallback(() => {
    clearTimeout(saveLayoutTimer.current);
    saveLayoutTimer.current = setTimeout(() => {
      invoke("config_write", { key: "layout", value: layoutRef.current });
    }, 300);
  }, []);
  useEffect(saveLayout, [showSidebar, showBottomPanel, sidebarWidth, bottomPanelHeight, saveLayout]);

  const MAX_HEX_SIZE = 64 * 1024; // Keep last 64KB per tab

  const addTab = useCallback(
    (config: ConnectionConfig) => {
      const id = nextId;
      setNextId((n) => n + 1);
      setTabs((prev) => [...prev, { id, label: getTabLabel(config), config }]);
      setActiveTab(id);
      setShowDialog(false);
    },
    [nextId]
  );

  const closeTab = useCallback(
    (id: number) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTab === id) {
          if (filtered.length > 0) {
            setActiveTab(filtered[filtered.length - 1].id);
          } else {
            setActiveTab(-1);
          }
        }
        return filtered;
      });
    },
    [activeTab]
  );

  const sendQuickCommand = useCallback(
    (command: string) => {
      const handle = terminalRefs.current.get(activeTab);
      if (handle) handle.sendCommand(command);
    },
    [activeTab]
  );

  const handleSaveCommands = useCallback((cmds: QuickCommand[]) => {
    setQuickCommands(cmds);
    saveQuickCommands(cmds);
    setShowCommandManager(false);
  }, []);

  const handleSaveSessions = useCallback((sessions: SavedSession[]) => {
    setSavedSessions(sessions);
    saveSessions(sessions);
    setShowSessionManager(false);
  }, []);

  const handleSaveSettings = useCallback((s: TerminalSettings) => {
    setTerminalSettings(s);
    saveTerminalSettings(s);
    setShowSettings(false);
  }, []);

  const setTerminalRef = useCallback(
    (tabId: number) => (handle: TerminalHandle | null) => {
      if (handle) {
        terminalRefs.current.set(tabId, handle);
      } else {
        terminalRefs.current.delete(tabId);
      }
    },
    []
  );

  const onTerminalOutput = useCallback(
    (tabId: number) => (data: string) => {
      if (!hexEnabledRef.current) return;
      setHexDataMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(tabId) ?? "";
        let updated = existing + data;
        if (updated.length > MAX_HEX_SIZE) {
          updated = updated.slice(updated.length - MAX_HEX_SIZE);
        }
        next.set(tabId, updated);
        return next;
      });
    },
    [MAX_HEX_SIZE]
  );

  const onTerminalResize = useCallback(
    (tabId: number) => (rows: number, cols: number) => {
      if (tabId === activeTab) {
        setTerminalSize({ rows, cols });
      }
    },
    [activeTab]
  );

  const activeTabInfo = tabs.find((t) => t.id === activeTab);

  const clearHexData = useCallback(() => {
    setHexDataMap((prev) => {
      const next = new Map(prev);
      next.set(activeTab, "");
      return next;
    });
  }, [activeTab]);

  const currentHexData = hexDataMap.get(activeTab) ?? "";

  const bottomTabs: PanelTab[] = useMemo(
    () => [
      {
        id: "quick-commands",
        label: "Quick Commands",
        icon: <Zap className="size-3" />,
        content: (
          <QuickCommandBar
            commands={quickCommands}
            onSend={sendQuickCommand}
            onManage={() => setShowCommandManager(true)}
          />
        ),
      },
      {
        id: "hex-view",
        label: "Hex",
        icon: <Binary className="size-3" />,
        content: (
          <HexView
            data={currentHexData}
            enabled={hexEnabled}
            onToggle={() => setHexEnabled((v) => !v)}
            onClear={clearHexData}
          />
        ),
      },
    ],
    [quickCommands, sendQuickCommand, currentHexData, clearHexData, hexEnabled]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Title Bar */}
      <div
        data-tauri-drag-region
        className="titlebar flex items-center h-11 bg-card/80 backdrop-blur-sm border-b border-border/60 shrink-0 select-none"
      >
        {/* Left spacer for macOS traffic lights */}
        <div className="w-[78px] shrink-0" data-tauri-drag-region />

        {/* Title / drag area */}
        <div className="flex-1 text-xs text-muted-foreground/70 font-medium tracking-wide" data-tauri-drag-region>
          Xterm App
        </div>

        {/* Layout toggle buttons */}
        <div className="flex items-center gap-1 px-2 shrink-0 titlebar-buttons">
          <button
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150",
              showSidebar
                ? "text-foreground/90 bg-accent/60"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            <SidebarIcon active={showSidebar} />
          </button>
          <button
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md transition-all duration-150",
              showBottomPanel
                ? "text-foreground/90 bg-accent/60"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
            onClick={() => setShowBottomPanel((v) => !v)}
            title={showBottomPanel ? "Hide bottom panel" : "Show bottom panel"}
          >
            <PanelIcon active={showBottomPanel} />
          </button>
        </div>
      </div>

      {/* Main Area: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          sessions={savedSessions}
          onOpenSession={addTab}
          onManageSessions={() => setShowSessionManager(true)}
          onSettings={() => setShowSettings(true)}
          visible={showSidebar}
          panelWidth={sidebarWidth}
          onPanelWidthChange={setSidebarWidth}
        />

        {/* Content: Tab Bar + Terminal + Bottom Panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab Bar */}
          <div className="flex items-center bg-card/50 border-b border-border/50 h-9 shrink-0 overflow-x-auto scrollbar-thin">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-border/30 text-xs select-none transition-all duration-150",
                  activeTab === tab.id
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground/80"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={cn("transition-colors", activeTab === tab.id ? "text-primary" : "")}>
                  {getTabIcon(tab.config.type)}
                </span>
                <span className="max-w-[140px] truncate">{tab.label}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:bg-muted/80 rounded p-0.5 transition-all duration-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <button
              className="flex items-center justify-center h-full w-9 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
              onClick={() => setShowDialog(true)}
              title="New Connection"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Terminal Area */}
          <div className="flex-1 relative min-h-0">
            {tabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/40 text-muted-foreground/60">
                  <TerminalSquare className="size-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/70">No active sessions</p>
                  <p className="text-xs text-muted-foreground/70">Create a new connection to get started</p>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors text-sm font-medium"
                  onClick={() => setShowDialog(true)}
                >
                  <Plus className="size-4" />
                  New Connection
                </button>
              </div>
            ) : (
              tabs.map((tab) => (
                <Terminal
                  key={tab.id}
                  ref={setTerminalRef(tab.id)}
                  config={tab.config}
                  settings={terminalSettings}
                  active={activeTab === tab.id}
                  onOutput={onTerminalOutput(tab.id)}
                  onResize={onTerminalResize(tab.id)}
                />
              ))
            )}
          </div>

          {/* Bottom Panel */}
          {showBottomPanel && <BottomPanel tabs={bottomTabs} height={bottomPanelHeight} onHeightChange={setBottomPanelHeight} />}
        </div>
      </div>

      {/* Connection Dialog */}
      <ConnectDialog
        open={showDialog}
        onConnect={addTab}
        onCancel={() => setShowDialog(false)}
      />

      {/* Quick Command Manager */}
      <QuickCommandManager
        open={showCommandManager}
        commands={quickCommands}
        onSave={handleSaveCommands}
        onCancel={() => setShowCommandManager(false)}
      />

      {/* Session Manager */}
      <SessionManager
        open={showSessionManager}
        sessions={savedSessions}
        onSave={handleSaveSessions}
        onCancel={() => setShowSessionManager(false)}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        settings={terminalSettings}
        onSave={handleSaveSettings}
        onCancel={() => setShowSettings(false)}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between h-6 px-3 bg-primary/10 border-t border-primary/20 shrink-0 text-[11px] text-muted-foreground select-none">
        <div className="flex items-center gap-3">
          {activeTabInfo && (
            <>
              <span className="flex items-center gap-1.5 text-foreground/80">
                {getTabIcon(activeTabInfo.config.type)}
                {activeTabInfo.label}
              </span>
              {activeTabInfo.config.type === "ssh" && (
                <span className="text-muted-foreground/70">{activeTabInfo.config.host}:{activeTabInfo.config.port}</span>
              )}
              {activeTabInfo.config.type === "serial" && (
                <span className="text-muted-foreground/70">{activeTabInfo.config.portName} @ {activeTabInfo.config.baudRate}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hexEnabled && (
            <span className="flex items-center gap-1 text-green-400/90">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              REC
            </span>
          )}
          {tabs.length > 0 && terminalSize && (
            <span className="font-mono text-muted-foreground/70">
              {terminalSize.cols}×{terminalSize.rows}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
