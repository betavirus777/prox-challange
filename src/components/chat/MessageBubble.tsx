"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot } from "lucide-react";
import { parseArtifacts, isArtifactPlaceholder } from "@/lib/parse-artifacts";
import type { ParsedArtifact } from "@/lib/parse-artifacts";
import type { ChatMessage, Citation } from "@/lib/use-agent-chat";
import { CitationBadge } from "@/components/citations/CitationBadge";
import { cn } from "@/lib/utils";
import { PhaseStrip, ToolPillStrip, ReviewPanel } from "./AssistantActivity";

interface MessageBubbleProps {
  message: ChatMessage;
  onArtifactClick: (artifact: ParsedArtifact) => void;
  onCitationClick: (citation: Citation) => void;
}

export function MessageBubble({ message, onArtifactClick, onCitationClick }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-1.5 max-w-[min(100%,42rem)] rounded-2xl rounded-tl-md border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const showAssistantShell =
    Boolean(message.content) ||
    Boolean(message.statusLine) ||
    message.toolCalls.length > 0 ||
    Boolean(message.review);

  if (!showAssistantShell) return null;

  const isStreaming = Boolean(message.statusLine) || message.toolCalls.some((t) => t.state === "calling");

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          "bg-gradient-to-br from-accent/25 to-accent/5 ring-2 ring-accent/25",
          isStreaming && "shadow-[0_0_20px_-4px_rgba(249,115,22,0.45)]"
        )}
      >
        <Bot className="h-4 w-4 text-accent" />
        {isStreaming && (
          <span
            className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-40"
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <PhaseStrip statusLine={message.statusLine} phaseId={message.phaseId} />
        <ToolPillStrip toolCalls={message.toolCalls} />

        {message.content ? (
          <AssistantMarkdownBody
            content={message.content}
            citations={message.citations}
            onArtifactClick={onArtifactClick}
            onCitationClick={onCitationClick}
          />
        ) : null}

        {message.review?.verdict ? (
          <ReviewPanel verdict={message.review.verdict} warnings={message.review.warnings ?? []} />
        ) : null}
      </div>
    </div>
  );
}

function AssistantMarkdownBody({
  content,
  citations,
  onArtifactClick,
  onCitationClick,
}: {
  content: string;
  citations: Citation[];
  onArtifactClick: (artifact: ParsedArtifact) => void;
  onCitationClick: (citation: Citation) => void;
}) {
  const { textSegments, artifacts } = parseArtifacts(content);
  const uniqueCitations = deduplicateCitations(citations);

  return (
    <div
      className={cn(
        "rounded-2xl rounded-tl-md border border-border/90 bg-card/40 px-4 py-3 shadow-sm",
        "ring-1 ring-white/[0.03] backdrop-blur-sm"
      )}
    >
      <div className="space-y-3">
        {textSegments.map((segment, i) => {
          const artifactIndex = isArtifactPlaceholder(segment);
          if (artifactIndex !== null && artifacts[artifactIndex]) {
            const artifact = artifacts[artifactIndex];
            return (
              <button
                key={i}
                onClick={() => onArtifactClick(artifact)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 p-3",
                  "text-left transition-all hover:border-accent/40 hover:bg-muted/35"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-sm font-bold text-accent">
                  {getArtifactIcon(artifact.type)}
                </div>
                <div>
                  <p className="text-sm font-medium">{artifact.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Open {getArtifactTypeLabel(artifact.type)}
                  </p>
                </div>
              </button>
            );
          }

          return (
            <div key={i} className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed prose-headings:scroll-mt-4 prose-p:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{segment}</ReactMarkdown>
            </div>
          );
        })}

        {uniqueCitations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {uniqueCitations.map((c, i) => (
              <CitationBadge
                key={i}
                label={getCitationLabel(c)}
                type={c.type === "page_location" ? "pdf" : c.type === "content_block_location" ? "video" : "pdf"}
                colorClass={getCitationColor(c)}
                onClick={() => onCitationClick(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function deduplicateCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.document_title}-${c.start_page_number || c.start_block_index || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getCitationLabel(c: Citation): string {
  const title = shortenTitle(c.document_title || "Source");
  if (c.type === "page_location" && c.start_page_number) {
    return `${title} p.${c.start_page_number}`;
  }
  if (c.type === "content_block_location" && c.start_block_index !== undefined) {
    const seconds = c.start_block_index * 30;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Video ${m}:${s.toString().padStart(2, "0")}`;
  }
  return title;
}

function getCitationColor(c: Citation): string {
  const title = c.document_title || "";
  if (title.includes("Manual")) return "citation-manual";
  if (title.includes("Quick")) return "citation-quickstart";
  if (title.includes("Chart") || title.includes("Selection")) return "citation-chart";
  if (title.includes("Video")) return "citation-video";
  return "citation-manual";
}

function shortenTitle(title: string): string {
  if (title.includes("Manual")) return "Manual";
  if (title.includes("Quick")) return "Quick Start";
  if (title.includes("Chart") || title.includes("Selection")) return "Chart";
  if (title.includes("Video")) return "Video";
  return title;
}

function getArtifactIcon(type: string): string {
  if (type.includes("react")) return "⚛";
  if (type.includes("svg")) return "◇";
  if (type.includes("mermaid")) return "◈";
  if (type.includes("html")) return "◻";
  return "◆";
}

function getArtifactTypeLabel(type: string): string {
  if (type.includes("react")) return "interactive component";
  if (type.includes("svg")) return "diagram";
  if (type.includes("mermaid")) return "flowchart";
  if (type.includes("html")) return "interactive page";
  return "artifact";
}
