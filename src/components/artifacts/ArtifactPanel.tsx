"use client";

import { X, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import type { ParsedArtifact } from "@/lib/parse-artifacts";
import { ReactArtifact } from "./ReactArtifact";
import { SvgArtifact } from "./SvgArtifact";
import { MermaidArtifact } from "./MermaidArtifact";
import { HtmlArtifact } from "./HtmlArtifact";
import { cn } from "@/lib/utils";

interface ArtifactPanelProps {
  artifact: ParsedArtifact;
  onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Backdrop overlay on mobile */}
      <div
        className="fixed inset-0 z-40 panel-overlay md:hidden"
        onClick={onClose}
      />

      <div
        className={cn(
          "flex flex-col border-l border-border/50 bg-card/95 backdrop-blur-sm",
          isExpanded
            ? "fixed inset-0 z-50"
            : "side-panel w-full md:w-[40%] md:relative fixed bottom-0 left-0 right-0 z-50 md:z-auto h-[80vh] md:h-auto rounded-t-2xl md:rounded-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
          {/* Mobile drag handle */}
          <div className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-muted-foreground/30 md:hidden" />
          <span className="text-sm font-medium">{artifact.title}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden md:flex rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <ArtifactRenderer artifact={artifact} />
        </div>
      </div>
    </>
  );
}

function ArtifactRenderer({ artifact }: { artifact: ParsedArtifact }) {
  const { type, code } = artifact;

  if (type === "application/vnd.ant.react") {
    return <ReactArtifact code={code} />;
  }

  if (type === "image/svg+xml") {
    return <SvgArtifact code={code} />;
  }

  if (type === "application/vnd.ant.mermaid") {
    return <MermaidArtifact code={code} />;
  }

  if (type === "text/html") {
    return <HtmlArtifact code={code} />;
  }

  return (
    <pre className="overflow-auto rounded-lg bg-muted p-4 text-sm">
      {code}
    </pre>
  );
}
