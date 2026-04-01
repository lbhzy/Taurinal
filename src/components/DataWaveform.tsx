import { useMemo, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, CircleDot, Circle } from "lucide-react";

interface DataWaveformProps {
  data: string;
  enabled: boolean;
  onToggle: () => void;
  onClear: () => void;
}

function extractSeries(data: string, pattern: string, groupIndex: number): { values: number[]; error: string | null } {
  try {
    const regex = new RegExp(pattern, "g");
    // Avoid infinite loop for zero-length matches.
    if (regex.test("")) {
      return { values: [], error: "Regex cannot match empty string" };
    }

    const values: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(data)) !== null) {
      const raw = groupIndex === 0
        ? match[0]
        : (match[groupIndex] ?? match[0]);
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n)) {
        values.push(n);
      }
      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }

    return { values, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid regex";
    return { values: [], error: message };
  }
}

function drawWaveform(canvas: HTMLCanvasElement, points: number[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(125, 125, 125, 0.15)";
  for (let i = 1; i <= 4; i++) {
    const y = Math.round((height / 5) * i);
    ctx.fillRect(0, y, width, 1);
  }

  if (points.length < 2) {
    return;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1e-9, max - min);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#38bdf8";
  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {
    const x = points.length === 1
      ? width / 2
      : (i / (points.length - 1)) * (width - 1);
    const y = height - ((points[i] - min) / range) * (height - 1);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

export function DataWaveform({ data, enabled, onToggle, onClear }: DataWaveformProps) {
  const [pattern, setPattern] = useState("(-?\\d+(?:\\.\\d+)?)");
  const [groupIndex, setGroupIndex] = useState("1");
  const [maxPoints, setMaxPoints] = useState("500");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 640, height: 200 });

  const parsedGroup = Math.max(0, Number.parseInt(groupIndex, 10) || 0);
  const parsedMaxPoints = Math.max(20, Number.parseInt(maxPoints, 10) || 500);

  const { values, error } = useMemo(
    () => extractSeries(data, pattern, parsedGroup),
    [data, pattern, parsedGroup]
  );

  const visibleValues = useMemo(
    () => values.slice(-parsedMaxPoints),
    [values, parsedMaxPoints]
  );

  const latest = visibleValues.length > 0 ? visibleValues[visibleValues.length - 1] : null;
  const min = visibleValues.length > 0 ? Math.min(...visibleValues) : null;
  const max = visibleValues.length > 0 ? Math.max(...visibleValues) : null;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const updateSize = () => {
      const rect = wrap.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width));
      const height = Math.max(140, Math.floor(rect.height));
      setCanvasSize({ width, height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWaveform(canvas, visibleValues);
  }, [visibleValues, canvasSize]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 py-2 border-b border-border/40 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <button
            className={
              enabled
                ? "flex items-center gap-1.5 h-5 px-2 text-[11px] rounded-md transition-all duration-150 font-medium text-green-400/90 bg-green-500/10"
                : "flex items-center gap-1.5 h-5 px-2 text-[11px] rounded-md transition-all duration-150 font-medium text-muted-foreground/50 hover:text-muted-foreground/80 hover:bg-accent/40"
            }
            onClick={onToggle}
            title={enabled ? "Stop waveform capture" : "Start waveform capture"}
          >
            {enabled ? <CircleDot className="size-3" /> : <Circle className="size-3" />}
            {enabled ? "Recording" : "Paused"}
          </button>
          <div className="text-[11px] text-muted-foreground/70">
            Regex-matched numeric waveform
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-7 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Regex</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="(-?\\d+(?:\\.\\d+)?)"
              className="h-7 text-xs font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Group</Label>
            <Input
              value={groupIndex}
              onChange={(e) => setGroupIndex(e.target.value)}
              placeholder="1"
              className="h-7 text-xs font-mono"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Points</Label>
            <Input
              value={maxPoints}
              onChange={(e) => setMaxPoints(e.target.value)}
              placeholder="500"
              className="h-7 text-xs font-mono"
            />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/70"
              onClick={onClear}
              title="Clear captured data"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 font-mono">
          <span>matches: {values.length}</span>
          <span>show: {visibleValues.length}</span>
          <span>latest: {latest ?? "-"}</span>
          <span>min: {min ?? "-"}</span>
          <span>max: {max ?? "-"}</span>
        </div>

        {error && (
          <div className="text-[11px] text-red-400">Regex error: {error}</div>
        )}
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 p-2">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-full rounded border border-border/40 bg-background/40"
        />
      </div>
    </div>
  );
}
