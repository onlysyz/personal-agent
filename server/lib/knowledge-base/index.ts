// Knowledge Base - LLM Wiki Pattern Implementation
// Main entry point for the simplified wiki system (no embeddings)

export * from "./types.js";
export * from "./storage.js";
export * from "./wiki.js";

import {
  saveRawFile,
  getAllRawDocuments,
  getRawDocumentById,
  getRawDocumentPath,
  readRawContent,
  deleteRawDocument,
  updateDocumentTags,
} from "./storage.js";

import {
  saveWikiPage,
  getWikiPage,
  getAllWikiPages,
  deleteWikiPage,
  updateWikiIndex,
  appendToLog,
  generateSchema,
} from "./wiki.js";

import {
  RawDocument,
  WikiPage,
} from "./types.js";

// --- Ingest Operation ---

export interface IngestResult {
  rawDocument: RawDocument;
  wikiPages: WikiPage[];
}

// Ingest a new document into the wiki
export async function ingestDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  tags: string[] = []
): Promise<IngestResult> {
  console.log(`[INGEST] Starting ingestion for: ${filename} (${mimeType})`);

  // Step 1: Save raw file
  const rawDocument = await saveRawFile(fileBuffer, filename, mimeType, tags);
  console.log(`[INGEST] Step 1 - Raw file saved: ${rawDocument.id} with tags: ${tags.join(", ")}`);

  // Step 2: Read raw content
  const filePath = getRawDocumentPath(rawDocument.id);
  if (!filePath) {
    throw new Error("Failed to get file path");
  }
  console.log(`[INGEST] Step 2 - File path: ${filePath}`);

  const rawContent = readRawContent(filePath, mimeType);
  console.log(`[INGEST] Step 2 - Content length: ${rawContent.length} chars`);

  // Step 3: Generate wiki pages
  console.log(`[INGEST] Step 3 - Generating wiki pages...`);
  const wikiPages = await generateWikiPages(rawDocument, rawContent);
  console.log(`[INGEST] Step 3 - Generated ${wikiPages.length} wiki pages`);

  // Step 4: Save wiki pages
  for (const page of wikiPages) {
    console.log(`[INGEST] Step 4 - Saving wiki page: ${page.slug}`);
    saveWikiPage(page);
  }

  // Step 5: Update index
  const allPages = getAllWikiPages();
  console.log(`[INGEST] Step 5 - Total wiki pages after ingest: ${allPages.length}`);
  updateWikiIndex(allPages);

  // Step 6: Log operation
  appendToLog("ingest", `Added ${filename}`, `Created ${wikiPages.length} wiki pages`);

  return { rawDocument, wikiPages };
}

// Generate wiki pages from raw document using LLM
async function generateWikiPages(rawDoc: RawDocument, rawContent: string): Promise<WikiPage[]> {
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
      tags: [],
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
      tags: [],
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
  sources: string[];  // Human-readable source filenames
  chunksFound: number;
  filteredByTag?: string;
}

// Query the wiki for answers using wiki pages + keyword matching
// Note: Embeddings/semantic search is disabled - using LLM-based relevance via findRelevantPages
export async function queryWiki(question: string, tagFilter?: string): Promise<QueryResult> {
  try {
    const allPages = getAllWikiPages();

    if (allPages.length === 0) {
      appendToLog("query", question, "No documents in knowledge base");
      return {
        answer: "The knowledge base is empty. Upload some documents first.",
        pages: [],
        citations: [],
        sources: [],
        chunksFound: 0,
        filteredByTag: tagFilter,
      };
    }

    // Apply tag filter to pages if provided
    const filteredPages = tagFilter
      ? allPages.filter(p => (p.tags || []).includes(tagFilter))
      : allPages;

    if (filteredPages.length === 0) {
      appendToLog("query", question, `No pages match tag filter: ${tagFilter}`);
      return {
        answer: `No documents found with tag "${tagFilter}".`,
        pages: [],
        citations: [],
        sources: [],
        chunksFound: 0,
        filteredByTag: tagFilter,
      };
    }

    // Find relevant pages using keyword matching
    const relevantPages = findRelevantPages(question, filteredPages);

    if (relevantPages.length === 0) {
      appendToLog("query", question, "No relevant pages found");
      return {
        answer: "I couldn't find relevant information in the knowledge base.",
        pages: [],
        citations: [],
        sources: [],
        chunksFound: 0,
        filteredByTag: tagFilter,
      };
    }

    // Generate answer from relevant wiki pages
    const answer = await generateAnswer(question, relevantPages);
    appendToLog("query", question, `Found ${relevantPages.length} relevant pages`);

    return {
      answer,
      pages: relevantPages,
      citations: relevantPages.map((p) => p.slug),
      sources: relevantPages.map((p) => p.title),
      chunksFound: 0,
      filteredByTag: tagFilter,
    };
  } catch (err) {
    console.error("Query failed:", err);
    return {
      answer: "Failed to query knowledge base.",
      pages: [],
      citations: [],
      sources: [],
      chunksFound: 0,
    };
  }
}

// Find pages relevant to the question using keyword matching
function findRelevantPages(question: string, pages: WikiPage[]): WikiPage[] {
  // Use shorter keyword threshold (2 chars) to catch more matches
  const keywords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = pages.map((page) => {
    let score = 0;
    const searchText = `${page.title} ${page.content}`.toLowerCase();
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        score++;
      }
    }
    // Bonus: title match counts extra
    for (const keyword of keywords) {
      if (page.title.toLowerCase().includes(keyword)) {
        score += 2;
      }
    }
    return { page, score };
  });

  // Sort by score and return top matches (up to 10 for broader coverage)
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map((s) => s.page);
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
  // Get document info to find wiki page slug
  const doc = getRawDocumentById(documentId);
  if (doc) {
    // Construct wiki page slug: slugify(filename without ext) + id prefix
    const filenameWithoutExt = doc.filename.replace(/\.[^.]+$/, "");
    const idPrefix = documentId.split("-")[0];
    const wikiSlug = `${slugify(filenameWithoutExt)}-${idPrefix}`;
    deleteWikiPage(wikiSlug);
  }

  // Delete raw file
  return deleteRawDocument(documentId);
}

export function getWikiStatus() {
  const pages = getAllWikiPages();
  const docs = getAllRawDocuments();
  return {
    rawDocuments: docs.length,
    wikiPages: pages.length,
    categories: [...new Set(pages.map((p) => p.category))],
  };
}

// Get tags for a specific document
export function getDocumentTags(documentId: string): string[] {
  const doc = getRawDocumentById(documentId);
  return doc?.tags || [];
}

// Update tags for a document
export function updateTags(documentId: string, tags: string[]): boolean {
  const updated = updateDocumentTags(documentId, tags);
  return !!updated;
}

// Batch update tags for multiple documents
export function batchUpdateTags(documentIds: string[], tags: string[]): { updated: number; failed: string[] } {
  const failed: string[] = [];
  let updated = 0;

  for (const id of documentIds) {
    const result = updateDocumentTags(id, tags);
    if (result) {
      updated++;
    } else {
      failed.push(id);
    }
  }

  return { updated, failed };
}

// Remove a tag from all documents
export function removeTagFromAllDocuments(tagToRemove: string): number {
  const docs = getAllRawDocuments();
  let removedCount = 0;

  for (const doc of docs) {
    if (doc.tags && doc.tags.includes(tagToRemove)) {
      const newTags = doc.tags.filter((t) => t !== tagToRemove);
      const result = updateDocumentTags(doc.id, newTags);
      if (result) removedCount++;
    }
  }

  return removedCount;
}

// Rename a tag across all documents
export function renameTag(oldTag: string, newTag: string): number {
  const docs = getAllRawDocuments();
  let renamedCount = 0;

  for (const doc of docs) {
    if (doc.tags && doc.tags.includes(oldTag)) {
      const newTags = doc.tags.map((t) => (t === oldTag ? newTag : t));
      const result = updateDocumentTags(doc.id, newTags);
      if (result) renamedCount++;
    }
  }

  return renamedCount;
}

// Get all unique tags across all documents
export function getAllTags(): string[] {
  const docs = getAllRawDocuments();
  const tagSet = new Set<string>();
  for (const doc of docs) {
    for (const tag of doc.tags || []) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

// Get documents filtered by tag
export function getDocumentsByTag(tag: string): RawDocument[] {
  const docs = getAllRawDocuments();
  return docs.filter((doc) => (doc.tags || []).includes(tag));
}
