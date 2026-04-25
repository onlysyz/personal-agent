// Wiki Layer - Layer 2 of LLM Wiki Pattern
// LLM-generated markdown files: summaries, entities, concepts, comparisons, overview

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WikiPage, WikiIndex, WikiLog, WikiOperation, DEFAULT_CONFIG } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIKI_DIR = path.join(__dirname, "../../../data/knowledge/wiki");
const INDEX_FILE = path.join(__dirname, `../../../${DEFAULT_CONFIG.indexFile}`);
const LOG_FILE = path.join(__dirname, `../../../${DEFAULT_CONFIG.logFile}`);
const SCHEMA_FILE = path.join(__dirname, `../../../${DEFAULT_CONFIG.schemaFile}`);

// Ensure wiki directory exists
function ensureWikiDir() {
  if (!fs.existsSync(WIKI_DIR)) {
    fs.mkdirSync(WIKI_DIR, { recursive: true });
  }
}

// --- Wiki Pages ---

// Save a wiki page as markdown file
export function saveWikiPage(page: WikiPage): void {
  ensureWikiDir();
  const filePath = path.join(WIKI_DIR, `${page.slug}.md`);
  const frontmatter = `---
title: ${page.title}
category: ${page.category}
created: ${page.createdAt}
updated: ${page.updatedAt}
sources: ${page.sourceIds.length > 0 ? page.sourceIds.join(", ") : "[]"}
links: ${page.linkedPages.length > 0 ? page.linkedPages.join(", ") : "[]"}
tags: ${page.tags.length > 0 ? page.tags.join(", ") : "[]"}
---

`;
  const content = frontmatter + page.content;
  fs.writeFileSync(filePath, content, "utf-8");
}

// Get a wiki page by slug
export function getWikiPage(slug: string): WikiPage | undefined {
  const filePath = path.join(WIKI_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, "utf-8");
  return parseWikiPageMarkdown(raw, `${slug}.md`);
}

// Get all wiki pages
export function getAllWikiPages(): WikiPage[] {
  ensureWikiDir();
  if (!fs.existsSync(WIKI_DIR)) return [];

  const files = fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md") && f !== "index.md" && f !== "log.md");
  const pages: WikiPage[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(WIKI_DIR, file), "utf-8");
    try {
      pages.push(parseWikiPageMarkdown(raw, file));
    } catch {
      // Skip invalid files
    }
  }

  return pages;
}

// Delete a wiki page
export function deleteWikiPage(slug: string): boolean {
  const filePath = path.join(WIKI_DIR, `${slug}.md`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// Parse wiki page from markdown with frontmatter
function parseWikiPageMarkdown(raw: string, filename?: string): WikiPage {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    // No frontmatter, return basic page
    return {
      slug: filename ? filename.replace(/\.md$/, "") : "",
      title: "",
      content: raw,
      category: "summary",
      sourceIds: [],
      linkedPages: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const frontmatter = frontmatterMatch[1];
  const content = frontmatterMatch[2];

  // Parse frontmatter
  const getMeta = (key: string) => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*([^\\n]+)$`, "m"));
    return match ? match[1].trim() : "";
  };

  const slug = filename ? filename.replace(/\.md$/, "") : getMeta("title").toLowerCase().replace(/\s+/g, "-");
  const title = getMeta("title");
  const category = getMeta("category") as WikiPage["category"];
  const sourcesStr = getMeta("sources");
  const linksStr = getMeta("links");
  const tagsStr = getMeta("tags");

  return {
    slug,
    title,
    content,
    category: category || "summary",
    sourceIds: sourcesStr && sourcesStr !== "[]" ? sourcesStr.split(", ").filter(Boolean) : [],
    linkedPages: linksStr && linksStr !== "[]" ? linksStr.split(", ").filter(Boolean) : [],
    tags: tagsStr && tagsStr !== "[]" ? tagsStr.split(", ").filter(Boolean) : [],
    createdAt: getMeta("created") || new Date().toISOString(),
    updatedAt: getMeta("updated") || new Date().toISOString(),
  };
}

// --- Index (index.md) ---

// Update the wiki index
export function updateWikiIndex(pages: WikiPage[]): void {
  const index: WikiIndex = {
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: extractSummary(p.content),
      category: p.category,
      tags: p.tags,
      updatedAt: p.updatedAt,
    })),
  };

  let md = `# Wiki Index\n\nThis index catalogs all pages in the wiki.\n\n`;
  md += `## Categories\n\n`;
  const byCategory = new Map<string, WikiIndex["pages"]>();
  for (const page of index.pages) {
    if (!byCategory.has(page.category)) {
      byCategory.set(page.category, []);
    }
    byCategory.get(page.category)!.push(page);
  }

  for (const [category, pages] of byCategory) {
    md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    for (const page of pages) {
      const tagStr = page.tags.length > 0 ? ` [${page.tags.join(", ")}]` : "";
      md += `- [${page.title}](./${page.slug}.md) - ${page.summary}${tagStr} (${page.updatedAt})\n`;
    }
    md += "\n";
  }

  ensureWikiDir();
  fs.writeFileSync(INDEX_FILE, md, "utf-8");
}

// Extract one-line summary from content
function extractSummary(content: string): string {
  // Get first sentence or line
  const firstLine = content.split("\n").find((l) => l.trim() && !l.startsWith("#"));
  if (firstLine) {
    return firstLine.slice(0, 100) + (firstLine.length > 100 ? "..." : "");
  }
  return content.slice(0, 100);
}

// --- Log (log.md) ---

// Append operation to log
export function appendToLog(operation: WikiOperation, description: string, details?: string): void {
  const timestamp = new Date().toISOString().split("T")[0];
  const entry = `## [${timestamp}] ${operation} | ${description}${details ? `\n\n${details}` : ""}\n`;

  ensureWikiDir();
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, `# Wiki Log\n\nChronological record of wiki operations.\n\n`, "utf-8");
  }

  fs.appendFileSync(LOG_FILE, entry, "utf-8");
}

// Get log entries
export function getWikiLog(): WikiLog {
  if (!fs.existsSync(LOG_FILE)) {
    return { entries: [] };
  }

  const raw = fs.readFileSync(LOG_FILE, "utf-8");
  const entries: WikiLog["entries"] = [];

  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^\[([\d-]+)\]\s+(\w+)\s+|\s+(.+)/);
    if (match) {
      // Parse log entry
    }
  }

  return { entries };
}

// --- Schema (AGENTS.md style) ---

// Generate or update the schema file (AGENTS.md)
export function generateSchema(profile: { name: string; role?: string; values?: string[] }): void {
  const schema = `# AGENTS.md - Personal Agent Wiki Schema

This file defines the structure and conventions for the Personal Agent knowledge wiki.

## About ${profile.name}

${profile.role ? `- Role: ${profile.role}` : ""}
${profile.values ? `- Values: ${profile.values.join(", ")}` : ""}

## Wiki Structure

The wiki consists of the following page types:

### Categories

1. **summary** - Overview pages for major topics
2. **entity** - Pages about specific entities (people, companies, projects)
3. **concept** - Pages explaining concepts and techniques
4. **comparison** - Pages comparing different options/approaches
5. **overview** - High-level synthesis pages

### File Naming

- Use kebab-case for slugs: \`my-wiki-page.md\`
- Match title for simple cases: \`${profile.name.toLowerCase().replace(/\s+/g, "-")}.md\`

## Operations

### Ingest (Adding new sources)

When a new source document is added:
1. Read the raw document
2. Summarize key takeaways
3. Create/update relevant wiki pages
4. Update the index
5. Log the operation

### Query (Answering questions)

When answering a question:
1. Search relevant wiki pages
2. Read the pages
3. Synthesize an answer with citations
4. Log the query

### Lint (Maintenance)

Periodically:
- Check for contradictions
- Find stale claims
- Identify orphan pages
- Fill data gaps

## Cross-References

Link between pages using markdown links: \`[Page Title](./page-slug.md)\`

Always cite sources: \`[Source Name](./source-slug.md)\`
`;

  const dir = path.dirname(SCHEMA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SCHEMA_FILE, schema, "utf-8");
}
