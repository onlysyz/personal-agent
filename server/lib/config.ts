import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerConfig {
  provider: "anthropic" | "openai" | "ollama";
  apiKey: string;
  baseUrl: string;
  model: string;
}

const CONFIG_PATH = path.join(__dirname, "../../data/config.json");

const DEFAULT_CONFIG: ServerConfig = {
  provider: "anthropic",
  apiKey: "",
  baseUrl: "",
  model: "claude-sonnet-4-5-20250929",
};

export function getServerConfig(): ServerConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    // Try to read from environment variables as fallback
    const envConfig: ServerConfig = {
      provider: getProviderFromEnv(),
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || "",
      baseUrl: process.env.OLLAMA_BASE_URL || "",
      model: getModelFromEnv(),
    };
    return envConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveServerConfig(config: Partial<ServerConfig>): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const current = getServerConfig();
  const merged = { ...current, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), "utf-8");
}

function getProviderFromEnv(): "anthropic" | "openai" | "ollama" {
  const model = process.env.LLM_MODEL || "";
  if (model.startsWith("ollama:")) return "ollama";
  if (model.startsWith("openai:")) return "openai";
  return "anthropic";
}

function getModelFromEnv(): string {
  const model = process.env.LLM_MODEL || "anthropic:claude-sonnet-4-5-20250929";
  const parts = model.split(":");
  return parts.length > 1 ? parts.slice(1).join(":") : model;
}
