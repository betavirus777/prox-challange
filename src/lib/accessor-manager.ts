import Anthropic from "@anthropic-ai/sdk";

const MANAGER_MODEL = "claude-sonnet-4-5-20250929";

export type ManagerVerdict = {
  verdict: "pass" | "pass_with_warnings" | "revise";
  issues: string[];
  warnings?: string[];
};

export async function runManagerReview(params: {
  client: Anthropic;
  userQuestion: string;
  retrievalContext: string;
  draftAnswer: string;
}): Promise<ManagerVerdict> {
  const { client, userQuestion, retrievalContext, draftAnswer } = params;

  const system = `You are a strict technical reviewer for welding manual answers.
Compare the draft ONLY against the evidence excerpt block. Do not invent new specifications.
Output must be a single JSON object with keys:
- verdict: "pass" | "pass_with_warnings" | "revise"
- issues: string[] (concrete fixes needed; empty if pass)
- warnings: string[] (optional soft notes)

Rules:
- If numbers or limits in the draft conflict with evidence, verdict MUST be "revise" and issues must list each conflict.
- If evidence is insufficient to support strong claims, prefer "pass_with_warnings" with warnings.
- If the draft is well supported and safe, "pass".`;

  const user = `User question:
${userQuestion}

Evidence (retrieved manual excerpts — authoritative for this turn):
${truncate(retrievalContext, 12000)}

Draft answer:
${truncate(draftAnswer, 14000)}

Return JSON only, no markdown.`;

  const res = await client.messages.create({
    model: MANAGER_MODEL,
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as ManagerVerdict;
    if (!parsed.verdict) throw new Error("missing verdict");
    return {
      verdict: parsed.verdict,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch {
    return {
      verdict: "pass_with_warnings",
      issues: [],
      warnings: ["Review step did not return valid JSON."],
    };
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… [truncated]`;
}

export function extractTextFromMessage(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
