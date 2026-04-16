import { YoutubeTranscript } from "youtube-transcript";
import fs from "fs";
import path from "path";

const VIDEO_ID = "kxGDoGcnhBw";
const CHUNK_DURATION = 30;

async function main() {
  console.log(`Fetching transcript for video: ${VIDEO_ID}`);
  
  try {
    const entries = await YoutubeTranscript.fetchTranscript(VIDEO_ID);
    console.log(`Got ${entries.length} transcript entries`);
    
    // Chunk into 30-second segments
    const chunks: Array<{ text: string; startTime: number; endTime: number; index: number }> = [];
    let currentChunk: typeof entries = [];
    let chunkStart = 0;
    let chunkIndex = 0;

    for (const entry of entries) {
      const offset = entry.offset / 1000; // ms to seconds
      const duration = entry.duration / 1000;

      if (offset - chunkStart >= CHUNK_DURATION && currentChunk.length > 0) {
        const lastEntry = currentChunk[currentChunk.length - 1];
        chunks.push({
          text: currentChunk.map((e) => e.text).join(" "),
          startTime: chunkStart,
          endTime: (lastEntry.offset + lastEntry.duration) / 1000,
          index: chunkIndex++,
        });
        currentChunk = [];
        chunkStart = offset;
      }
      currentChunk.push(entry);
    }

    if (currentChunk.length > 0) {
      const lastEntry = currentChunk[currentChunk.length - 1];
      chunks.push({
        text: currentChunk.map((e) => e.text).join(" "),
        startTime: chunkStart,
        endTime: (lastEntry.offset + lastEntry.duration) / 1000,
        index: chunkIndex,
      });
    }

    const outputPath = path.join(process.cwd(), "knowledge", "video-transcript.json");
    fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2));
    console.log(`Saved ${chunks.length} chunks to knowledge/video-transcript.json`);
  } catch (e) {
    console.error("Failed to fetch transcript:", e);
    console.log("The video may not have captions available.");
  }
}

main();
