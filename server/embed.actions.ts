"use server";
import { pipeline } from "@xenova/transformers";
import { supabaseAdmin } from "@/db/supabase.admin";

let extractor: unknown;

async function getEmbeddingModel() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractor;
}

async function embedText(text: string): Promise<number[]> {
  const model = await getEmbeddingModel() as (input: string, options: { pooling: string, normalize: boolean }) => Promise<{ data: Float32Array }>;
  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data); // Float32Array → number[]
}

function chunkText(text: string, maxLength = 600): string[] {
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

export async function processAndStoreChunks(documentId: string, text: string) {
  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);

    const { error } = await supabaseAdmin.from("vectors").insert({
      document_id: documentId,
      content: chunk,
      embedding,
    });

    if (error) {
      console.error("Insert failed:", error);
    }
  }
} 

export async function queryRelevantChunks(question: string, documentId?: string) {
    const queryEmbedding = await embedText(question);
    
    let query;
    if (documentId) {
      // Query chunks from specific document
      query = supabaseAdmin.rpc("match_documents_by_id", {
        query_embedding: queryEmbedding,
        match_threshold: 0.12,
        match_count: 6,
        document_id: documentId,
      });
    } else {
      // Query all chunks (existing behavior)
      query = supabaseAdmin.rpc("match_documents", {
        query_embedding: queryEmbedding,
        match_threshold: 0.12,
        match_count: 6,
      });
    }
    
    const { data, error } = await query;
  
    if (error) {
      console.error("Vector search failed:", error);
      return [];
    }

    return data || [];
  }