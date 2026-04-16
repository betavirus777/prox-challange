"use client";

import { cn } from "@/lib/utils";
import { FileText, Play } from "lucide-react";

interface CitationBadgeProps {
  label: string;
  type: "pdf" | "video";
  colorClass: string;
  onClick?: () => void;
}

export function CitationBadge({ label, type, colorClass, onClick }: CitationBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        "transition-opacity hover:opacity-80",
        colorClass,
        "text-white"
      )}
    >
      {type === "pdf" ? (
        <FileText className="h-2.5 w-2.5" />
      ) : (
        <Play className="h-2.5 w-2.5" />
      )}
      {label}
    </button>
  );
}
