// Knowledge Base Types - LLM Wiki Pattern
// Layer 1: Raw Sources - immutable source documents
// Layer 2: Wiki - LLM-generated markdown files (summaries, entities, concepts)
// Layer 3: Schema - configuration file (AGENTS.md style)

export interface RawDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  rawPath: string; // Path to raw file in data/knowledge/raw/
  tags: string[];  // User-defined tags for filtering and organization
}

export interface WikiPage {
  slug: string;           // URL-friendly identifier
  title: string;
  content: string;        // Markdown content
  category: 'summary' | 'entity' | 'concept' | 'comparison' | 'overview';
  sourceIds: string[];    // Which raw documents this page references
  linkedPages: string[];  // Cross-references to other wiki pages
  tags: string[];         // User-defined tags for filtering
  createdAt: string;
  updatedAt: string;
}

export interface WikiIndex {
  pages: {
    slug: string;
    title: string;
    summary: string;     // One-line description
    category: string;
    tags: string[];
    updatedAt: string;
  }[];
}

export interface WikiLog {
  entries: {
    timestamp: string;
    operation: 'ingest' | 'query' | 'lint';
    description: string;
    details?: string;
  }[];
}

export interface KnowledgeBaseConfig {
  rawDir: string;
  wikiDir: string;
  indexFile: string;
  logFile: string;
  schemaFile: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
}

export const DEFAULT_CONFIG: KnowledgeBaseConfig = {
  rawDir: "data/knowledge/raw",
  wikiDir: "data/knowledge/wiki",
  indexFile: "data/knowledge/wiki/index.md",
  logFile: "data/knowledge/wiki/log.md",
  schemaFile: "data/knowledge/AGENTS.md",
  embeddingModel: "text-embedding-3-small",
  chunkSize: 500,
  chunkOverlap: 50,
};

// Document Chunk types for embedding storage
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  chunkIndex: number;
  metadata: {
    filename: string;
    tags?: string[];      // Tags from source document (optional until set during embedding)
    startLine?: number;
    endLine?: number;
  };
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

// Search result with similarity score
export interface SemanticSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata: {
    filename: string;
    tags: string[];
  };
}

// Operation types
export type WikiOperation = 'ingest' | 'query' | 'lint';
