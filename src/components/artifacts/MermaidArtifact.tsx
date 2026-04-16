"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidArtifactProps {
  code: string;
}

export function MermaidArtifact({ code }: MermaidArtifactProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#f97316",
            primaryTextColor: "#ededed",
            primaryBorderColor: "#f97316",
            lineColor: "#a1a1a1",
            secondaryColor: "#1a1a1a",
            tertiaryColor: "#111111",
          },
        });

        const id = `mermaid-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        if (!cancelled) setSvg(renderedSvg);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
        Failed to render diagram: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
