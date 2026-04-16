import OpenAI from "openai";

const MODEL = "text-embedding-3-small";

export const EMBEDDING_DIM = 1536;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const openai = new OpenAI({ apiKey: key });
  const res = await openai.embeddings.create({
    model: MODEL,
    input: texts,
  });
  return res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}
