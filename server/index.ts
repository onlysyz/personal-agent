import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";
import { createPersonalAgent } from "./agent/index.js";
import profileRouter from "./routes/profile.js";
import agentRouter from "./routes/agent.js";
import decisionsRouter from "./routes/decisions.js";

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

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: agentReady ? "ok" : "degraded", agent: agentReady });
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
