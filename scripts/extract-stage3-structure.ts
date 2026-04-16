/**
 * Stage 3: Structure into tool-friendly data files
 *
 * Takes the reviewed sections and produces individual JSON files
 * optimized for the runtime tool lookups:
 * - knowledge/sections/*.json (for search_manual tool)
 * - knowledge/duty-cycles.json (for lookup_duty_cycle tool)
 * - knowledge/polarity.json (for lookup_specs tool)
 * - knowledge/specs.json
 * - knowledge/settings-guide.json
 * - knowledge/troubleshooting.json (for troubleshoot tool)
 * - knowledge/parts-list.json
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

interface ReviewedSection {
  id: string;
  title: string;
  content: string;
  pdfFile: string;
  pageRange: [number, number];
  topics: string[];
  tables?: unknown[];
  keyFacts?: string[];
  confidence: string;
  discrepancies?: string[];
  relatedImageIds?: string[];
}

const STRUCTURE_PROMPT = `You are structuring welding product data into tool-friendly JSON files. Given the reviewed sections below, produce a JSON object with these keys:

1. "dutyCycles": Array of duty cycle entries, each with:
   { process: "MIG"|"Flux-Cored"|"TIG"|"Stick", inputVoltage: "120V"|"240V", amperage: number, dutyCyclePercent: number, volts: number, notes: string }

2. "polarity": Array of polarity configurations:
   { process: string, polarity: "DCEP"|"DCEN"|"AC", positiveTerminal: string, negativeTerminal: string, gasRequired: boolean, gasType: string, notes: string }

3. "specs": Object with general specifications:
   { inputVoltage: string[], maxAmperage: object, weightLbs: number, dimensions: string, processes: string[], displayType: string, ... }

4. "settingsGuide": Array of recommended settings:
   { process: string, material: string, thickness: string, amperage: string, voltage: string, wireSpeed: string, gasFlow: string, notes: string }

5. "troubleshooting": Array of troubleshooting entries:
   { problem: string, causes: string[], solutions: string[], sourcePage: number }

6. "partsList": Array of parts:
   { partNumber: string, description: string, category: string }

7. "wireFeed": Object with wire feed specifications:
   { wireTypes: string[], maxSpoolSize: string, feedSpeedRange: string, ... }

Extract ALL available data. If a category has no data in the source, use an empty array or object.
Return ONLY valid JSON, no markdown.`;

async function main() {
  console.log("Stage 3: Structuring data for tool lookups\n");

  const client = new Anthropic();
  const reviewedDir = path.join(process.cwd(), "knowledge", "reviewed");
  const sectionsDir = path.join(process.cwd(), "knowledge", "sections");
  fs.mkdirSync(sectionsDir, { recursive: true });

  // Load all reviewed sections
  const allSections: ReviewedSection[] = [];
  if (fs.existsSync(reviewedDir)) {
    const files = fs.readdirSync(reviewedDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(reviewedDir, file), "utf-8"));
      if (Array.isArray(data)) {
        allSections.push(...data);
      }
    }
  }

  if (allSections.length === 0) {
    console.log("No reviewed sections found. Run Stage 2 first.");
    return;
  }

  console.log(`Loaded ${allSections.length} reviewed sections`);

  // Save individual sections for search_manual tool
  for (const section of allSections) {
    const filename = `${section.id || section.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.json`;
    fs.writeFileSync(
      path.join(sectionsDir, filename),
      JSON.stringify(section, null, 2)
    );
  }
  console.log(`Saved ${allSections.length} section files`);

  // Use Claude to structure data for specialized tools
  const sectionsSummary = allSections
    .map((s) => `## ${s.title}\n${s.content}\n${s.tables ? JSON.stringify(s.tables) : ""}\n${(s.keyFacts || []).join("\n")}`)
    .join("\n\n---\n\n");

  console.log("Structuring data with Claude...");
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `${STRUCTURE_PROMPT}\n\nSource sections:\n\n${sectionsSummary}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (textBlock && textBlock.type === "text") {
    const cleaned = textBlock.text
      .replace(/^```json?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();

    try {
      const structured = JSON.parse(cleaned);
      const knowledgeDir = path.join(process.cwd(), "knowledge");

      const fileMap: Record<string, string> = {
        dutyCycles: "duty-cycles.json",
        polarity: "polarity.json",
        specs: "specs.json",
        settingsGuide: "settings-guide.json",
        troubleshooting: "troubleshooting.json",
        partsList: "parts-list.json",
        wireFeed: "wire-feed.json",
      };

      for (const [key, filename] of Object.entries(fileMap)) {
        if (structured[key]) {
          fs.writeFileSync(
            path.join(knowledgeDir, filename),
            JSON.stringify(structured[key], null, 2)
          );
          const count = Array.isArray(structured[key])
            ? structured[key].length
            : Object.keys(structured[key]).length;
          console.log(`  ✓ ${filename} (${count} entries)`);
        }
      }
    } catch (e) {
      console.error("Failed to parse structured output:", e);
      fs.writeFileSync(
        path.join(process.cwd(), "knowledge", "structured-raw.txt"),
        textBlock.text
      );
      console.log("  Saved raw output to knowledge/structured-raw.txt");
    }
  }

  console.log("\nStage 3 complete. Structured data saved to knowledge/");
}

main().catch(console.error);
