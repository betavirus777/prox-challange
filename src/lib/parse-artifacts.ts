export interface ParsedArtifact {
  identifier: string;
  type: string;
  title: string;
  code: string;
}

export interface ParsedContent {
  textSegments: string[];
  artifacts: ParsedArtifact[];
}

const ARTIFACT_REGEX =
  /<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/antArtifact>/g;

export function parseArtifacts(text: string): ParsedContent {
  const artifacts: ParsedArtifact[] = [];
  const textSegments: string[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(ARTIFACT_REGEX.source, "g");

  while ((match = regex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index).trim();
    if (beforeText) textSegments.push(beforeText);

    artifacts.push({
      identifier: match[1],
      type: match[2],
      title: match[3],
      code: match[4].trim(),
    });

    textSegments.push(`__ARTIFACT__${artifacts.length - 1}__`);
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex).trim();
  if (remaining) textSegments.push(remaining);

  return { textSegments, artifacts };
}

export function isArtifactPlaceholder(segment: string): number | null {
  const match = segment.match(/^__ARTIFACT__(\d+)__$/);
  return match ? parseInt(match[1], 10) : null;
}

export function stripArtifactTags(text: string): string {
  return text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, "").trim();
}
