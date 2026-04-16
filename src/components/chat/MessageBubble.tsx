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
import DOMPurify from "dompurify";

/* ── Types ───────────────────────────────────────────────────── */

interface MessageBubbleProps {
  message: ChatMessage;
  onArtifactClick: (artifact: ParsedArtifact) => void;
  onCitationClick: (citation: Citation) => void;
}

interface ContentPiece {
  type: "text" | "svg" | "loading_svg";
  content: string;
}

/* ── Artifact config (replaces fragile string.includes checks) ─ */

const ARTIFACT_CONFIG: Record<string, { icon: string; label: string }> = {
  "application/vnd.ant.react": { icon: "⚛", label: "interactive component" },
  "image/svg+xml": { icon: "◇", label: "diagram" },
  "application/vnd.ant.mermaid": { icon: "◈", label: "flowchart" },
  "text/html": { icon: "◻", label: "interactive page" },
};

const DEFAULT_ARTIFACT = { icon: "◆", label: "artifact" };

function getArtifactMeta(type: string): { icon: string; label: string } {
  // Exact match first
  if (ARTIFACT_CONFIG[type]) return ARTIFACT_CONFIG[type];
  // Substring fallback for broader type families
  const key = Object.keys(ARTIFACT_CONFIG).find((k) => type.includes(k.split("/")[1] ?? ""));
  return key ? ARTIFACT_CONFIG[key] : DEFAULT_ARTIFACT;
}

/* ── SVG sanitizer ───────────────────────────────────────────── */

function sanitizeSvg(raw: string): string {
  if (typeof window === "undefined") return raw; // SSR guard
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "use"],
    FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover"],
  });
}

/* ── Extract inline SVGs from a text string ─────────────────── */

function extractInlineSvgs(text: string): ContentPiece[] {
  const pieces: ContentPiece[] = [];
  const remaining = text;
  let searchFrom = 0;

  while (searchFrom < remaining.length) {
    const openIdx = remaining.toLowerCase().indexOf("<svg", searchFrom);
    if (openIdx === -1) break;

    const before = remaining.slice(searchFrom, openIdx).trim();
    if (before) pieces.push({ type: "text", content: before });

    const closeTag = "</svg>";
    const closeIdx = remaining.toLowerCase().indexOf(closeTag, openIdx);

    if (closeIdx === -1) {
      // SVG is still streaming — treat as loading
      pieces.push({ type: "loading_svg", content: remaining.slice(openIdx) });
      searchFrom = remaining.length;
    } else {
      const end = closeIdx + closeTag.length;
      pieces.push({ type: "svg", content: remaining.slice(openIdx, end) });
      searchFrom = end;
    }
  }

  const tail = remaining.slice(searchFrom).trim();
  if (tail) pieces.push({ type: "text", content: tail });

  return pieces.length > 0 ? pieces : [{ type: "text", content: text }];
}

/* ── Citation helpers ────────────────────────────────────────── */

function deduplicateCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    // Include type in key so PDF-p0 and Video-b0 from same doc don't collide
    const key = `${c.type}::${c.document_title}::${
      c.start_page_number ?? c.start_block_index ?? 0
    }`;
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
  const title = c.document_title ?? "";
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
  return title.length > 20 ? title.slice(0, 18) + "…" : title;
}

/* ── Inline image with lightbox ──────────────────────────────── */

function InlineImage(props: ComponentPropsWithoutRef<"img">) {
  const [expanded, setExpanded] = useState(false);
  const { src, alt } = props;
  if (!src) return null;

  const open = () => setExpanded(true);
  const close = () => setExpanded(false);

  return (
    <>
      <figure
        className="group relative my-2 inline-block cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-muted/20 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && open()}
        aria-label={`Expand image: ${alt || "image"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || "Image"}
          className="max-h-[400px] max-w-full rounded-xl object-contain"
          loading="lazy"
        />
        <figcaption className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ImageIcon className="h-3 w-3" />
          Click to expand
        </figcaption>
      </figure>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && close()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || "Image"}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl animate-scale-in"
          />
        </div>
      )}
    </>
  );
}

/* ── Inline SVG with sanitization + lightbox ─────────────────── */

function InlineSvg({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);
  const safe = sanitizeSvg(code);

  const open = () => setExpanded(true);
  const close = () => setExpanded(false);

  return (
    <>
      <div
        className="group relative my-2 inline-block cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-white/95 dark:bg-white/10 p-3 transition-all hover:border-accent/30 hover:shadow-lg"
        onClick={open}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && open()}
        aria-label="Expand SVG diagram"
      >
        <div
          className="block max-h-[400px] overflow-auto [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ExternalLink className="h-3 w-3" />
          Click to expand
        </span>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in cursor-zoom-out"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="SVG diagram lightbox"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && close()}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-scale-in [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        </div>
      )}
    </>
  );
}

/* ── SVG streaming placeholder ───────────────────────────────── */

function SvgLoadingPlaceholder() {
  return (
    <div className="my-2 flex h-40 w-full animate-pulse items-center justify-center rounded-xl border border-border/60 bg-muted/20">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <svg
          className="h-6 w-6 animate-spin text-accent"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">Drawing diagram…</span>
      </div>
    </div>
  );
}

/* ── Shared markdown renderer config ─────────────────────────── */

const markdownComponents = {
  img: InlineImage,
};

const proseClasses =
  "prose dark:prose-invert max-w-full text-[15px] leading-relaxed " +
  "prose-headings:scroll-mt-4 prose-p:leading-relaxed " +
  "overflow-hidden [overflow-wrap:break-word]";

/* ── Assistant markdown body ─────────────────────────────────── */

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
    <div className="flex flex-col space-y-4 overflow-hidden [overflow-wrap:break-word] text-[15px] leading-relaxed text-foreground/90 rounded-2xl rounded-tl-sm bg-card/60 px-5 py-4 shadow-sm ring-1 ring-white/5 backdrop-blur-sm">
      <div className="space-y-4">
        {textSegments.map((segment, i) => {
          // ── Artifact card ──────────────────────────────────────
          const artifactIndex = isArtifactPlaceholder(segment);
          if (artifactIndex !== null && artifacts[artifactIndex]) {
            const artifact = artifacts[artifactIndex];
            const meta = getArtifactMeta(artifact.type);
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
                  {meta.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{artifact.title}</p>
                  <p className="text-xs text-muted-foreground">Open {meta.label}</p>
                </div>
              </button>
            );
          }

          // ── Inline SVG detection ───────────────────────────────
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
                    return <SvgLoadingPlaceholder key={j} />;
                  }
                  return (
                    <div key={j} className={proseClasses}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {piece.content}
                      </ReactMarkdown>
                    </div>
                  );
                })}
              </div>
            );
          }

          // ── Plain markdown ─────────────────────────────────────
          return (
            <div key={i} className={proseClasses}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
                type={
                  c.type === "page_location"
                    ? "pdf"
                    : c.type === "content_block_location"
                    ? "video"
                    : "pdf"
                }
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

/* ── Main MessageBubble export ───────────────────────────────── */

export function MessageBubble({ message, onArtifactClick, onCitationClick }: MessageBubbleProps) {
  // ── User bubble ──────────────────────────────────────────────
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

  // ── Assistant bubble ─────────────────────────────────────────
  const showAssistantShell =
    Boolean(message.content) ||
    Boolean(message.statusLine) ||
    message.toolCalls.length > 0 ||
    Boolean(message.review);

  if (!showAssistantShell) return null;

  const isStreaming =
    Boolean(message.statusLine) || message.toolCalls.some((t) => t.state === "calling");

  return (
    <div className="flex items-start gap-4 max-w-[95%] sm:max-w-[85%] pt-4">
      {/* Avatar */}
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

      {/* Content */}
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