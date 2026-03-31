import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

export function Terminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(termRef.current);
    fitAddon.fit();
    xtermRef.current = xterm;

    let ptyId: number | null = null;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    async function init() {
      const rows = xterm.rows;
      const cols = xterm.cols;

      // Spawn a PTY on the Rust side
      ptyId = await invoke<number>("pty_spawn", { rows, cols });

      // Listen for PTY output
      unlistenOutput = await listen<string>(`pty-output-${ptyId}`, (event) => {
        xterm.write(event.payload);
      });

      // Listen for PTY exit
      unlistenExit = await listen<void>(`pty-exit-${ptyId}`, () => {
        xterm.write("\r\n[Process exited]\r\n");
      });

      // Forward user input to PTY
      xterm.onData((data) => {
        if (ptyId !== null) {
          invoke("pty_write", { id: ptyId, data });
        }
      });
    }

    init();

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (ptyId !== null) {
        invoke("pty_resize", {
          id: ptyId,
          rows: xterm.rows,
          cols: xterm.cols,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      unlistenOutput?.();
      unlistenExit?.();
      xterm.dispose();
    };
  }, []);

  return <div ref={termRef} style={{ width: "100%", height: "100%" }} />;
}
