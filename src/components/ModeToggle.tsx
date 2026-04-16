"use client";

import { MessageSquare, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-muted/80 p-1 ring-1 ring-border/50">
      <button
        onClick={() => onModeChange("text")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
          mode === "text"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Text
      </button>
      <button
        onClick={() => onModeChange("voice")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
          mode === "voice"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Mic className="h-3.5 w-3.5" />
        Voice
      </button>
    </div>
  );
}
