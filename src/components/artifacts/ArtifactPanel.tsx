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
    <div
      className={cn(
        "flex flex-col border-l border-border bg-card",
        isExpanded ? "fixed inset-0 z-50" : "w-[40%]"
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{artifact.title}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <ArtifactRenderer artifact={artifact} />
      </div>
    </div>
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
