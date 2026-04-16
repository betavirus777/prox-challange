import type { Citation } from "./use-agent-chat";

export interface ResolvedCitation {
  type: "pdf" | "video";
  label: string;
  citedText: string;
  documentTitle: string;
  pageNumber?: number;
  videoTimestamp?: number;
  youtubeUrl?: string;
  colorClass: string;
}

export function resolveCitation(citation: Citation): ResolvedCitation {
  const title = citation.document_title || "Unknown";
  const colorClass = getColorForTitle(title);

  if (citation.type === "page_location" && citation.start_page_number) {
    return {
      type: "pdf",
      label: `${shortenTitle(title)} p.${citation.start_page_number}`,
      citedText: citation.cited_text,
      documentTitle: title,
      pageNumber: citation.start_page_number,
      colorClass,
    };
  }

  if (citation.type === "content_block_location" && citation.start_block_index !== undefined) {
    const seconds = citation.start_block_index * 30;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      type: "video",
      label: `Video ${m}:${s.toString().padStart(2, "0")}`,
      citedText: citation.cited_text,
      documentTitle: title,
      videoTimestamp: seconds,
      youtubeUrl: `https://www.youtube.com/watch?v=kxGDoGcnhBw&t=${seconds}`,
      colorClass,
    };
  }

  return {
    type: "pdf",
    label: shortenTitle(title),
    citedText: citation.cited_text,
    documentTitle: title,
    colorClass,
  };
}

function getColorForTitle(title: string): string {
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
