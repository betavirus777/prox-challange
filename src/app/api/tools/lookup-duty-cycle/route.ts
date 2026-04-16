import { loadJsonData } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const process = body.process || body.parameters?.process;
  const inputVoltage = body.input_voltage || body.parameters?.input_voltage;
  const amperage = body.amperage || body.parameters?.amperage;

  const data = loadJsonData<Array<Record<string, unknown>>>("duty-cycles.json");
  if (!data) {
    return NextResponse.json({ message: "Duty cycle data not available." });
  }

  let filtered = data;
  if (process) filtered = filtered.filter((d) => d.process === process);
  if (inputVoltage) filtered = filtered.filter((d) => d.inputVoltage === inputVoltage);
  if (amperage) filtered = filtered.filter((d) => d.amperage === amperage);

  return NextResponse.json({ results: filtered });
}
