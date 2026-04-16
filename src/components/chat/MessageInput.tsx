"use client";

import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChangeEvent, FormEvent } from "react";

interface MessageInputProps {
  input: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
}

export function MessageInput({ input, onChange, onSubmit, isLoading }: MessageInputProps) {
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
      <textarea
        value={input}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your Vulcan OmniPro 220..."
        rows={1}
        className={cn(
          "w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 pr-12",
          "text-sm placeholder:text-muted-foreground",
          "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
          "disabled:opacity-50"
        )}
        disabled={isLoading}
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2",
          "text-muted-foreground transition-colors",
          "hover:bg-accent hover:text-white",
          "disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        )}
      >
        <SendHorizonal className="h-4 w-4" />
      </button>
    </form>
  );
}
