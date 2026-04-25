// Embeddings Module - Document chunking and embedding generation
// For semantic search in the knowledge base

import { v4 as uuidv4 } from "uuid";
import { DocumentChunk, EmbeddedChunk, SemanticSearchResult, DEFAULT_CONFIG } from "./types.js";
import { getServerConfig } from "../config.js";
import { OpenAIEmbeddings } from "@langchain/openai";

// --- Text Chunking ---

// Split text into overlapping chunks
export function chunkText(text: string, chunkSize: number = DEFAULT_CONFIG.chunkSize, overlap: number = DEFAULT_CONFIG.chunkOverlap): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const lines = text.split("\n");
  let currentChunk: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;
  let startLine = 1;

  for (const line of lines) {
    const lineLength = line.length + 1; // +1 for newline

    if (currentLength + lineLength > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: uuidv4(),
        documentId: "",
        content: currentChunk.join("\n").trim(),
        chunkIndex,
        metadata: {
          filename: "",
          startLine,
          endLine: startLine + currentChunk.length - 1,
        },
      });

      // Start new chunk with overlap
      const overlapLines = currentChunk.slice(-Math.floor(overlap / 50));
      currentChunk = overlapLines;
      currentLength = overlapLines.reduce((acc, l) => acc + l.length + 1, 0);
      startLine = startLine + currentChunk.length - overlapLines.length;

      chunkIndex++;
    }

    currentChunk.push(line);
    currentLength += lineLength;
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: uuidv4(),
      documentId: "",
      content: currentChunk.join("\n").trim(),
      chunkIndex,
      metadata: {
        filename: "",
        startLine,
        endLine: startLine + currentChunk.length - 1,
      },
    });
  }

  return chunks;
}

// --- Embedding Generation ---

let embeddingsInstance: OpenAIEmbeddings | null = null;

// Get or create embeddings instance
function getEmbeddings(): OpenAIEmbeddings {
  if (!embeddingsInstance) {
    const config = getServerConfig();
    const embeddingConfig = config.embedding || {};
    embeddingsInstance = new OpenAIEmbeddings({
      model: embeddingConfig.model || DEFAULT_CONFIG.embeddingModel,
      apiKey: embeddingConfig.apiKey || config.apiKey,
      configuration: {
        baseURL: embeddingConfig.baseUrl || config.baseUrl || undefined,
      },
    });
  }
  return embeddingsInstance;
}

// Generate embeddings for chunks
export async function generateEmbeddings(chunks: DocumentChunk[], documentId: string, filename: string): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const embeddings = getEmbeddings();
  const texts = chunks.map((c) => c.content);

  // Generate embeddings in batch
  const embeddingVectors = await embeddings.embedDocuments(texts);

  // Combine chunks with embeddings
  return chunks.map((chunk, i) => ({
    ...chunk,
    documentId,
    metadata: {
      ...chunk.metadata,
      filename,
    },
    embedding: embeddingVectors[i],
  }));
}

// Generate embedding for a single query
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = getEmbeddings();
  return embeddings.embedQuery(query);
}

// --- Cosine Similarity ---

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- Semantic Search ---

export function semanticSearchScores(
  queryEmbedding: number[],
  chunks: EmbeddedChunk[]
): SemanticSearchResult[] {
  const scored = chunks.map((chunk) => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
    metadata: {
      filename: chunk.metadata.filename,
    },
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}
