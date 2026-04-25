// Knowledge Base - LLM Wiki Pattern Implementation
// Main entry point for the 3-layer wiki system

export * from "./types.js";
export * from "./storage.js";
export * from "./wiki.js";
export * from "./embeddings.js";
export * from "./vector-store.js";

import {
  saveRawFile,
  getAllRawDocuments,
  getRawDocumentById,
  getRawDocumentPath,
  readRawContent,
  deleteRawDocument,
} from "./storage.js";

import {
  saveWikiPage,
  getWikiPage,
  getAllWikiPages,
  updateWikiIndex,
  appendToLog,
  generateSchema,
} from "./wiki.js";

import {
  chunkText,
  generateEmbeddings,
  generateQueryEmbedding,
  semanticSearchScores,
} from "./embeddings.js";

import {
  addToVectorStore,
  removeFromVectorStore,
  getAllChunks,
  getChunksByDocumentId,
  searchChunks,
} from "./vector-store.js";

import {
  getServerConfig,
} from "../config.js";

import {
  RawDocument,
  WikiPage,
  EmbeddedChunk,
} from "./types.js";

// --- Ingest Operation ---

export interface IngestResult {
  rawDocument: RawDocument;
  wikiPages: WikiPage[];
  chunksCreated: number;
}

// Ingest a new document into the wiki
export async function ingestDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<IngestResult> {
  const config = getServerConfig();
  console.log(`[INGEST] Starting ingestion for: ${filename} (${mimeType})`);

  // Step 1: Save raw file
  const rawDocument = await saveRawFile(fileBuffer, filename, mimeType);
  console.log(`[INGEST] Step 1 - Raw file saved: ${rawDocument.id}`);

  // Step 2: Read raw content
  const filePath = getRawDocumentPath(rawDocument.id);
  if (!filePath) {
    throw new Error("Failed to get file path");
  }
  console.log(`[INGEST] Step 2 - File path: ${filePath}`);

  const rawContent = readRawContent(filePath, mimeType);
  console.log(`[INGEST] Step 2 - Content length: ${rawContent.length} chars`);

  // Step 3: Chunk the content
  const chunks = chunkText(rawContent);
  console.log(`[INGEST] Step 3 - Created ${chunks.length} chunks`);

  // Step 4: Generate embeddings for chunks (skip if API fails)
  let embeddedChunks: EmbeddedChunk[] = [];
  const embeddingConfig = config.embedding || {};
  // Only attempt embeddings if embedding API is explicitly configured
  const hasEmbeddingConfig = embeddingConfig.apiKey && embeddingConfig.baseUrl;

  if (hasEmbeddingConfig && chunks.length > 0) {
    console.log(`[INGEST] Step 4 - About to generate embeddings, chunk count: ${chunks.length}`);
    try {
      embeddedChunks = await generateEmbeddings(chunks, rawDocument.id, filename);
      addToVectorStore(embeddedChunks);
      console.log(`[INGEST] Step 4 - Generated ${embeddedChunks.length} embeddings`);
    } catch (err) {
      console.warn("[INGEST] Step 4 - Embedding generation failed:", err);
    }
  } else {
    console.log(`[INGEST] Step 4 - Skipping embeddings (no separate embedding config)`);
  }

  // Step 5: Generate wiki pages
  console.log(`[INGEST] Step 5 - Generating wiki pages...`);
  const wikiPages = await generateWikiPages(rawDocument, rawContent);
  console.log(`[INGEST] Step 5 - Generated ${wikiPages.length} wiki pages`);

  // Step 6: Save wiki pages
  for (const page of wikiPages) {
    console.log(`[INGEST] Step 6 - Saving wiki page: ${page.slug}`);
    saveWikiPage(page);
  }

  // Step 7: Update index
  const allPages = getAllWikiPages();
  console.log(`[INGEST] Step 7 - Total wiki pages after ingest: ${allPages.length}`);
  updateWikiIndex(allPages);

  // Step 8: Log operation
  appendToLog("ingest", `Added ${filename}`, `Created ${wikiPages.length} wiki pages and ${embeddedChunks.length} chunks`);

  return { rawDocument, wikiPages, chunksCreated: embeddedChunks.length };
}

// Generate wiki pages from raw document using LLM
async function generateWikiPages(rawDoc: RawDocument, rawContent: string): Promise<WikiPage[]> {
  const config = getServerConfig();
  const pages: WikiPage[] = [];
  const now = new Date().toISOString();

  // For text content, generate a summary page
  if (rawDoc.mimeType === "text/plain" || rawDoc.mimeType === "text/markdown") {
    const filenameWithoutExt = rawDoc.filename.replace(/\.[^.]+$/, "");
    // Use document ID prefix to ensure uniqueness for same-filename uploads
    const idPrefix = rawDoc.id.split("-")[0];
    const slug = `${slugify(filenameWithoutExt)}-${idPrefix}`;
    const title = filenameWithoutExt;

    const summaryPage: WikiPage = {
      slug,
      title,
      content: generateSummaryContent(rawContent, title),
      category: "summary",
      sourceIds: [rawDoc.id],
      linkedPages: [],
      createdAt: now,
      updatedAt: now,
    };
    pages.push(summaryPage);
  }

  // If content is substantial, create additional pages
  if (rawContent.length > 1000) {
    // Could use LLM to extract entities, concepts, etc.
    // For now, create a basic entity page for longer documents
    const filenameWithoutExt = rawDoc.filename.replace(/\.[^.]+$/, "");
    const idPrefix = rawDoc.id.split("-")[0];
    const entitySlug = `${slugify(filenameWithoutExt)}-${idPrefix}-analysis`;
    const entityPage: WikiPage = {
      slug: entitySlug,
      title: `${rawDoc.filename} Analysis`,
      content: `## Analysis\n\nAuto-generated analysis page for ${rawDoc.filename}.\n\n## Key Points\n\n- File: ${rawDoc.filename}\n- Size: ${rawDoc.size} bytes\n- Uploaded: ${rawDoc.uploadedAt}\n\n## Content Preview\n\n${rawContent.slice(0, 500)}...\n`,
      category: "entity",
      sourceIds: [rawDoc.id],
      linkedPages: [],
      createdAt: now,
      updatedAt: now,
    };
    pages.push(entityPage);
  }

  return pages;
}

// Generate summary content markdown
function generateSummaryContent(content: string, title: string): string {
  // Extract first few paragraphs
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50);
  const summary = paragraphs.slice(0, 3).join("\n\n");

  return `# ${title}\n\n## Summary\n\n${summary || "No summary available."}\n\n## Metadata\n\n- Source: Raw document\n- Generated: ${new Date().toISOString()}\n`;
}

// Convert filename to URL-friendly slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// --- Query Operation ---

export interface QueryResult {
  answer: string;
  pages: WikiPage[];
  citations: string[];
  chunksFound: number;
}

// Query the wiki for answers using semantic search
export async function queryWiki(question: string): Promise<QueryResult> {
  try {
    // Get all chunks
    const allChunks = getAllChunks();

    // If no chunks, fall back to wiki pages
    if (allChunks.length === 0) {
      const allPages = getAllWikiPages();
      if (allPages.length === 0) {
        appendToLog("query", question, "No documents in knowledge base");
        return {
          answer: "The knowledge base is empty. Upload some documents first.",
          pages: [],
          citations: [],
          chunksFound: 0,
        };
      }
      // Keyword search in wiki pages as fallback
      const relevantPages = findRelevantPages(question, allPages);
      const answer = await generateAnswer(question, relevantPages);
      appendToLog("query", question, `Found ${relevantPages.length} pages (no embeddings)`);
      return {
        answer,
        pages: relevantPages,
        citations: relevantPages.map((p) => p.slug),
        chunksFound: 0,
      };
    }

    // Generate embedding for the query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateQueryEmbedding(question);
    } catch {
      // Fall back to wiki pages if embedding fails
      const allPages = getAllWikiPages();
      const relevantPages = findRelevantPages(question, allPages);
      const answer = await generateAnswer(question, relevantPages);
      appendToLog("query", question, `Found ${relevantPages.length} pages (embedding failed)`);
      return {
        answer,
        pages: relevantPages,
        citations: relevantPages.map((p) => p.slug),
        chunksFound: 0,
      };
    }

    // Perform semantic search
    const searchResults = semanticSearchScores(queryEmbedding, allChunks, 5);

    if (searchResults.length === 0) {
      appendToLog("query", question, "No relevant chunks found");
      return {
        answer: "I couldn't find relevant information in the knowledge base.",
        pages: [],
        citations: [],
        chunksFound: 0,
      };
    }

    // Build answer from search results
    const context = searchResults
      .map((r) => `[${r.metadata.filename}]\n${r.content}`)
      .join("\n\n---\n\n");

    // Get unique document IDs for citation
    const uniqueDocIds = [...new Set(searchResults.map((r) => r.documentId))];

    // Log query
    appendToLog("query", question, `Found ${searchResults.length} relevant chunks from ${uniqueDocIds.length} documents`);

    return {
      answer: `Based on the knowledge base:\n\n${context}\n\n---\n\nFound ${searchResults.length} relevant passage(s).`,
      pages: [],
      citations: uniqueDocIds,
      chunksFound: searchResults.length,
    };
  } catch (err) {
    console.error("Query failed:", err);
    return {
      answer: "Failed to query knowledge base.",
      pages: [],
      citations: [],
      chunksFound: 0,
    };
  }
}

// Find pages relevant to the question (simple keyword matching fallback)
function findRelevantPages(question: string, pages: WikiPage[]): WikiPage[] {
  const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const scored = pages.map((page) => {
    let score = 0;
    const searchText = `${page.title} ${page.content}`.toLowerCase();
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score++;
      }
    }
    return { page, score };
  });

  // Sort by score and return top matches
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.page);
}

// Generate answer using LLM with context from wiki pages
async function generateAnswer(question: string, pages: WikiPage[]): Promise<string> {
  if (pages.length === 0) {
    return "I couldn't find relevant information in the knowledge base.";
  }

  // Build context from wiki pages
  const context = pages
    .map((p) => `## ${p.title}\n\n${p.content}`)
    .join("\n\n---\n\n");

  return `Based on the knowledge base:\n\n${context}\n\n---\n\nFound ${pages.length} relevant page(s) for: "${question}"`;
}

// --- Lint Operation ---

export interface LintResult {
  contradictions: string[];
  staleClaims: string[];
  orphanPages: string[];
  missingLinks: string[];
}

// Lint the wiki for issues
export async function lintWiki(): Promise<LintResult> {
  const pages = getAllWikiPages();
  const result: LintResult = {
    contradictions: [],
    staleClaims: [],
    orphanPages: [],
    missingLinks: [],
  };

  // Find orphan pages (no links pointing to them)
  const allLinks = new Set<string>();
  for (const page of pages) {
    for (const link of page.linkedPages) {
      allLinks.add(link);
    }
  }

  for (const page of pages) {
    if (!allLinks.has(page.slug) && page.linkedPages.length === 0) {
      result.orphanPages.push(page.slug);
    }
  }

  // Check for missing cross-references
  for (const page of pages) {
    for (const link of page.linkedPages) {
      if (!pages.find((p) => p.slug === link)) {
        result.missingLinks.push(`${page.slug} -> ${link}`);
      }
    }
  }

  // Log lint operation
  const totalIssues =
    result.contradictions.length +
    result.staleClaims.length +
    result.orphanPages.length +
    result.missingLinks.length;

  appendToLog("lint", `Found ${totalIssues} issues`, JSON.stringify(result));

  return result;
}

// --- Admin Operations ---

export function listRawDocuments(): RawDocument[] {
  return getAllRawDocuments();
}

export function getDocument(documentId: string) {
  return getRawDocumentById(documentId);
}

export function removeDocument(documentId: string): boolean {
  // Remove from vector store
  removeFromVectorStore(documentId);
  // Delete raw file
  return deleteRawDocument(documentId);
}

export function getWikiStatus() {
  const pages = getAllWikiPages();
  const docs = getAllRawDocuments();
  const chunks = getAllChunks();
  return {
    rawDocuments: docs.length,
    wikiPages: pages.length,
    chunks: chunks.length,
    categories: [...new Set(pages.map((p) => p.category))],
  };
}
