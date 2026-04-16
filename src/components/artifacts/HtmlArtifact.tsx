"use client";

import { useRef, useEffect } from "react";

interface HtmlArtifactProps {
  code: string;
}

export function HtmlArtifact({ code }: HtmlArtifactProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const fullHtml = code.includes("<html") || code.includes("<!DOCTYPE")
      ? code
      : `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #ededed; margin: 0; padding: 16px; }</style>
</head>
<body>${code}</body>
</html>`;

    iframe.srcdoc = fullHtml;
  }, [code]);

  return (
    <iframe
      ref={iframeRef}
      className="h-[500px] w-full rounded-lg border border-border"
      sandbox="allow-scripts"
      title="HTML Artifact"
    />
  );
}
