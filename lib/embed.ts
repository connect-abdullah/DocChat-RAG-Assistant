import { pipeline } from "@xenova/transformers";

let extractor: unknown;

export async function getEmbeddingModel() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbeddingModel() as (input: string, options: { pooling: string, normalize: boolean }) => Promise<{ data: Float32Array }>;
  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data); // Float32Array → number[]
}

export function chunkText(text: string, maxLength = 500): string[] {
  const sentences = text.match(/[^\\.!\?\\n]+[\\.!\?\\n]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}
