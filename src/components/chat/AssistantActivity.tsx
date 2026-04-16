"use client";

import { useState } from "react";
import {
  Search,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Wrench,
  Loader2,
} from "lucide-react";
import type { ToolCall } from "@/lib/use-agent-chat";
import { cn } from "@/lib/utils";

function PhaseIcon({ phaseId }: { phaseId?: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (phaseId) {
    case "retrieving":
      return <Search className={cn(cls, "text-sky-400")} aria-hidden />;
    case "thinking":
      return <Sparkles className={cn(cls, "text-violet-400")} aria-hidden />;
    case "reviewing":
      return <ShieldCheck className={cn(cls, "text-emerald-400")} aria-hidden />;
    case "revising":
      return <RefreshCw className={cn(cls, "text-amber-400")} aria-hidden />;
    default:
      return <Loader2 className={cn(cls, "animate-spin text-accent")} aria-hidden />;
  }
}

export function PhaseStrip({
  statusLine,
  phaseId,
}: {
  statusLine?: string;
  phaseId?: string;
}) {
  if (!statusLine?.trim()) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border border-border/80 bg-gradient-to-r from-card to-muted/40",
        "px-3 py-2 text-xs font-medium text-foreground/90 shadow-sm",
        "ring-1 ring-white/[0.04]"
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/80 shadow-inner">
        <PhaseIcon phaseId={phaseId} />
      </span>
      <span className="tracking-wide">{statusLine}</span>
    </div>
  );
}

const TOOL_LABELS: Record<string, string> = {
  search_manual: "Manual search",
  lookup_duty_cycle: "Duty cycle",
  lookup_specs: "Specifications",
  get_manual_image: "Diagrams",
  troubleshoot: "Troubleshooting",
};

export function ToolPillStrip({ toolCalls }: { toolCalls: ToolCall[] }) {
  if (toolCalls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {toolCalls.map((tc) => (
        <div
          key={tc.id}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-300",
            tc.state === "done"
              ? "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200/90"
              : "border-border bg-muted/40 text-muted-foreground"
          )}
        >
          {tc.state === "calling" ? (
            <Loader2 className="h-3 w-3 animate-spin text-accent" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
          <Wrench className="h-3 w-3 opacity-60" />
          <span>{TOOL_LABELS[tc.name] ?? tc.name}</span>
        </div>
      ))}
    </div>
  );
}

export function ReviewPanel({
  verdict,
  warnings,
}: {
  verdict: string;
  warnings: string[];
}) {
  const [open, setOpen] = useState(false);
  const hasNotes = warnings.length > 0;
  const cleanPass = verdict === "pass" && !hasNotes;
  const noted = hasNotes || verdict === "pass_with_warnings";

  const header = (
    <>
      {cleanPass ? (
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : noted ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
      ) : (
        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground/95">
          {cleanPass && "Review passed"}
          {noted && !cleanPass && (hasNotes ? "Review passed — expand for notes" : "Review: notes")}
          {!cleanPass && !noted && `Review: ${verdict}`}
        </p>
        {hasNotes && (
          <p className="text-[11px] text-muted-foreground">
            {warnings.length} note{warnings.length === 1 ? "" : "s"}
            <ChevronDown
              className={cn(
                "ml-1 inline h-3.5 w-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
          </p>
        )}
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border text-left shadow-sm",
        cleanPass && "border-emerald-500/30 bg-emerald-500/[0.06]",
        noted && !cleanPass && "border-amber-500/35 bg-amber-500/[0.06]",
        !cleanPass && !noted && "border-border bg-muted/30"
      )}
    >
      {cleanPass ? (
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs">{header}</div>
      ) : (
        <button
          type="button"
          onClick={() => hasNotes && setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs",
            hasNotes && "cursor-pointer hover:bg-white/[0.03]"
          )}
        >
          {header}
        </button>
      )}
      {warnings.length > 0 && open && (
        <ul className="space-y-2 border-t border-border/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
