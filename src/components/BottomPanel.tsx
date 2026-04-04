import { useRef, useCallback, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PanelTab {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

interface BottomPanelProps {
  tabs: PanelTab[];
  height: number;
  onHeightChange: (height: number) => void;
  minHeight?: number;
  maxHeight?: number;
}

export function BottomPanel({
  tabs,
  height,
  onHeightChange,
  minHeight = 100,
  maxHeight = 500,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTab("");
      return;
    }
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      startYRef.current = e.clientY;
      startHeightRef.current = height;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const delta = startYRef.current - ev.clientY;
        const newHeight = Math.min(
          maxHeight,
          Math.max(minHeight, startHeightRef.current + delta)
        );
        onHeightChange(newHeight);
      };

      const handleMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height, minHeight, maxHeight, onHeightChange]
  );

  return (
    <div
      className="flex flex-col shrink-0 border-t border-border/50 bg-card/40"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="h-[3px] cursor-ns-resize hover:bg-blue-500/50 active:bg-blue-500/60 transition-colors"
        onMouseDown={handleMouseDown}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col min-h-0 flex-1"
      >
        {/* Tab bar */}
        <div className="flex items-center border-b border-border/40 shrink-0 h-8 select-none">
          <TabsList className="h-full bg-transparent rounded-none p-0 w-full justify-start overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-full text-[11px] rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground/90",
                  "text-muted-foreground/60 hover:text-foreground/70"
                )}
              >
                {tab.icon}
                <span className="whitespace-nowrap">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Panel content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
