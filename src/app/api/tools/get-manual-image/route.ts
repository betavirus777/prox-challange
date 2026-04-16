import { loadJsonData } from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const imageId = body.image_id || body.parameters?.image_id;
  const topic = body.topic || body.parameters?.topic;

  const index = loadJsonData<
    Array<{ id: string; description: string; pageNumber: number; topics: string[]; filename: string }>
  >("image-index.json");

  if (!index) {
    return NextResponse.json({ message: "Image index not available." });
  }

  let match;
  if (imageId) {
    match = index.find((img) => img.id === imageId);
  } else if (topic) {
    const topicLower = topic.toLowerCase();
    match = index.find(
      (img) =>
        img.description.toLowerCase().includes(topicLower) ||
        img.topics.some((t) => t.toLowerCase().includes(topicLower))
    );
  }

  if (!match) {
    return NextResponse.json({
      message: "No matching image found.",
      availableTopics: [...new Set(index.flatMap((img) => img.topics))],
    });
  }

  return NextResponse.json({
    description: match.description,
    pageNumber: match.pageNumber,
    imageUrl: `/manual-images/${match.filename}`,
  });
}
