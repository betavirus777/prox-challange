import { loadJsonData } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const symptom = body.symptom || body.parameters?.symptom || "";

  const data = loadJsonData<
    Array<{
      problem: string;
      causes: string[];
      solutions: string[];
      sourcePage: number;
      videoTimestamp?: string;
    }>
  >("troubleshooting.json");

  if (!data) {
    return NextResponse.json({ message: "Troubleshooting data not available." });
  }

  const symptomLower = symptom.toLowerCase();
  const matches = data.filter(
    (d) =>
      d.problem.toLowerCase().includes(symptomLower) ||
      d.causes.some((c) => c.toLowerCase().includes(symptomLower)) ||
      d.solutions.some((s) => s.toLowerCase().includes(symptomLower))
  );

  if (matches.length === 0) {
    return NextResponse.json({
      message: `No troubleshooting entries found for "${symptom}". Try describing the symptom differently.`,
    });
  }

  return NextResponse.json({ results: matches });
}
