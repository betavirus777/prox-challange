"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  ChevronLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getConversationMetas,
  deleteConversation,
  clearAllConversations,
  type ConversationMeta,
} from "@/lib/conversation-store";

interface ConversationHistoryProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationHistory({
  activeId,
  onSelect,
  onNew,
  isOpen,
  onClose,
}: ConversationHistoryProps) {
  const [metas, setMetas] = useState<ConversationMeta[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setMetas(getConversationMetas());
  }, [activeId, isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    setMetas(getConversationMetas());
  };

  const handleClearAll = () => {
    clearAllConversations();
    setMetas([]);
    setShowClearConfirm(false);
    onNew();
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Group conversations by date
  const grouped: Record<string, ConversationMeta[]> = {};
  for (const m of metas) {
    const key = formatDate(m.updatedAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 panel-overlay md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-[var(--sidebar)] transition-transform duration-300",
          "md:relative md:z-auto md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--sidebar-border)] px-3 py-3">
          <h2 className="text-sm font-semibold text-foreground/90">History</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              title="New conversation"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {metas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground/60">
                No conversations yet
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel} className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  {dateLabel}
                </p>
                {items.map((meta) => (
                  <button
                    key={meta.id}
                    onClick={() => {
                      onSelect(meta.id);
                      onClose();
                    }}
                    className={cn(
                      "group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      activeId === meta.id
                        ? "bg-accent/10 text-accent"
                        : "text-foreground/80 hover:bg-muted/60"
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        activeId === meta.id
                          ? "text-accent"
                          : "text-muted-foreground/50"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium leading-tight">
                        {meta.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{meta.messageCount} messages</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(meta.id, e)}
                      className="mt-0.5 hidden rounded p-0.5 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive group-hover:block"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {metas.length > 0 && (
          <div className="border-t border-[var(--sidebar-border)] px-3 py-2">
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-destructive">Clear all?</span>
                <button
                  onClick={handleClearAll}
                  className="rounded px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/10"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-destructive"
              >
                <X className="h-3 w-3" />
                Clear history
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
