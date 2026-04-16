import fs from "fs";
import path from "path";

export interface ManualSection {
  id: string;
  title: string;
  content: string;
  pdfFile: string;
  pageRange: [number, number];
  topics: string[];
  relatedImageIds: string[];
  confidence: "high" | "medium" | "needs_verification";
}

let sectionsCache: ManualSection[] | null = null;

function loadSections(): ManualSection[] {
  if (sectionsCache) return sectionsCache;

  const sectionsDir = path.join(process.cwd(), "knowledge", "sections");
  if (!fs.existsSync(sectionsDir)) return [];

  const files = fs.readdirSync(sectionsDir).filter((f) => f.endsWith(".json"));
  sectionsCache = files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(sectionsDir, f), "utf-8"))
  );
  return sectionsCache!;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeTfIdf(query: string, document: string): number {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(document);
  if (docTokens.length === 0) return 0;

  let score = 0;
  for (const qt of queryTokens) {
    const tf = docTokens.filter((t) => t === qt).length / docTokens.length;
    score += tf;
  }
  return score / queryTokens.length;
}

export function searchManualSections(
  query: string,
  sectionFilter?: string,
  limit = 5
): ManualSection[] {
  let sections = loadSections();

  if (sectionFilter) {
    sections = sections.filter(
      (s) =>
        s.title.toLowerCase().includes(sectionFilter.toLowerCase()) ||
        s.topics.some((t) => t.toLowerCase().includes(sectionFilter.toLowerCase()))
    );
  }

  const scored = sections.map((section) => ({
    section,
    score: computeTfIdf(query, `${section.title} ${section.content} ${section.topics.join(" ")}`),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).filter((s) => s.score > 0).map((s) => s.section);
}

export function loadJsonData<T>(filename: string): T | null {
  const filePath = path.join(process.cwd(), "knowledge", filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
}
