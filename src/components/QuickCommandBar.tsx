import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground/50 hover:text-foreground/70 hover:bg-accent/40"
          onClick={onManage}
          title="Manage quick commands"
        >
          <Settings className="size-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
        {commands.length === 0 ? (
          <span className="text-xs text-muted-foreground/50">
            No quick commands. Click the gear icon to add some.
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {commands.map((cmd) => (
              <Button
                key={cmd.id}
                variant="secondary"
                size="sm"
                className="h-6 px-2.5 text-[11px] bg-secondary/60 text-secondary-foreground/80 hover:bg-secondary hover:text-secondary-foreground font-medium"
                onClick={() => onSend(cmd.command)}
                title={cmd.command.replace(/\n$/, "")}
              >
                {cmd.label}
              </Button>
            ))}
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}
