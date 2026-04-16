/**
 * Stage 2: Review and scoring
 *
 * Uses Claude to compare extractions from different models,
 * identify discrepancies, score confidence, and produce a
 * merged, verified knowledge base.
 *
 * Input: knowledge/raw/{model}/{pdf-name}.json
 * Output: knowledge/reviewed/{pdf-name}.json
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const PDFS = ["owner-manual", "quick-start-guide", "selection-chart"];

const MODELS = ["claude", "gpt4o", "gemini"];

const REVIEW_PROMPT = `You are a quality control reviewer for extracted technical documentation data. You're reviewing extractions of a welding product manual (Vulcan OmniPro 220) that were independently produced by multiple AI models.

Your job:
1. Compare the extractions from each model
2. Identify agreements (high confidence) and discrepancies (needs verification)
3. Merge into a single authoritative extraction, choosing the most accurate data
4. Assign confidence scores to each section

For each merged section, output:
- id: Unique kebab-case identifier (e.g. "mig-setup-procedure")
- title: Section title
- content: Merged, verified content (use the most complete and accurate version)
- pdfFile: Which PDF this came from
- pageRange: [startPage, endPage]
- topics: Array of topic tags
- tables: Merged tabular data
- keyFacts: Merged key facts
- confidence: "high" (all models agree), "medium" (minor discrepancies), "needs_verification" (significant disagreements)
- discrepancies: Array of any disagreements between models (empty if high confidence)
- relatedImageIds: Array of image IDs mentioned (empty for now)

CRITICAL: Preserve exact numerical values. If models disagree on a number, note it in discrepancies and use the value that appears in the majority of extractions.

Return a JSON array. Output ONLY valid JSON, no markdown.`;

async function main() {
  console.log("Stage 2: Review and scoring\n");

  const client = new Anthropic();
  const rawBase = path.join(process.cwd(), "knowledge", "raw");
  const outputDir = path.join(process.cwd(), "knowledge", "reviewed");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const pdfName of PDFS) {
    console.log(`Reviewing: ${pdfName}`);

    const extractions: Record<string, string> = {};
    for (const model of MODELS) {
      const filePath = path.join(rawBase, model, `${pdfName}.json`);
      if (fs.existsSync(filePath)) {
        extractions[model] = fs.readFileSync(filePath, "utf-8");
        console.log(`  Loaded ${model} extraction`);
      }
    }

    if (Object.keys(extractions).length === 0) {
      console.log(`  No extractions found, skipping`);
      continue;
    }

    const extractionSummary = Object.entries(extractions)
      .map(([model, data]) => `## ${model.toUpperCase()} Extraction:\n${data}`)
      .join("\n\n---\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `${REVIEW_PROMPT}\n\nHere are the extractions to review:\n\n${extractionSummary}`,
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
        const parsed = JSON.parse(cleaned);
        fs.writeFileSync(
          path.join(outputDir, `${pdfName}.json`),
          JSON.stringify(parsed, null, 2)
        );
        console.log(`  ✓ Reviewed and saved (${Array.isArray(parsed) ? parsed.length : "?"} sections)`);
      } catch {
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            const parsed = JSON.parse(arrayMatch[0]);
            fs.writeFileSync(
              path.join(outputDir, `${pdfName}.json`),
              JSON.stringify(parsed, null, 2)
            );
            console.log(`  ✓ Reviewed and saved (extracted from response)`);
          } catch {
            fs.writeFileSync(
              path.join(outputDir, `${pdfName}.raw.txt`),
              textBlock.text
            );
            console.log(`  ⚠ Could not parse JSON, saved raw output`);
          }
        }
      }
    }
  }

  console.log("\nStage 2 complete. Reviewed data saved to knowledge/reviewed/");
}

main().catch(console.error);
