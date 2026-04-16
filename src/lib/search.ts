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

// Common English stop words to exclude from scoring
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "his",
  "how",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "out",
  "own",
  "say",
  "she",
  "so",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "too",
  "up",
  "us",
  "use",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "would",
  "you",
  "your",
  "can",
  "could",
  "does",
  "did",
  "should",
  "about",
  "just",
  "like",
  "more",
  "most",
  "much",
  "need",
  "also",
  "been",
  "some",
  "such",
]);

// Basic suffix-stripping stemmer
function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("tion")) return word.slice(0, -4) + "t";
  if (word.endsWith("ness")) return word.slice(0, -4);
  if (word.endsWith("ment")) return word.slice(0, -4);
  if (word.endsWith("able")) return word.slice(0, -4);
  if (word.endsWith("ible")) return word.slice(0, -4);
  if (word.endsWith("ally")) return word.slice(0, -4);
  if (word.endsWith("ful")) return word.slice(0, -3);
  if (word.endsWith("ous")) return word.slice(0, -3);
  if (word.endsWith("ive")) return word.slice(0, -3);
  if (word.endsWith("ly") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("er") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("es") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3)
    return word.slice(0, -1);
  return word;
}

function loadSections(): ManualSection[] {
  if (sectionsCache) return sectionsCache;

  const sectionsDir = path.join(process.cwd(), "knowledge", "sections");
  if (!fs.existsSync(sectionsDir)) return [];

  const files = fs.readdirSync(sectionsDir).filter((f) => f.endsWith(".json"));
  sectionsCache = files.map((f) =>
    JSON.parse(fs.readFileSync(path.join(sectionsDir, f), "utf-8")),
  );
  return sectionsCache!;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
    .map(stem);
}

/** Precompute IDF for all sections (lazy singleton) */
let idfCache: Map<string, number> | null = null;

function getIdf(): Map<string, number> {
  if (idfCache) return idfCache;
  const sections = loadSections();
  if (sections.length === 0) return new Map();

  const docCount = sections.length;
  const termDocFreq = new Map<string, number>();

  for (const section of sections) {
    const uniqueTokens = new Set(
      tokenize(
        `${section.title} ${section.content} ${section.topics.join(" ")}`,
      ),
    );
    for (const token of uniqueTokens) {
      termDocFreq.set(token, (termDocFreq.get(token) ?? 0) + 1);
    }
  }

  idfCache = new Map();
  for (const [term, df] of termDocFreq) {
    // Smooth IDF: log(1 + N / df) to avoid extreme values
    idfCache.set(term, Math.log(1 + docCount / df));
  }
  return idfCache;
}

function computeTfIdf(query: string, document: string): number {
  const queryTokens = tokenize(query);
  const docTokens = tokenize(document);
  if (docTokens.length === 0 || queryTokens.length === 0) return 0;

  const idf = getIdf();

  let score = 0;
  for (const qt of queryTokens) {
    const tf = docTokens.filter((t) => t === qt).length / docTokens.length;
    const idfWeight = idf.get(qt) ?? 1;
    score += tf * idfWeight;
  }

  return score / queryTokens.length;
}

export function searchManualSections(
  query: string,
  sectionFilter?: string,
  limit = 5,
): ManualSection[] {
  let sections = loadSections();

  if (sectionFilter) {
    const filterLower = sectionFilter.toLowerCase();
    sections = sections.filter(
      (s) =>
        s.title.toLowerCase().includes(filterLower) ||
        s.topics.some((t) => t.toLowerCase().includes(filterLower)),
    );
  }

  const scored = sections.map((section) => ({
    section,
    score: computeTfIdf(
      query,
      `${section.title} ${section.content} ${section.topics.join(" ")}`,
    ),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, limit)
    .filter((s) => s.score > 0)
    .map((s) => s.section);
}

export function loadJsonData<T>(filename: string): T | null {
  const filePath = path.join(process.cwd(), "knowledge", filename);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
}
