import Anthropic from "@anthropic-ai/sdk";
import { searchManualSections, loadJsonData } from "./search";

type ToolInput = Record<string, unknown>;

export const toolDefinitions: Anthropic.Messages.Tool[] = [
  {
    name: "search_manual",
    description:
      "Search the extracted manual sections for relevant content. Use for general questions about the welder, setup procedures, safety, maintenance, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query describing what information is needed" },
        section_filter: { type: "string", description: "Optional filter to a specific section or topic" },
      },
      required: ["query"],
    },
  },
  {
    name: "lookup_duty_cycle",
    description:
      "Look up duty cycle data for specific welding processes, voltages, and amperages. Returns precise structured data from the duty cycle tables.",
    input_schema: {
      type: "object" as const,
      properties: {
        process: { type: "string", enum: ["MIG", "Flux-Cored", "TIG", "Stick"], description: "Welding process" },
        input_voltage: { type: "string", enum: ["120V", "240V"], description: "Input voltage" },
        amperage: { type: "number", description: "Amperage to look up" },
      },
    },
  },
  {
    name: "lookup_specs",
    description:
      "Look up machine specifications, polarity configurations, recommended settings, or wire feed data.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["general", "polarity", "settings", "wire_feed", "parts"],
          description: "Category of specifications to look up",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_manual_image",
    description:
      "Retrieve a specific diagram, photo, or schematic from the manual. Use when the user asks about visual content.",
    input_schema: {
      type: "object" as const,
      properties: {
        image_id: { type: "string", description: "Specific image ID if known" },
        topic: { type: "string", description: "Topic to find an image for, e.g. 'polarity setup', 'front panel'" },
      },
    },
  },
  {
    name: "troubleshoot",
    description:
      "Look up troubleshooting information for welding problems, defects, machine errors, or operational issues.",
    input_schema: {
      type: "object" as const,
      properties: {
        symptom: {
          type: "string",
          description: "Description of the problem or symptom, e.g. 'porosity', 'spatter', 'wire feed issues'",
        },
      },
      required: ["symptom"],
    },
  },
];

export async function executeTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case "search_manual": {
      const results = searchManualSections(
        input.query as string,
        input.section_filter as string | undefined
      );
      if (results.length === 0) {
        return JSON.stringify({
          found: false,
          message: "No matching sections found. Use retrieved manual excerpts in context or other tools.",
        });
      }
      return JSON.stringify({
        found: true,
        results: results.map((r) => ({
          title: r.title,
          content: r.content.substring(0, 1500),
          pdfFile: r.pdfFile,
          pageRange: r.pageRange,
          confidence: r.confidence,
        })),
      });
    }

    case "lookup_duty_cycle": {
      const data = loadJsonData<Array<Record<string, unknown>>>("duty-cycles.json");
      if (!data) return JSON.stringify({ found: false, message: "Duty cycle data not available. Use lookup after KB is populated." });
      let filtered = data;
      if (input.process) filtered = filtered.filter((d) => d.process === input.process);
      if (input.input_voltage) filtered = filtered.filter((d) => d.inputVoltage === input.input_voltage);
      if (input.amperage) filtered = filtered.filter((d) => d.amperage === input.amperage);
      return JSON.stringify({ found: filtered.length > 0, results: filtered });
    }

    case "lookup_specs": {
      const fileMap: Record<string, string> = {
        general: "specs.json", polarity: "polarity.json", settings: "settings-guide.json",
        wire_feed: "wire-feed.json", parts: "parts-list.json",
      };
      const data = loadJsonData<unknown>(fileMap[input.category as string]);
      if (!data) return JSON.stringify({ found: false, message: `${input.category} data not yet extracted.` });
      return JSON.stringify({ found: true, data });
    }

    case "get_manual_image": {
      const index = loadJsonData<Array<{ id: string; description: string; pageNumber: number; topics: string[]; filename: string }>>(
        "image-index.json"
      );
      if (!index) return JSON.stringify({ found: false, message: "Image index not built. Use get_manual_image after index exists." });
      let match;
      if (input.image_id) match = index.find((img) => img.id === input.image_id);
      else if (input.topic) {
        const t = (input.topic as string).toLowerCase();
        match = index.find((img) => img.description.toLowerCase().includes(t) || img.topics.some((tp) => tp.toLowerCase().includes(t)));
      }
      if (!match) return JSON.stringify({ found: false, message: "No matching image found." });
      return JSON.stringify({ found: true, imageUrl: `/manual-images/${match.filename}`, description: match.description, pageNumber: match.pageNumber });
    }

    case "troubleshoot": {
      const data = loadJsonData<Array<{ problem: string; causes: string[]; solutions: string[]; sourcePage: number }>>(
        "troubleshooting.json"
      );
      if (!data) return JSON.stringify({ found: false, message: "Troubleshooting data not available." });
      const s = (input.symptom as string).toLowerCase();
      const matches = data.filter(
        (d) => d.problem.toLowerCase().includes(s) || d.causes.some((c) => c.toLowerCase().includes(s)) || d.solutions.some((x) => x.toLowerCase().includes(s))
      );
      return JSON.stringify({ found: matches.length > 0, results: matches });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
