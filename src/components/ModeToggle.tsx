"use client";

import { MessageSquare, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: "text" | "voice";
  onModeChange: (mode: "text" | "voice") => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      <button
        onClick={() => onModeChange("text")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "text"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Text
      </button>
      <button
        onClick={() => onModeChange("voice")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          mode === "voice"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Mic className="h-3.5 w-3.5" />
        Voice
      </button>
    </div>
  );
}
