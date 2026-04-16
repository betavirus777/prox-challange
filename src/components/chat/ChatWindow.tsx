"use client";

import { track } from "@vercel/analytics";
import { useRef, useEffect, useState } from "react";
import { useAgentChat } from "@/lib/use-agent-chat";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { StarterQuestions } from "./StarterQuestions";
import { ConversationHistory } from "./ConversationHistory";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { CitationPanel } from "@/components/citations/CitationPanel";
import type { ParsedArtifact } from "@/lib/parse-artifacts";
import type { Citation } from "@/lib/use-agent-chat";
import type { ResolvedCitation } from "@/lib/parse-citations";
import { resolveCitation } from "@/lib/parse-citations";

interface ChatWindowProps {
  sidebarOpen: boolean;
  onSidebarClose: () => void;
}

export function ChatWindow({ sidebarOpen, onSidebarClose }: ChatWindowProps) {
  const {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    stop,
    retryLast,
    startNewConversation,
    loadExistingConversation,
  } = useAgentChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeArtifact, setActiveArtifact] = useState<ParsedArtifact | null>(null);
  const [activeCitation, setActiveCitation] = useState<ResolvedCitation | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      track("Asked_Question", { query: input.trim() });
      sendMessage(input);
      setInput("");
    }
  };

  const handleStarterQuestion = (question: string) => {
    track("Clicked_Starter_Question", { query: question });
    sendMessage(question);
  };

  const handleCitationClick = (citation: Citation) => {
    const resolved = resolveCitation(citation);
    setActiveCitation(resolved);
  };

  const hasMessages = messages.length > 0;
  const hasSidePanel = activeArtifact || activeCitation;

  return (
    <div className="flex h-full">
      {/* Conversation History Sidebar */}
      <ConversationHistory
        activeId={conversationId}
        onSelect={loadExistingConversation}
        onNew={startNewConversation}
        isOpen={sidebarOpen}
        onClose={onSidebarClose}
      />

      {/* Chat panel */}
      <div className={`flex flex-1 flex-col min-w-0 ${hasSidePanel ? "hidden md:flex md:max-w-[60%]" : ""}`}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-6 sm:px-4">
          {!hasMessages && (
            <StarterQuestions onSelect={handleStarterQuestion} />
          )}
          <div className="mx-auto max-w-4xl space-y-8">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index * 30, 200)}ms` }}
              >
                <MessageBubble
                  message={message}
                  onArtifactClick={(a) => {
                    setActiveCitation(null);
                    setActiveArtifact(a);
                  }}
                  onCitationClick={handleCitationClick}
                />
              </div>
            ))}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-red-400 animate-fade-in">
                <span className="flex-1">{error}</span>
                <button
                  onClick={retryLast}
                  className="shrink-0 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border/50 p-3 sm:p-4">
          <div className="mx-auto max-w-4xl">
            <MessageInput
              input={input}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onStop={stop}
            />
          </div>
        </div>
      </div>

      {/* Artifact panel */}
      {activeArtifact && (
        <ArtifactPanel
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
        />
      )}

      {/* Citation panel */}
      {activeCitation && !activeArtifact && (
        <CitationPanel
          citation={activeCitation}
          onClose={() => setActiveCitation(null)}
        />
      )}
    </div>
  );
}
