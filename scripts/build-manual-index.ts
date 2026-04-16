/**
 * Chunk PDFs, embed with OpenAI, store in local LanceDB under data/lancedb/
 * Run: npx tsx scripts/build-manual-index.ts
 * Requires: OPENAI_API_KEY, PDFs in files/
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import * as lancedb from "@lancedb/lancedb";
import { embedTexts } from "../src/lib/embeddings";

const PDFS: { filename: string; title: string }[] = [
  { filename: "owner-manual.pdf", title: "Owner's Manual" },
  { filename: "quick-start-guide.pdf", title: "Quick Start Guide" },
  { filename: "selection-chart.pdf", title: "Selection Chart" },
];

const CHUNK_SIZE = 1400;
const CHUNK_OVERLAP = 200;
const BATCH = 32;
const TABLE = "manual_chunks";
const DB_PATH = path.join(process.cwd(), "data", "lancedb");

type Row = {
  id: string;
  text: string;
  pdf: string;
  pdfTitle: string;
  pageStart: number;
  pageEnd: number;
  vector: number[];
};

function chunkPageText(
  pageText: string,
  pageNum: number,
  pdfKey: string,
  pdfTitle: string,
  chunkOffset: number
): Omit<Row, "vector">[] {
  const chunks: Omit<Row, "vector">[] = [];
  const cleaned = pageText.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return chunks;

  let start = 0;
  let i = chunkOffset;
  while (start < cleaned.length) {
    const end = Math.min(cleaned.length, start + CHUNK_SIZE);
    const slice = cleaned.slice(start, end);
    chunks.push({
      id: `${pdfKey}-p${pageNum}-c${i}`,
      text: slice,
      pdf: pdfKey,
      pdfTitle,
      pageStart: pageNum,
      pageEnd: pageNum,
    });
    i++;
    if (end >= cleaned.length) break;
    start = end - CHUNK_OVERLAP;
    if (start < 0) start = 0;
  }
  return chunks;
}

async function extractPdf(buf: Buffer): Promise<{ pages: Array<{ num: number; text: string }> }> {
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  try {
    const tr = await parser.getText();
    const pages = tr.pages.map((p) => ({
      num: p.num,
      text: p.text || "",
    }));
    return { pages };
  } finally {
    await parser.destroy();
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Set OPENAI_API_KEY to build embeddings.");
    process.exit(1);
  }

  const rowsWithoutVec: Omit<Row, "vector">[] = [];

  for (const { filename, title } of PDFS) {
    const filePath = path.join(process.cwd(), "files", filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skip missing file: ${filePath}`);
      continue;
    }
    const buf = fs.readFileSync(filePath);
    const { pages } = await extractPdf(buf);
    const pdfKey = filename.replace(/\.pdf$/i, "");
    let offset = 0;
    for (const p of pages) {
      const parts = chunkPageText(p.text, p.num, pdfKey, title, offset);
      offset += parts.length;
      rowsWithoutVec.push(...parts);
    }
    console.log(`${filename}: ${pages.length} pages → ${offset} chunks`);
  }

  if (rowsWithoutVec.length === 0) {
    console.error("No chunks extracted. Place PDFs in files/ and retry.");
    process.exit(1);
  }

  const rows: Row[] = [];
  for (let i = 0; i < rowsWithoutVec.length; i += BATCH) {
    const batch = rowsWithoutVec.slice(i, i + BATCH);
    const vectors = await embedTexts(batch.map((b) => b.text));
    for (let j = 0; j < batch.length; j++) {
      rows.push({ ...batch[j], vector: vectors[j] });
    }
    console.log(`Embedded ${Math.min(i + BATCH, rowsWithoutVec.length)}/${rowsWithoutVec.length}`);
  }

  fs.mkdirSync(DB_PATH, { recursive: true });
  const conn = await lancedb.connect(DB_PATH);
  if ((await conn.tableNames()).includes(TABLE)) {
    await conn.dropTable(TABLE);
  }
  await conn.createTable(TABLE, rows as Record<string, unknown>[], { mode: "create" });
  console.log(`Wrote ${rows.length} rows to ${path.join(DB_PATH, TABLE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
