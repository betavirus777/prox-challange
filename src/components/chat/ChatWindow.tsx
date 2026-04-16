"use client";

import { useRef, useEffect, useState } from "react";
import { useAgentChat } from "@/lib/use-agent-chat";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { StarterQuestions } from "./StarterQuestions";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { CitationPanel } from "@/components/citations/CitationPanel";
import type { ParsedArtifact } from "@/lib/parse-artifacts";
import type { Citation } from "@/lib/use-agent-chat";
import type { ResolvedCitation } from "@/lib/parse-citations";
import { resolveCitation } from "@/lib/parse-citations";

export function ChatWindow() {
  const { messages, isLoading, error, sendMessage } = useAgentChat();
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
      sendMessage(input);
      setInput("");
    }
  };

  const handleStarterQuestion = (question: string) => {
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
      {/* Chat panel */}
      <div className={`flex flex-1 flex-col ${hasSidePanel ? "max-w-[60%]" : ""}`}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {!hasMessages && (
            <StarterQuestions onSelect={handleStarterQuestion} />
          )}
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onArtifactClick={(a) => {
                  setActiveCitation(null);
                  setActiveArtifact(a);
                }}
                onCitationClick={handleCitationClick}
              />
            ))}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="mx-auto max-w-3xl">
            <MessageInput
              input={input}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
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
