"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, ImageIcon, ExternalLink } from "lucide-react";
import { parseArtifacts, isArtifactPlaceholder } from "@/lib/parse-artifacts";
import type { ParsedArtifact } from "@/lib/parse-artifacts";
import type { ChatMessage, Citation } from "@/lib/use-agent-chat";
import { CitationBadge } from "@/components/citations/CitationBadge";
import { cn } from "@/lib/utils";
import { PhaseStrip, ToolPillStrip, ReviewPanel } from "./AssistantActivity";
import { useState, type ComponentPropsWithoutRef } from "react";

interface MessageBubbleProps {
  message: ChatMessage;
  onArtifactClick: (artifact: ParsedArtifact) => void;
  onCitationClick: (citation: Citation) => void;
}

export function MessageBubble({ message, onArtifactClick, onCitationClick }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex items-start gap-4 flex-row-reverse ml-auto max-w-[85%] sm:max-w-[75%] animate-fade-in pt-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-orange-600 shadow-md ring-1 ring-white/10">
          <User className="h-4 w-4 text-white" />
        </div>
        <div className="rounded-2xl rounded-tr-sm bg-accent/10 px-5 py-3.5 text-[15px] leading-relaxed text-foreground shadow-sm ring-1 ring-accent/20">
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
    <div className="flex items-start gap-4 max-w-[95%] sm:max-w-[85%] pt-4">
      <div
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/30 shadow-sm",
          isStreaming && "shadow-[0_0_15px_-3px_rgba(249,115,22,0.4)]"
        )}
      >
        <Bot className="h-4 w-4 text-accent" />
        {isStreaming && (
          <span
            className="absolute inset-0 rounded-full border border-accent/40 animate-ping opacity-30"
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3.5 pt-1">
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

/* ── Inline image lightbox ───────────────────────────────────── */

function InlineImage(props: ComponentPropsWithoutRef<"img">) {
  const [expanded, setExpanded] = useState(false);
  const { src, alt } = props;
  if (!src) return null;

  return (
    <>
      <span
        className="group relative my-2 inline-block cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Image"}
          className="max-h-[400px] max-w-full rounded-xl object-contain"
          loading="lazy"
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ImageIcon className="h-3 w-3" />
          Click to expand
        </span>
      </span>

      {/* Lightbox */}
      {expanded && (
        <span
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={() => setExpanded(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || "Image"}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl animate-scale-in"
          />
        </span>
      )}
    </>
  );
}

/* ── Inline SVG renderer ─────────────────────────────────── */

function InlineSvg({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <span
        className="group relative my-2 inline-block cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-white/95 p-3 transition-all hover:border-accent/30 hover:shadow-lg"
        onClick={() => setExpanded(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded(true)}
      >
        <span
          className="block max-h-[400px] overflow-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: code }}
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-3 w-3" />
          Click to expand
        </span>
      </span>

      {expanded && (
        <span
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={() => setExpanded(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setExpanded(false)}
        >
          <span
            className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-white p-6 shadow-2xl animate-scale-in [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: code }}
          />
        </span>
      )}
    </>
  );
}

/* ── Extract inline SVGs from text ─────────────────────────── */

interface ContentPiece {
  type: "text" | "svg" | "loading_svg";
  content: string;
}

function extractInlineSvgs(text: string): ContentPiece[] {
  const SVG_REGEX = /<svg[\s\S]*?(?:<\/svg>|$)/gi;
  const pieces: ContentPiece[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = SVG_REGEX.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) pieces.push({ type: "text", content: before });
    
    if (match[0].toLowerCase().endsWith("</svg>")) {
      pieces.push({ type: "svg", content: match[0] });
    } else {
      pieces.push({ type: "loading_svg", content: match[0] });
    }
    
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex).trim();
  if (remaining) pieces.push({ type: "text", content: remaining });

  // If we had no matches but the text looks like it might be starting an SVG...
  if (pieces.length === 0 && text.includes("<sv")) {
    // Just return as text and let markdown handle it safely as code/text until it completes.
  }

  return pieces.length > 0 ? pieces : [{ type: "text", content: text }];
}

/* ── Main markdown body ──────────────────────────────────── */

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
    <div className={cn("flex flex-col space-y-4 overflow-hidden break-words text-[15px] leading-relaxed text-foreground/90 rounded-2xl rounded-tl-sm bg-card/60 px-5 py-4 shadow-sm ring-1 ring-white/5 backdrop-blur-sm")}>
      <div className="space-y-4">
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

          // Check for inline SVGs in the text
          const pieces = extractInlineSvgs(segment);
          const hasSvgs = pieces.some((p) => p.type === "svg" || p.type === "loading_svg");

          if (hasSvgs) {
            return (
              <div key={i} className="space-y-4">
                {pieces.map((piece, j) => {
                  if (piece.type === "svg") {
                    return <InlineSvg key={j} code={piece.content} />;
                  }
                  if (piece.type === "loading_svg") {
                    return (
                      <div key={j} className="my-2 flex h-40 w-full animate-pulse items-center justify-center rounded-xl border border-border/60 bg-muted/20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <svg className="h-6 w-6 animate-spin text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm font-medium">Drawing diagram...</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={j} className="prose prose-invert max-w-full text-[15px] leading-relaxed prose-headings:scroll-mt-4 prose-p:leading-relaxed break-words overflow-hidden break-all sm:break-normal">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {piece.content}
                      </ReactMarkdown>
                    </div>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={i} className="prose prose-invert max-w-full text-[15px] leading-relaxed prose-headings:scroll-mt-4 prose-p:leading-relaxed break-words overflow-hidden break-all sm:break-normal">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {segment}
              </ReactMarkdown>
            </div>
          );
        })}

        {uniqueCitations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 mt-2">
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

/* ── Custom markdown renderers for images ─────────────────── */

const markdownComponents = {
  img: InlineImage,
};

/* ── Helpers ──────────────────────────────────────────────── */

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
