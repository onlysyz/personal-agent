import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";
import { createPersonalAgent } from "./agent/index.js";
import profileRouter from "./routes/profile.js";
import agentRouter from "./routes/agent.js";
import decisionsRouter from "./routes/decisions.js";
import settingsRouter from "./routes/settings.js";
import knowledgeRouter from "./routes/knowledge-base.js";

config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === "production";

const app = express();

// Middleware
app.use(cors({
  origin: IS_PROD ? false : "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Initialize Agent (lazy)
let agentReady = false;
try {
  createPersonalAgent();
  agentReady = true;
  console.log("✓ Personal Agent initialized");
} catch (err) {
  console.warn("⚠ Agent initialization failed:", err);
}

// API Routes
app.use("/api/profile", profileRouter);
app.use("/api/agent", agentRouter);
app.use("/api/decisions", decisionsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/knowledge", knowledgeRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: agentReady ? "ok" : "degraded", agent: agentReady });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  const status = err.name === "SyntaxError" && "body" in err ? 400 : 500;
  res.status(status).json({ code: status, error: status === 400 ? "Invalid JSON" : "Internal server error" });
});

// Serve static files in production
if (IS_PROD) {
  const distPath = path.join(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Mode: ${IS_PROD ? "production" : "development"}\n`);
});
