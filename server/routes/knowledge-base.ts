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
    return res.json({ code: 0, data: status });
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

// POST /api/knowledge/ingest - Upload and ingest a document
knowledgeRouter.post("/ingest", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, error: "No file uploaded" });
    }

    const result = await ingestDocument(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.json({
      code: 0,
      data: {
        success: true,
        rawDocumentId: result.rawDocument.id,
        filename: result.rawDocument.filename,
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

// POST /api/knowledge/query - Query the wiki
knowledgeRouter.post("/query", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({ code: 400, error: "Question is required" });
    }

    const result = await queryWiki(question);

    return res.json({
      code: 0,
      data: {
        question,
        answer: result.answer,
        pagesCount: result.pages.length,
        citations: result.citations,
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
