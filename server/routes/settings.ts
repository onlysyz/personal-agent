import { Router } from "express";
import { getServerConfig, saveServerConfig, ServerConfig } from "../lib/config.js";

const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  const config = getServerConfig();
  // Mask the API key for security (only show last 4 chars)
  const safeConfig = {
    ...config,
    apiKey: config.apiKey ? "***" + config.apiKey.slice(-4) : "",
  };
  return res.json({ code: 0, data: safeConfig });
});

// Test API connection
settingsRouter.post("/test", async (req, res) => {
  const { apiKey, baseUrl, model, provider } = req.body;

  if (!model) {
    return res.status(400).json({ code: 400, error: "Model is required" });
  }

  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    const { ChatAnthropic } = await import("@langchain/anthropic");

    let resolvedProvider = provider;
    if (!resolvedProvider && baseUrl) {
      if (baseUrl.includes("ollama")) {
        resolvedProvider = "ollama";
      } else if (baseUrl.includes("minimaxi")) {
        // MiniMax uses Anthropic-compatible API
        resolvedProvider = "anthropic";
      } else if (baseUrl.includes("anthropic") || baseUrl.includes("claude")) {
        resolvedProvider = "anthropic";
      } else {
        resolvedProvider = "openai";
      }
    }

    let chatModel;
    const timeout = 30000; // 30 second timeout

    if (resolvedProvider === "ollama") {
      chatModel = new ChatOpenAI({
        model,
        temperature: 0.7,
        openAIApiKey: "ollama",
        configuration: {
          baseURL: baseUrl || "http://localhost:11434/v1",
        },
        timeout,
      });
    } else if (resolvedProvider === "anthropic") {
      chatModel = new ChatAnthropic({
        model,
        temperature: 0.7,
        anthropicApiKey: apiKey,
        topP: 0.9,
        timeout,
      });
    } else {
      chatModel = new ChatOpenAI({
        model,
        temperature: 0.7,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: baseUrl || undefined,
        },
        timeout,
      });
    }

    // Simple test - just check if the model exists
    await chatModel.invoke(["Hi"]);
    return res.json({ code: 0, data: { success: true, message: "Connection successful!" } });
  } catch (err) {
    console.error("Connection test failed:", err);
    const errorMessage = err instanceof Error ? err.message : "Connection failed";
    // Extract more useful info from common errors
    let detailMessage = errorMessage;
    if (errorMessage.includes("403")) {
      detailMessage = "403 Forbidden - Invalid API key or access denied";
    } else if (errorMessage.includes("401")) {
      detailMessage = "401 Unauthorized - Check your API key";
    } else if (errorMessage.includes("404")) {
      detailMessage = "404 Not Found - Check base URL or model name";
    } else if (errorMessage.includes("timeout")) {
      detailMessage = "Request timeout - Check base URL";
    }
    return res.status(200).json({ code: 0, data: { success: false, message: detailMessage } });
  }
});

settingsRouter.put("/", (req, res) => {
  const { provider, apiKey, baseUrl, model } = req.body;

  if (!model) {
    return res.status(400).json({ code: 400, error: "Model is required" });
  }

  // Detect provider from baseUrl if not provided
  let detectedProvider = provider;
  if (!detectedProvider && baseUrl) {
    if (baseUrl.includes("ollama")) {
      detectedProvider = "ollama";
    } else if (baseUrl.includes("minimaxi")) {
      // MiniMax uses Anthropic-compatible API
      detectedProvider = "anthropic";
    } else if (baseUrl.includes("anthropic") || baseUrl.includes("claude")) {
      detectedProvider = "anthropic";
    } else {
      detectedProvider = "openai";
    }
  }

  const configUpdate: Partial<ServerConfig> = {
    provider: detectedProvider as "anthropic" | "openai" | "ollama",
    model,
  };

  // Only update apiKey if it's not masked (doesn't start with ***)
  if (apiKey && !apiKey.startsWith("***")) {
    configUpdate.apiKey = apiKey;
  }

  if (baseUrl !== undefined) {
    configUpdate.baseUrl = baseUrl;
  }

  try {
    saveServerConfig(configUpdate);
    return res.json({ code: 0, data: { message: "Settings saved. Restarting agent..." } });
  } catch (err) {
    console.error("Failed to save settings:", err);
    return res.status(500).json({ code: 500, error: "Failed to save settings" });
  }
});

export default settingsRouter;
