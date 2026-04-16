"use client";

import { X, ExternalLink } from "lucide-react";
import type { ResolvedCitation } from "@/lib/parse-citations";

interface CitationPanelProps {
  citation: ResolvedCitation;
  onClose: () => void;
}

export function CitationPanel({ citation, onClose }: CitationPanelProps) {
  return (
    <>
      {/* Backdrop overlay on mobile */}
      <div
        className="fixed inset-0 z-40 panel-overlay md:hidden"
        onClick={onClose}
      />

      <div className="side-panel flex w-full md:w-[400px] flex-col border-l border-border/50 bg-card/95 backdrop-blur-sm fixed bottom-0 left-0 right-0 z-50 md:z-auto md:relative h-[70vh] md:h-auto rounded-t-2xl md:rounded-none">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
          {/* Mobile drag handle */}
          <div className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-muted-foreground/30 md:hidden" />
          <span className="text-sm font-medium">Source: {citation.documentTitle}</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {citation.type === "pdf" && citation.pageNumber && (
            <PdfCitationView
              documentTitle={citation.documentTitle}
              pageNumber={citation.pageNumber}
              citedText={citation.citedText}
            />
          )}

          {citation.type === "video" && citation.videoTimestamp !== undefined && (
            <VideoCitationView
              timestamp={citation.videoTimestamp}
              citedText={citation.citedText}
              youtubeUrl={citation.youtubeUrl}
            />
          )}
        </div>
      </div>
    </>
  );
}

function PdfCitationView({
  documentTitle,
  pageNumber,
  citedText,
}: {
  documentTitle: string;
  pageNumber: number;
  citedText: string;
}) {
  const pdfMap: Record<string, string> = {
    "Owner's Manual": "/files/owner-manual.pdf",
    "Quick Start Guide": "/files/quick-start-guide.pdf",
    "Selection Chart": "/files/selection-chart.pdf",
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border/50">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Page {pageNumber}
        </p>
        <p className="text-sm leading-relaxed">{citedText}</p>
      </div>

      {pdfMap[documentTitle] && (
        <a
          href={`${pdfMap[documentTitle]}#page=${pageNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm transition-all hover:bg-muted/50 hover:border-accent/30"
        >
          <ExternalLink className="h-4 w-4 text-accent" />
          Open PDF at page {pageNumber}
        </a>
      )}
    </div>
  );
}

function VideoCitationView({
  timestamp,
  citedText,
  youtubeUrl,
}: {
  timestamp: number;
  citedText: string;
  youtubeUrl?: string;
}) {
  const mins = Math.floor(timestamp / 60);
  const secs = Math.floor(timestamp % 60);

  return (
    <div className="space-y-4 animate-fade-in">
      {youtubeUrl && (
        <div className="aspect-video overflow-hidden rounded-xl ring-1 ring-border/50">
          <iframe
            src={`https://www.youtube.com/embed/kxGDoGcnhBw?start=${Math.floor(timestamp)}&autoplay=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Product video"
          />
        </div>
      )}

      <div className="rounded-xl bg-muted/50 p-4 ring-1 ring-border/50">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Video at {mins}:{secs.toString().padStart(2, "0")}
        </p>
        <p className="text-sm leading-relaxed">{citedText}</p>
      </div>
    </div>
  );
}
