// Vector Store - Persistent storage for embeddings
// Enables semantic search over document chunks

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EmbeddedChunk, SemanticSearchResult } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VECTOR_STORE_FILE = path.join(__dirname, "../../../data/knowledge/vector-store.json");

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(VECTOR_STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load vector store from disk
function loadVectorStore(): EmbeddedChunk[] {
  ensureDir();
  if (!fs.existsSync(VECTOR_STORE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(VECTOR_STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Save vector store to disk
function saveVectorStore(chunks: EmbeddedChunk[]): void {
  ensureDir();
  fs.writeFileSync(VECTOR_STORE_FILE, JSON.stringify(chunks, null, 2), "utf-8");
}

// --- Vector Store Operations ---

// Add chunks to vector store
export function addToVectorStore(newChunks: EmbeddedChunk[]): void {
  const store = loadVectorStore();
  const existingIds = new Set(store.map((c) => c.id));

  // Filter out duplicates
  const uniqueNewChunks = newChunks.filter((c) => !existingIds.has(c.id));

  store.push(...uniqueNewChunks);
  saveVectorStore(store);
}

// Remove chunks by document ID
export function removeFromVectorStore(documentId: string): EmbeddedChunk[] {
  const store = loadVectorStore();
  const remaining = store.filter((c) => c.documentId !== documentId);
  const removed = store.filter((c) => c.documentId === documentId);

  saveVectorStore(remaining);

  return removed;
}

// Get all chunks for a document
export function getChunksByDocumentId(documentId: string): EmbeddedChunk[] {
  const store = loadVectorStore();
  return store.filter((c) => c.documentId === documentId);
}

// Get all chunks
export function getAllChunks(): EmbeddedChunk[] {
  return loadVectorStore();
}

// Get chunk count
export function getChunkCount(): number {
  return loadVectorStore().length;
}

// Clear vector store
export function clearVectorStore(): void {
  if (fs.existsSync(VECTOR_STORE_FILE)) {
    fs.unlinkSync(VECTOR_STORE_FILE);
  }
}

// Search chunks by embedding similarity
export function searchChunks(queryEmbedding: number[], chunks: EmbeddedChunk[], topK: number = 5): SemanticSearchResult[] {
  // Calculate cosine similarity for each chunk
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

  // Return top K
  return scored.slice(0, topK);
}

// Cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
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
