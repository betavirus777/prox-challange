import { loadJsonData } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const category = body.category || body.parameters?.category || "general";

  const fileMap: Record<string, string> = {
    general: "specs.json",
    polarity: "polarity.json",
    settings: "settings-guide.json",
    wire_feed: "wire-feed.json",
    parts: "parts-list.json",
  };

  const data = loadJsonData<unknown>(fileMap[category] || "specs.json");
  if (!data) {
    return NextResponse.json({ message: `${category} data not available.` });
  }

  return NextResponse.json({ category, data });
}
