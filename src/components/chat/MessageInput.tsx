"use client";

import { SendHorizonal, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangeEvent, FormEvent } from "react";
import { useRef, useEffect } from "react";

interface MessageInputProps {
  input: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
  onStop?: () => void;
}

export function MessageInput({ input, onChange, onSubmit, isLoading, onStop }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSubmit(e as unknown as FormEvent);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-muted/50 transition-all duration-200",
          "focus-within:border-accent/50 focus-within:bg-muted/80 focus-within:shadow-lg focus-within:shadow-accent/5",
          isLoading ? "border-accent/20" : "border-border/60"
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent px-4 py-3 text-sm",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none",
            "disabled:opacity-50",
            "min-h-[44px] max-h-[200px]"
          )}
          disabled={isLoading}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className={cn(
              "mb-1.5 mr-1.5 flex h-9 w-9 items-center justify-center rounded-xl",
              "bg-destructive/10 text-destructive transition-all duration-200",
              "hover:bg-destructive/20 hover:shadow-lg hover:shadow-destructive/10"
            )}
            title="Stop generating"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "mb-1.5 mr-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
              input.trim()
                ? "bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/40"
                : "text-muted-foreground/30"
            )}
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading && (
        <div className="mt-2 flex items-center justify-center">
          <div className="shimmer h-0.5 w-32 rounded-full" />
        </div>
      )}
    </form>
  );
}
