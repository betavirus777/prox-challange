/**
 * Extract and index diagrams/images from the PDFs
 *
 * Uses Claude Vision to identify and describe all significant
 * diagrams, photos, and schematics in the manual.
 * Output: knowledge/image-index.json
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const IMAGE_INDEX_PROMPT = `Analyze this welding product manual PDF and identify ALL significant visual content (diagrams, photos, schematics, illustrations, tables with visual elements).

For each visual element, provide:
- id: A unique kebab-case identifier (e.g. "fig-1-front-panel", "diagram-polarity-mig")
- description: Detailed description of what the image shows
- pageNumber: Page number where the image appears
- topics: Array of relevant topic tags
- filename: Suggested filename for the image (kebab-case.png)
- type: "diagram" | "photo" | "schematic" | "table" | "illustration"

Focus on images that would be useful for answering user questions:
- Front/rear panel layouts
- Polarity/cable routing diagrams
- Wire feed mechanism photos
- Weld defect diagnosis photos
- Setup procedure illustrations
- Wiring/electrical schematics

Return a JSON array. Output ONLY valid JSON, no markdown.`;

async function main() {
  console.log("Extracting image index from PDFs\n");

  const client = new Anthropic();
  const allImages: Array<Record<string, unknown>> = [];

  const pdfs = [
    { filename: "owner-manual.pdf", title: "Owner's Manual" },
    { filename: "quick-start-guide.pdf", title: "Quick Start Guide" },
    { filename: "selection-chart.pdf", title: "Selection Chart" },
  ];

  for (const pdf of pdfs) {
    console.log(`Processing: ${pdf.title}`);
    const filePath = path.join(process.cwd(), "files", pdf.filename);
    const pdfBase64 = fs.readFileSync(filePath).toString("base64");

    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: IMAGE_INDEX_PROMPT },
          ],
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
        if (Array.isArray(parsed)) {
          const withSource = parsed.map((img: Record<string, unknown>) => ({
            ...img,
            sourcePdf: pdf.filename,
          }));
          allImages.push(...withSource);
          console.log(`  ✓ Found ${parsed.length} images`);
        }
      } catch {
        console.log(`  ⚠ Could not parse response`);
      }
    }
  }

  fs.writeFileSync(
    path.join(process.cwd(), "knowledge", "image-index.json"),
    JSON.stringify(allImages, null, 2)
  );

  console.log(`\nImage index saved with ${allImages.length} entries`);
}

main().catch(console.error);
