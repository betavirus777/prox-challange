import { searchManualSections } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const query = body.query || body.parameters?.query || "";
  const sectionFilter = body.section_filter || body.parameters?.section_filter;

  const results = searchManualSections(query, sectionFilter);

  if (results.length === 0) {
    return NextResponse.json({
      message: "No matching sections found. Try rephrasing your question.",
    });
  }

  return NextResponse.json({
    results: results.map((r) => ({
      title: r.title,
      content: r.content.substring(0, 800),
      page: `${r.pdfFile} p.${r.pageRange[0]}-${r.pageRange[1]}`,
      confidence: r.confidence,
    })),
  });
}
