import fs from "fs";
import path from "path";
import * as lancedb from "@lancedb/lancedb";
import { embedQuery } from "./embeddings";

export type ManualChunkHit = {
  id: string;
  text: string;
  pdf: string;
  pdfTitle: string;
  pageStart: number;
  pageEnd: number;
  distance?: number;
};

const TABLE = "manual_chunks";
const DB_DIR = path.join(process.cwd(), "data", "lancedb");

function dbExists(): boolean {
  return fs.existsSync(DB_DIR);
}

/** Reciprocal rank fusion merge of ranked id lists */
function rrfMerge(lists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  }
  return scores;
}

function dedupeHits(rows: ManualChunkHit[]): ManualChunkHit[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

export async function retrieveManualChunks(
  query: string,
  options?: { limit?: number }
): Promise<ManualChunkHit[]> {
  const limit = options?.limit ?? 10;
  if (!process.env.OPENAI_API_KEY || !dbExists()) {
    return [];
  }

  const conn = await lancedb.connect(DB_DIR);
  const names = await conn.tableNames();
  if (!names.includes(TABLE)) {
    return [];
  }

  const tbl = await conn.openTable(TABLE);
  const subQueries = buildSubQueries(query);
  const lists: string[][] = [];
  const byId = new Map<string, ManualChunkHit>();

  for (const q of subQueries) {
    const vector = await embedQuery(q);
    const rows = await tbl
      .query()
      .nearestTo(vector)
      .limit(Math.max(limit, 12))
      .select(["id", "text", "pdf", "pdfTitle", "pageStart", "pageEnd", "_distance"])
      .toArray();

    const ids: string[] = [];
    for (const row of rows as Array<Record<string, unknown>>) {
      const id = String(row.id ?? "");
      ids.push(id);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          text: String(row.text ?? ""),
          pdf: String(row.pdf ?? ""),
          pdfTitle: String(row.pdfTitle ?? ""),
          pageStart: Number(row.pageStart ?? 1),
          pageEnd: Number(row.pageEnd ?? 1),
          distance: row._distance != null ? Number(row._distance) : undefined,
        });
      }
    }
    lists.push(ids);
  }

  if (lists.length === 0) return [];

  const scores = rrfMerge(lists);
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const hits = ranked.map(([id]) => byId.get(id)).filter(Boolean) as ManualChunkHit[];
  return dedupeHits(hits);
}

function buildSubQueries(query: string): string[] {
  const trimmed = query.trim();
  const base = [trimmed];
  const trimmedLower = trimmed.toLowerCase();
  const parts = trimmed
    .split(/\n+|(?<=[.!?])\s+|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  if (parts.length >= 2 && parts.length <= 4) {
    return [trimmed, ...parts.slice(0, 3)];
  }
  if (trimmedLower.includes(" and ") && trimmed.length > 80) {
    const half = trimmed.split(/\s+and\s+/i);
    if (half.length === 2) return [trimmed, half[0], half[1]];
  }
  return base;
}

export function formatRetrievalForPrompt(hits: ManualChunkHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map(
    (h, i) =>
      `[#${i + 1} ${h.pdfTitle} pp.${h.pageStart}-${h.pageEnd}]\n${h.text.trim()}`
  );
  return lines.join("\n\n---\n\n");
}
