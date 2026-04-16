import fs from "fs";
import path from "path";

const PDF_FILES = [
  { name: "Owner's Manual", filename: "owner-manual.pdf" },
  { name: "Quick Start Guide", filename: "quick-start-guide.pdf" },
  { name: "Selection Chart", filename: "selection-chart.pdf" },
];

export function getPdfFiles() {
  return PDF_FILES.map((f) => ({
    title: f.name,
    filename: f.filename,
    path: path.join(process.cwd(), "files", f.filename),
    exists: fs.existsSync(path.join(process.cwd(), "files", f.filename)),
  }));
}

export function getPdfBase64(filename: string): string {
  const filePath = path.join(process.cwd(), "files", filename);
  return fs.readFileSync(filePath).toString("base64");
}

export function getVideoTranscript(): Array<{
  text: string;
  startTime: number;
  endTime: number;
}> {
  const transcriptPath = path.join(
    process.cwd(),
    "knowledge",
    "video-transcript.json"
  );
  if (fs.existsSync(transcriptPath)) {
    return JSON.parse(fs.readFileSync(transcriptPath, "utf-8"));
  }
  return [];
}
