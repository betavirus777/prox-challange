"use client";

interface SvgArtifactProps {
  code: string;
}

export function SvgArtifact({ code }: SvgArtifactProps) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-white p-4"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
