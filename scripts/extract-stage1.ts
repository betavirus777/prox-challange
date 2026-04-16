/**
 * Stage 1: Multi-model parallel extraction
 *
 * Sends each PDF to Claude Vision, GPT-4o Vision, and Gemini Flash in parallel.
 * Each model extracts structured sections with page references.
 * Output: knowledge/raw/{model}/{pdf-name}.json
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const PDFS = [
  { name: "owner-manual", filename: "owner-manual.pdf", title: "Owner's Manual" },
  { name: "quick-start-guide", filename: "quick-start-guide.pdf", title: "Quick Start Guide" },
  { name: "selection-chart", filename: "selection-chart.pdf", title: "Selection Chart" },
];

const EXTRACTION_PROMPT = `You are extracting structured technical content from a welding product manual (Vulcan OmniPro 220).

Extract ALL content into structured sections. For each section, provide:
- title: Section heading
- content: Full text content of the section (preserve technical details, numbers, measurements)
- pageRange: [startPage, endPage] (approximate page numbers where this content appears)
- topics: Array of topic tags (e.g. "safety", "mig", "duty_cycle", "troubleshooting", "polarity", "wire_feed", "specifications", "parts")
- tables: Any tabular data as arrays of objects (e.g. duty cycle tables, specifications tables, settings charts)
- keyFacts: Array of specific technical facts (e.g. "Max amperage on 240V: 200A", "Duty cycle at 200A: 25%")

Important:
- Extract EVERY section, don't skip anything
- Preserve exact numbers, measurements, and specifications
- For tables, convert to structured JSON with clear column headers
- Note any images or diagrams you can see and describe what they show
- Pay special attention to: duty cycles, polarity configurations, recommended settings, troubleshooting steps, safety warnings

Return a JSON array of section objects. Output ONLY valid JSON, no markdown formatting.`;

async function extractWithClaude(pdfBase64: string, pdfTitle: string) {
  const client = new Anthropic();
  console.log(`  [Claude] Extracting ${pdfTitle}...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

async function extractWithGPT4o(pdfBase64: string, pdfTitle: string) {
  if (!process.env.OPENAI_API_KEY) {
    console.log(`  [GPT-4o] Skipped (no OPENAI_API_KEY)`);
    return null;
  }

  const client = new OpenAI();
  console.log(`  [GPT-4o] Extracting ${pdfTitle}...`);

  const response = await client.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_data: `data:application/pdf;base64,${pdfBase64}`,
          },
          { type: "input_text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const textOutput = response.output.find((o: { type: string }) => o.type === "message");
  if (textOutput && "content" in textOutput) {
    const textContent = (textOutput as { content: Array<{ type: string; text?: string }> }).content.find(
      (c: { type: string }) => c.type === "output_text"
    );
    return textContent && "text" in textContent ? textContent.text : "";
  }
  return "";
}

async function extractWithGemini(pdfBase64: string, pdfTitle: string) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.log(`  [Gemini] Skipped (no GOOGLE_AI_API_KEY)`);
    return null;
  }

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  console.log(`  [Gemini] Extracting ${pdfTitle}...`);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: pdfBase64,
      },
    },
    { text: EXTRACTION_PROMPT },
  ]);

  return result.response.text();
}

function parseJsonResponse(text: string): unknown {
  const cleaned = text
    .replace(/^```json?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // Fallback: return raw text wrapped
        return [{ title: "Raw Extraction", content: text, pageRange: [1, 1], topics: ["raw"], tables: [], keyFacts: [] }];
      }
    }
    return [{ title: "Raw Extraction", content: text, pageRange: [1, 1], topics: ["raw"], tables: [], keyFacts: [] }];
  }
}

async function main() {
  console.log("Stage 1: Multi-model parallel extraction\n");

  const outputBase = path.join(process.cwd(), "knowledge", "raw");

  for (const pdf of PDFS) {
    console.log(`\nProcessing: ${pdf.title}`);
    const filePath = path.join(process.cwd(), "files", pdf.filename);
    const pdfBase64 = fs.readFileSync(filePath).toString("base64");

    const models = [
      { name: "claude", fn: () => extractWithClaude(pdfBase64, pdf.title) },
      { name: "gpt4o", fn: () => extractWithGPT4o(pdfBase64, pdf.title) },
      { name: "gemini", fn: () => extractWithGemini(pdfBase64, pdf.title) },
    ];

    const results = await Promise.allSettled(models.map((m) => m.fn()));

    for (let i = 0; i < models.length; i++) {
      const modelName = models[i].name;
      const result = results[i];

      const outputDir = path.join(outputBase, modelName);
      fs.mkdirSync(outputDir, { recursive: true });

      if (result.status === "fulfilled" && result.value) {
        const parsed = parseJsonResponse(result.value);
        fs.writeFileSync(
          path.join(outputDir, `${pdf.name}.json`),
          JSON.stringify(parsed, null, 2)
        );
        console.log(`  ✓ ${modelName}: saved`);
      } else if (result.status === "rejected") {
        console.log(`  ✗ ${modelName}: ${result.reason}`);
      } else {
        console.log(`  - ${modelName}: skipped`);
      }
    }
  }

  console.log("\nStage 1 complete. Raw extractions saved to knowledge/raw/");
}

main().catch(console.error);
