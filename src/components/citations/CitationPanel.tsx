"use client";

import { X, ExternalLink } from "lucide-react";
import type { ResolvedCitation } from "@/lib/parse-citations";

interface CitationPanelProps {
  citation: ResolvedCitation;
  onClose: () => void;
}

export function CitationPanel({ citation, onClose }: CitationPanelProps) {
  return (
    <div className="flex w-[400px] flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">Source: {citation.documentTitle}</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <div className="space-y-4">
      <div className="rounded-lg bg-muted p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Page {pageNumber}
        </p>
        <p className="text-sm leading-relaxed">{citedText}</p>
      </div>

      {pdfMap[documentTitle] && (
        <a
          href={`${pdfMap[documentTitle]}#page=${pageNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <ExternalLink className="h-4 w-4" />
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
    <div className="space-y-4">
      {youtubeUrl && (
        <div className="aspect-video overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/kxGDoGcnhBw?start=${Math.floor(timestamp)}&autoplay=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Product video"
          />
        </div>
      )}

      <div className="rounded-lg bg-muted p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Video at {mins}:{secs.toString().padStart(2, "0")}
        </p>
        <p className="text-sm leading-relaxed">{citedText}</p>
      </div>
    </div>
  );
}
