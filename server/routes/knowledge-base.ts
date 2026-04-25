// Knowledge Base API Routes - LLM Wiki Pattern
import { Router } from "express";
import multer from "multer";
import {
  ingestDocument,
  queryWiki,
  lintWiki,
  listRawDocuments,
  getDocument,
  removeDocument,
  getWikiStatus,
  updateTags,
  batchUpdateTags,
  getAllTags,
  getDocumentsByTag,
  removeTagFromAllDocuments,
  renameTag,
  getRawDocumentPath,
  readRawContent,
  getAllRawDocuments,
} from "../lib/knowledge-base/index.js";

const knowledgeRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

// GET /api/knowledge - Get knowledge base status
knowledgeRouter.get("/", (_req, res) => {
  try {
    const status = getWikiStatus();
    const tags = getAllTags();
    return res.json({ code: 0, data: { ...status, tags } });
  } catch (err) {
    console.error("Failed to get status:", err);
    return res.status(500).json({ code: 500, error: "Failed to get status" });
  }
});

// GET /api/knowledge/raw - List all raw documents
knowledgeRouter.get("/raw", (_req, res) => {
  try {
    const documents = listRawDocuments();
    // Don't expose rawPath in response
    const safeDocs = documents.map(({ rawPath, ...rest }) => rest);
    return res.json({ code: 0, data: safeDocs });
  } catch (err) {
    console.error("Failed to list documents:", err);
    return res.status(500).json({ code: 500, error: "Failed to list documents" });
  }
});

// GET /api/knowledge/raw/:id - Get raw document by ID
knowledgeRouter.get("/raw/:id", (req, res) => {
  try {
    const document = getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ code: 404, error: "Document not found" });
    }
    const { rawPath, ...safeDoc } = document;
    return res.json({ code: 0, data: safeDoc });
  } catch (err) {
    console.error("Failed to get document:", err);
    return res.status(500).json({ code: 500, error: "Failed to get document" });
  }
});

// GET /api/knowledge/raw/:id/content - Get raw document content
knowledgeRouter.get("/raw/:id/content", (req, res) => {
  try {
    const document = getDocument(req.params.id);
    if (!document) {
      return res.status(404).json({ code: 404, error: "Document not found" });
    }

    const filePath = getRawDocumentPath(req.params.id);
    if (!filePath) {
      return res.status(404).json({ code: 404, error: "File not found on disk" });
    }

    const content = readRawContent(filePath, document.mimeType);
    return res.json({
      code: 0,
      data: {
        id: document.id,
        filename: document.filename,
        mimeType: document.mimeType,
        content,
      },
    });
  } catch (err) {
    console.error("Failed to get document content:", err);
    return res.status(500).json({ code: 500, error: "Failed to get document content" });
  }
});

// GET /api/knowledge/raw/by-filename/:filename - Get raw document by filename
knowledgeRouter.get("/raw/by-filename/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const docs = getAllRawDocuments();
    const document = docs.find((d) => d.filename === filename);

    if (!document) {
      return res.status(404).json({ code: 404, error: "Document not found" });
    }

    const filePath = getRawDocumentPath(document.id);
    if (!filePath) {
      return res.status(404).json({ code: 404, error: "File not found on disk" });
    }

    const content = readRawContent(filePath, document.mimeType);
    return res.json({
      code: 0,
      data: {
        id: document.id,
        filename: document.filename,
        mimeType: document.mimeType,
        content,
      },
    });
  } catch (err) {
    console.error("Failed to get document by filename:", err);
    return res.status(500).json({ code: 500, error: "Failed to get document by filename" });
  }
});

// POST /api/knowledge/ingest - Upload and ingest a document
knowledgeRouter.post("/ingest", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, error: "No file uploaded" });
    }

    // Get tags from request body (optional)
    const tags = typeof req.body.tags === 'string'
      ? JSON.parse(req.body.tags)
      : Array.isArray(req.body.tags) ? req.body.tags : [];

    const result = await ingestDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      tags
    );

    return res.json({
      code: 0,
      data: {
        success: true,
        rawDocumentId: result.rawDocument.id,
        filename: result.rawDocument.filename,
        tags: result.rawDocument.tags,
        wikiPagesCreated: result.wikiPages.length,
        message: `Document ingested. Created ${result.wikiPages.length} wiki page(s).`,
      },
    });
  } catch (err) {
    console.error("Failed to ingest document:", err);
    return res.status(500).json({
      code: 500,
      error: err instanceof Error ? err.message : "Failed to ingest document",
    });
  }
});

// PUT /api/knowledge/tags/:id - Update tags for a document
knowledgeRouter.put("/tags/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      return res.status(400).json({ code: 400, error: "Tags must be an array" });
    }

    const success = updateTags(id, tags);
    if (!success) {
      return res.status(404).json({ code: 404, error: "Document not found" });
    }

    return res.json({
      code: 0,
      data: { success: true, id, tags },
    });
  } catch (err) {
    console.error("Failed to update tags:", err);
    return res.status(500).json({ code: 500, error: "Failed to update tags" });
  }
});

// PATCH /api/knowledge/tags/batch - Batch update tags for multiple documents
knowledgeRouter.patch("/tags/batch", (req, res) => {
  try {
    const { ids, tags } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, error: "ids must be a non-empty array" });
    }

    if (!Array.isArray(tags)) {
      return res.status(400).json({ code: 400, error: "tags must be an array" });
    }

    const result = batchUpdateTags(ids, tags);

    return res.json({
      code: 0,
      data: {
        success: true,
        updated: result.updated,
        failed: result.failed,
      },
    });
  } catch (err) {
    console.error("Failed to batch update tags:", err);
    return res.status(500).json({ code: 500, error: "Failed to batch update tags" });
  }
});

// GET /api/knowledge/tags - Get all unique tags with usage info
knowledgeRouter.get("/tags", (_req, res) => {
  try {
    const tags = getAllTags();
    // Get usage count for each tag
    const tagsWithUsage = tags.map((tag) => {
      const docs = getDocumentsByTag(tag);
      return { name: tag, inUse: docs.length > 0, documentCount: docs.length };
    });
    return res.json({ code: 0, data: tagsWithUsage });
  } catch (err) {
    console.error("Failed to get tags:", err);
    return res.status(500).json({ code: 500, error: "Failed to get tags" });
  }
});

// GET /api/knowledge/tags/:tag - Get documents with specific tag
knowledgeRouter.get("/tags/:tag", (req, res) => {
  try {
    const { tag } = req.params;
    const documents = getDocumentsByTag(tag);
    const safeDocs = documents.map(({ rawPath, ...rest }) => rest);
    return res.json({ code: 0, data: safeDocs });
  } catch (err) {
    console.error("Failed to get documents by tag:", err);
    return res.status(500).json({ code: 500, error: "Failed to get documents by tag" });
  }
});

// DELETE /api/knowledge/tags/:tag - Remove a tag from all documents
knowledgeRouter.delete("/tags/:tag", (req, res) => {
  try {
    const { tag } = req.params;
    const removedCount = removeTagFromAllDocuments(tag);
    return res.json({
      code: 0,
      data: {
        success: true,
        tag,
        removedFrom: removedCount,
      },
    });
  } catch (err) {
    console.error("Failed to delete tag:", err);
    return res.status(500).json({ code: 500, error: "Failed to delete tag" });
  }
});

// POST /api/knowledge/tags/:oldTag/rename - Rename a tag across all documents
knowledgeRouter.post("/tags/:oldTag/rename", (req, res) => {
  try {
    const { oldTag } = req.params;
    const { newTag } = req.body;

    if (!newTag || typeof newTag !== "string" || !newTag.trim()) {
      return res.status(400).json({ code: 400, error: "newTag is required" });
    }

    const renamedCount = renameTag(oldTag, newTag.trim());
    return res.json({
      code: 0,
      data: {
        success: true,
        oldTag,
        newTag: newTag.trim(),
        renamed: renamedCount,
      },
    });
  } catch (err) {
    console.error("Failed to rename tag:", err);
    return res.status(500).json({ code: 500, error: "Failed to rename tag" });
  }
});

// POST /api/knowledge/query - Query the wiki
knowledgeRouter.post("/query", async (req, res) => {
  try {
    const { question, tag } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ code: 400, error: "Question is required" });
    }

    const result = await queryWiki(question, tag);

    return res.json({
      code: 0,
      data: {
        question,
        answer: result.answer,
        pagesCount: result.pages.length,
        chunksFound: result.chunksFound,
        citations: result.citations,
        sources: result.sources,
        filteredByTag: result.filteredByTag,
      },
    });
  } catch (err) {
    console.error("Failed to query:", err);
    return res.status(500).json({ code: 500, error: "Failed to query wiki" });
  }
});

// POST /api/knowledge/lint - Run wiki lint
knowledgeRouter.post("/lint", async (req, res) => {
  try {
    const result = await lintWiki();

    return res.json({
      code: 0,
      data: {
        success: true,
        ...result,
      },
    });
  } catch (err) {
    console.error("Failed to lint:", err);
    return res.status(500).json({ code: 500, error: "Failed to lint wiki" });
  }
});

// DELETE /api/knowledge/raw/:id - Delete a raw document
knowledgeRouter.delete("/raw/:id", (req, res) => {
  try {
    const success = removeDocument(req.params.id);
    if (!success) {
      return res.status(404).json({ code: 404, error: "Document not found" });
    }
    return res.json({
      code: 0,
      data: { success: true, message: "Document deleted" },
    });
  } catch (err) {
    console.error("Failed to delete:", err);
    return res.status(500).json({ code: 500, error: "Failed to delete document" });
  }
});

export default knowledgeRouter;
