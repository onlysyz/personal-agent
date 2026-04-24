import { Router } from "express";
import { createPersonalAgent } from "../agent/index.js";
import { getProfile } from "../lib/profile.js";
import { getPublicProfile } from "../lib/profile.js";
import { saveDecision } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";

const agentRouter = Router();

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  thread_id: z.string().optional(),
  mode: z.enum(["decision", "profile", "auto"]).default("auto"),
});

// Create configured model from env
async function createModel() {
  const modelStr = process.env.LLM_MODEL || "anthropic:claude-sonnet-4-5-20250929";
  const [provider, ...modelParts] = modelStr.split(":");
  const modelName = modelParts.join(":") || "claude-sonnet-4-5-20250929";

  if (provider === "openai") {
    const { ChatOpenAI } = await import("@langchain/openai");
    return new ChatOpenAI({ model: modelName, temperature: 0, streaming: true });
  }
  const { ChatAnthropic } = await import("@langchain/anthropic");
  return new ChatAnthropic({ model: modelName, temperature: 0, streaming: true });
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
    const result: string[] = [];
    for (const item of val) {
      if (typeof item === 'string') result.push(item);
      else if (typeof item === 'object' && item !== null) {
        result.push(...flattenToStringArray(Object.values(item)));
      }
    }
    return result;
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
    const values = Object.values(val).filter((v) => typeof v === 'number');
    if (values.length > 0) return Math.round(values.reduce((a, b) => a + (b as number), 0) / values.length);
  }
  return 50;
}

// Streaming chat with DeepAgents integration
async function streamWithAgent(
  res: import("express").Response,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  mode: "decision" | "profile"
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // Get profile for context
      const profile = getProfile();
      const publicProfile = getPublicProfile();
      const profileName = profile?.name || "用户";

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
      const langchainMessages = [
        new SystemMessage(systemPrompt + "\n\n" + contextPrompt),
        ...messages.map((m) => new HumanMessage(m.content)),
      ];

      // Full response accumulator for decision mode
      let fullResponse = "";

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

      resolve();
    } catch (err) {
      console.error("Streaming error:", err);
      reject(err);
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

    // Get agent's system prompt
    const agent = createPersonalAgent();
    const agentConfig = (agent as unknown as { config: { configurable: { systemPrompt: string } } }).config;
    const systemPrompt = agentConfig?.configurable?.systemPrompt || "你是用户的AI助手。";

    // Stream with agent
    await streamWithAgent(res, [{ role: "user", content: message }], systemPrompt, activeMode);

    // Send end event
    res.write(`data: ${JSON.stringify({ type: "end", thread_id: threadId })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Agent error:", err);
    next(err);
  }
});

export default agentRouter;
