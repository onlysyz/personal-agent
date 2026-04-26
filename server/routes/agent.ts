import { Router } from "express";
import { createPersonalAgent } from "../agent/index.js";
import { getProfile, getPublicProfile } from "../lib/profile.js";
import { saveDecision, saveMessage, getConversation, clearConversation } from "../lib/db.js";
import { getServerConfig } from "../lib/config.js";
import { queryWiki } from "../lib/knowledge-base/index.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";

const agentRouter = Router();

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  thread_id: z.string().optional(),
  mode: z.enum(["decision", "profile", "auto", "onboarding"]).default("auto"),
});

// Create configured model from server config (not env)
async function createModel() {
  const config = getServerConfig();
  const { provider, model: modelName, apiKey, baseUrl } = config;
  const timeout = 30000;

  if (provider === "ollama") {
    const { ChatOpenAI } = await import("@langchain/openai");
    return new ChatOpenAI({
      model: modelName || "llama3.2",
      temperature: 0,
      streaming: true,
      openAIApiKey: "ollama",
      configuration: {
        baseURL: baseUrl || "http://localhost:11434/v1",
      },
      timeout,
    });
  }

  if (provider === "anthropic") {
    const { ChatAnthropic } = await import("@langchain/anthropic");
    return new ChatAnthropic({
      model: modelName || "claude-sonnet-4-5-20250929",
      temperature: 0,
      streaming: true,
      anthropicApiKey: apiKey,
      topP: 0.9,
      timeout,
    });
  }

  // openai or default
  const { ChatOpenAI } = await import("@langchain/openai");
  return new ChatOpenAI({
    model: modelName || "gpt-4o",
    temperature: 0,
    streaming: true,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: baseUrl || undefined,
    },
    timeout,
  });
}

// Extract text content from AI message
function extractText(response: AIMessage): string {
  if (typeof response.content === 'string') {
    return response.content;
  }
  const textBlocks = (response.content as unknown as { type: string; text: string }[])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  return textBlocks || "";
}

// Parse JSON from markdown code blocks
function extractJsonAnalysis(text: string): Record<string, unknown> | null {
  try {
    const startMarker = "```json";
    const endMarker = "```";
    const startIdx = text.indexOf(startMarker);
    if (startIdx !== -1) {
      const contentStart = startIdx + startMarker.length;
      const endIdx = text.indexOf(endMarker, contentStart);
      if (endIdx !== -1) {
        return JSON.parse(text.slice(contentStart, endIdx).trim());
      }
    }
  } catch {
    // JSON parsing failed
  }
  return null;
}

// Flatten complex nested structure into string array
function flattenToStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.flatMap(item => flattenToStringArray(item));
  }
  if (typeof val === 'string') {
    return [val];
  }
  if (typeof val === 'object' && val !== null) {
    return Object.values(val).flatMap(v => flattenToStringArray(v));
  }
  return [];
}

// Extract alignment number from various formats
function extractAlignment(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  if (typeof val === 'object' && val !== null) {
    const numbers = extractNumbersRecursive(val);
    if (numbers.length > 0) {
      return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
    }
  }
  return 50;
}

// Recursively extract all numbers from a nested object/array
function extractNumbersRecursive(val: unknown): number[] {
  if (typeof val === 'number') return [val];
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    return match ? [parseInt(match[0], 10)] : [];
  }
  if (Array.isArray(val)) {
    return val.flatMap(extractNumbersRecursive);
  }
  if (typeof val === 'object' && val !== null) {
    return Object.values(val).flatMap(extractNumbersRecursive);
  }
  return [];
}

// Streaming chat with DeepAgents integration
async function streamWithAgent(
  res: import("express").Response,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  mode: "decision" | "profile",
  threadId: string,
  title?: string
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get profile for context
      const profile = getProfile();
      const publicProfile = getPublicProfile();
      const profileName = profile?.name || "用户";

      // Get knowledge context from wiki
      const userQuestion = messages.length > 0 ? messages[messages.length - 1].content : "";
      let knowledgeContext = "";
      let knowledgeSources: string[] = [];
      let knowledgeCitations: string[] = [];
      if (userQuestion) {
        try {
          const queryResult = await queryWiki(userQuestion);
          knowledgeSources = queryResult.sources;
          knowledgeCitations = queryResult.citations;
          // Use pages if available (keyword fallback), otherwise use answer (semantic search)
          if (queryResult.pages.length > 0) {
            knowledgeContext = queryResult.pages
              .map(p => `## ${p.title}\n\n${p.content}`)
              .join("\n\n---\n\n");
          } else if (queryResult.chunksFound > 0 && queryResult.answer) {
            // Semantic search returned results but pages is empty - extract context from answer
            const match = queryResult.answer.match(/Based on the knowledge base:\s*\n*\s*(.+)/s);
            knowledgeContext = match ? match[1] : queryResult.answer;
          }
        } catch (e) {
          console.warn("Knowledge query failed:", e);
        }
      }

      // Build context based on mode
      let contextPrompt = "";
      if (mode === "decision") {
        const values = profile?.values || ["自主性", "持续学习"];
        const goals = profile?.current_goals || "";
        contextPrompt = `你是 ${profileName} 的人生决策顾问。当用户描述一个人生抉择时，你需要：

1. 读取 ${profileName} 的个人信息（如有提供）
2. 基于 ${profileName} 的背景分析问题
3. 给出结构化分析

分析原则：
- 不给出"正确答案"，而是帮助 ${profileName} 梳理自己的优先级
- 每个选项列出利弊（pros/cons）
- 与 ${profileName} 的价值观（${values.join("、")}）和目标（${goals}）做匹配度评估
- 最终给出倾向性建议，但保留 ${profileName} 自主决策空间
- 使用中文回复

## 关于 ${profileName}
- 价值观：${values.join("、") || "未设置"}
- 当前目标：${goals || "未设置"}

请分析以下问题，给出结构化分析（包含 pros、cons、alignment 评分 0-100 和 summary），以 JSON 格式返回：
{"pros": [], "cons": [], "alignment": 数字, "summary": "总结"}`;
      } else {
        contextPrompt = `你是 ${profileName} 的个人助手。以下是公开信息：
${JSON.stringify(publicProfile, null, 2)}

请基于以上信息回答问题，使用中文。`;
      }

      // Create model with streaming
      const model = await createModel();

      // Convert to LangChain messages
      const sourcesSection = knowledgeSources.length > 0
        ? `\n\n---\n**参考来源**: ${knowledgeSources.join(", ")}`
        : "";
      const knowledgeSection = knowledgeContext
        ? `\n\n## 知识库上下文\n\n${knowledgeContext}${sourcesSection}`
        : "";
      const langchainMessages = [
        new SystemMessage(systemPrompt + "\n\n" + contextPrompt + knowledgeSection),
        ...messages.map((m) => m.role === "user"
          ? new HumanMessage(m.content)
          : new AIMessage(m.content)
        ),
      ];

      // Full response accumulator for decision mode
      let fullResponse = "";

      // Send sources event if knowledge was found
      if (knowledgeSources.length > 0) {
        res.write(`data: ${JSON.stringify({ type: "sources", sources: knowledgeSources, citations: knowledgeCitations })}\n\n`);
      }

      // Stream the response
      const stream = await model.stream(langchainMessages);

      for await (const chunk of stream) {
        const chunkText = extractText(chunk as AIMessage);
        if (chunkText) {
          fullResponse += chunkText;
          // Send each chunk via SSE
          res.write(`data: ${JSON.stringify({ type: "token", content: chunkText })}\n\n`);
        }
      }

      // Save user message to conversation history
      try {
        saveMessage(threadId, "user", messages[messages.length - 1].content, mode, title);
      } catch (e) {
        console.warn("Failed to save user message:", e);
      }

      // For decision mode, parse and save the structured analysis
      if (mode === "decision" && fullResponse) {
        const analysis = extractJsonAnalysis(fullResponse);
        if (analysis) {
          const pros = flattenToStringArray(analysis.pros);
          const cons = flattenToStringArray(analysis.cons);
          const alignment = extractAlignment(analysis.alignment);
          const summary = typeof analysis.summary === 'string' ? analysis.summary : fullResponse;

          try {
            saveDecision(uuidv4(), messages[messages.length - 1].content, {
              pros,
              cons,
              alignment,
              summary,
            });
          } catch (e) {
            console.error("Failed to save decision:", e);
          }
        }
      }

      // Save assistant response to conversation history
      try {
        saveMessage(threadId, "assistant", fullResponse, mode);
      } catch (e) {
        console.warn("Failed to save assistant message:", e);
      }

      return fullResponse;
    } catch (err) {
      console.error("Streaming error:", err);
      throw err;
    }
  });
}

agentRouter.post("/", async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 400, error: "Invalid request" });
    }

    const { message, mode } = parsed.data;

    // Handle onboarding mode separately
    if (mode === "onboarding") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const onboardingPrompt = `你是用户的个人资料收集助手。通过友好的对话帮助用户建立个人信息档案。

对话规则：
- 每次只问一个问题
- 使用中文对话
- 问题要自然、友好
- 如果用户回答不完整，可以适当追问
- 用户回答后说"好的，记下了"再问下一个
- 不要透露任何敏感信息

当前用户已经提供了以下信息：
{collected_info}

请根据用户刚才的回答，继续问下一个问题。`;

      const model = await createModel();
      const langchainMessages = [
        new SystemMessage(onboardingPrompt),
        new HumanMessage(message),
      ];

      const stream = await model.stream(langchainMessages);
      let fullResponse = "";

      for await (const chunk of stream) {
        const chunkText = extractText(chunk as AIMessage);
        if (chunkText) {
          fullResponse += chunkText;
          res.write(`data: ${JSON.stringify({ type: "token", content: chunkText })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: "end", thread_id: parsed.data.thread_id || uuidv4() })}\n\n`);
      res.end();
      return;
    }

    // Detect mode based on content if auto
    let activeMode: "decision" | "profile" = "profile";
    if (mode === "auto") {
      if (
        message.includes("跳槽") ||
        message.includes("选择") ||
        message.includes("辞职") ||
        message.includes("创业") ||
        message.includes("offer") ||
        message.includes("工作机会") ||
        message.includes("要不要") ||
        message.includes("应该") ||
        message.includes("分析")
      ) {
        activeMode = "decision";
      }
    } else {
      activeMode = mode;
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const threadId = parsed.data.thread_id || uuidv4();

    // Get conversation history for thread
    const history = getConversation(threadId);
    const historyMessages = history.map(h => ({ role: h.role, content: h.content }));

    // Generate title from first message if new conversation
    const isNewConversation = history.length === 0;
    const title = isNewConversation
      ? message.slice(0, 50) + (message.length > 50 ? "..." : "")
      : undefined;

    // Get agent's system prompt
    const agent = createPersonalAgent();
    const agentConfig = (agent as unknown as { config: { configurable: { systemPrompt: string } } }).config;
    const systemPrompt = agentConfig?.configurable?.systemPrompt || "你是用户的AI助手。";

    // Build messages with history + current message
    const allMessages = [...historyMessages, { role: "user", content: message }];

    // Stream with agent
    await streamWithAgent(res, allMessages, systemPrompt, activeMode, threadId, title);

    // Send end event
    res.write(`data: ${JSON.stringify({ type: "end", thread_id: threadId })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Agent error:", err);
    next(err);
  }
});

// GET /api/agent/conversation/:threadId - Get conversation history
agentRouter.get("/conversation/:threadId", (req, res) => {
  try {
    const { threadId } = req.params;
    const messages = getConversation(threadId);
    return res.json({ code: 0, data: messages });
  } catch (err) {
    console.error("Failed to get conversation:", err);
    return res.status(500).json({ code: 500, error: "Failed to get conversation" });
  }
});

// DELETE /api/agent/conversation/:threadId - Clear conversation history
agentRouter.delete("/conversation/:threadId", (req, res) => {
  try {
    const { threadId } = req.params;
    clearConversation(threadId);
    return res.json({ code: 0, data: { success: true } });
  } catch (err) {
    console.error("Failed to clear conversation:", err);
    return res.status(500).json({ code: 500, error: "Failed to clear conversation" });
  }
});

export default agentRouter;
