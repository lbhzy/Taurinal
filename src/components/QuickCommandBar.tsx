import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import type { QuickCommand } from "@/lib/quick-commands";

interface QuickCommandBarProps {
  commands: QuickCommand[];
  onSend: (command: string) => void;
  onManage: () => void;
}

export function QuickCommandBar({
  commands,
  onSend,
  onManage,
}: QuickCommandBarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 shrink-0">
        <span className="text-[11px] text-muted-foreground/60">
          {commands.length} commands
        </span>
        <button
          className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground/50 hover:text-foreground/70 hover:bg-accent/40 transition-colors"
          onClick={onManage}
          title="Manage quick commands"
        >
          <Settings className="size-3" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 scrollbar-thin">
        {commands.length === 0 ? (
          <span className="text-xs text-muted-foreground/50">
            No quick commands. Click the gear icon to add some.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {commands.map((cmd) => (
              <button
                key={cmd.id}
                className="h-6 px-2.5 text-[11px] rounded-md bg-secondary/60 text-secondary-foreground/80 hover:bg-secondary hover:text-secondary-foreground transition-all duration-100 font-medium"
                onClick={() => onSend(cmd.command)}
                title={cmd.command.replace(/\n$/, "")}
              >
                {cmd.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
