// Raw Sources Storage - Layer 1 of LLM Wiki Pattern
// Raw documents are immutable - never modified after upload

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { RawDocument } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "../../../data/knowledge/raw");
const METADATA_FILE = path.join(__dirname, "../../../data/knowledge/raw-meta.json");

// Ensure raw directory exists
function ensureRawDir() {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
  }
}

// Load metadata from JSON
function loadMetadata(): RawDocument[] {
  ensureRawDir();
  if (!fs.existsSync(METADATA_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(METADATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Save metadata
function saveMetadata(documents: RawDocument[]) {
  ensureRawDir();
  fs.writeFileSync(METADATA_FILE, JSON.stringify(documents, null, 2), "utf-8");
}

// Save uploaded raw file
export async function saveRawFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  tags: string[] = []
): Promise<RawDocument> {
  ensureRawDir();

  const id = uuidv4();
  const ext = path.extname(filename);
  const storedFilename = `${id}${ext}`;
  const filePath = path.join(RAW_DIR, storedFilename);

  // Write file to disk
  fs.writeFileSync(filePath, buffer);

  const document: RawDocument = {
    id,
    filename,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
    rawPath: filePath,
    tags: tags, // Tags passed during upload
  };

  // Update metadata
  const documents = loadMetadata();
  documents.push(document);
  saveMetadata(documents);

  return document;
}

// Get all raw documents
export function getAllRawDocuments(): RawDocument[] {
  return loadMetadata();
}

// Get raw document by ID
export function getRawDocumentById(id: string): RawDocument | undefined {
  const documents = loadMetadata();
  return documents.find((d) => d.id === id);
}

// Get file path for raw document
export function getRawDocumentPath(id: string): string | undefined {
  const doc = getRawDocumentById(id);
  if (!doc) return undefined;
  return fs.existsSync(doc.rawPath) ? doc.rawPath : undefined;
}

// Read raw file content
export function readRawContent(filePath: string, mimeType: string): string {
  const buffer = fs.readFileSync(filePath);

  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    return buffer.toString("utf-8");
  }

  if (mimeType === "application/pdf") {
    return buffer.toString("base64"); // Return base64 for PDF processing
  }

  // For unsupported types
  try {
    return buffer.toString("utf-8");
  } catch {
    return "";
  }
}

// Update document tags
export function updateDocumentTags(id: string, tags: string[]): RawDocument | undefined {
  const documents = loadMetadata();
  const doc = documents.find((d) => d.id === id);
  if (!doc) return undefined;

  doc.tags = tags;
  saveMetadata(documents);
  return doc;
}

// Delete raw document (only removes file, keeps metadata for audit)
export function deleteRawDocument(id: string): boolean {
  const documents = loadMetadata();
  const index = documents.findIndex((d) => d.id === id);

  if (index === -1) return false;

  const doc = documents[index];

  // Delete file if exists
  if (fs.existsSync(doc.rawPath)) {
    fs.unlinkSync(doc.rawPath);
  }

  // Remove from metadata
  documents.splice(index, 1);
  saveMetadata(documents);

  return true;
}

// Get total raw documents count
export function getRawDocumentCount(): number {
  return loadMetadata().length;
}