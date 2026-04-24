import { Router } from "express";
import { createPersonalAgent, getDecisionSystemPrompt, getProfileSystemPrompt } from "../agent/index.js";
import { getProfile } from "../lib/profile.js";
import { getPublicProfile } from "../lib/profile.js";
import { saveDecision } from "../lib/db.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const agentRouter = Router();

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  thread_id: z.string().optional(),
  mode: z.enum(["decision", "profile", "auto"]).default("auto"),
});

// Simple chat completion without full Agent graph (for MVP)
async function chatWithLLM(
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  try {
    const agent = createPersonalAgent();
    const model = (agent as unknown as { model: unknown }).model;

    const response = await (model as { invoke: (args: unknown) => Promise<unknown> }).invoke({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    });

    return (response as { content: string }).content || "抱歉，我无法处理这个请求。";
  } catch (err) {
    console.error("LLM error:", err);
    throw err;
  }
}

agentRouter.post("/", async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 400, error: "Invalid request" });
    }

    const { message, mode } = parsed.data;
    const profile = getProfile();
    const publicProfile = getPublicProfile();
    const profileName = profile?.name || "用户";

    // Detect mode based on content if auto
    let activeMode = mode;
    if (mode === "auto") {
      if (
        message.includes("跳槽") ||
        message.includes("选择") ||
        message.includes("辞职") ||
        message.includes("创业") ||
        message.includes("offer") ||
        message.includes("工作机会") ||
        message.includes("要不要")
      ) {
        activeMode = "decision";
      } else {
        activeMode = "profile";
      }
    }

    let reply: string;

    if (activeMode === "decision") {
      // Decision mode - structured analysis
      const systemPrompt = getDecisionSystemPrompt();
      const userMessage = `${message}\n\n请给出结构化分析，包含 pros、cons、alignment 评分和 summary。`;

      reply = await chatWithLLM([{ role: "user", content: userMessage }], systemPrompt);

      // Try to extract and save structured analysis
      try {
        const match = reply.match(/\{[\s\S]*?\}/);
        if (match) {
          const analysis = JSON.parse(match[0]);
          saveDecision(uuidv4(), message, analysis);
        }
      } catch {
        // If structured extraction fails, save as text
        try {
          saveDecision(uuidv4(), message, {
            pros: [],
            cons: [],
            alignment: 50,
            summary: reply,
          });
        } catch {
          // ignore save errors
        }
      }
    } else {
      // Profile mode - conversational Q&A
      const systemPrompt = `${getProfileSystemPrompt()}

以下是可用的公开信息：
${JSON.stringify(publicProfile, null, 2)}

请基于以上信息回答访客的问题。如果问题超出范围，请礼貌说明。`;

      reply = await chatWithLLM([{ role: "user", content: message }], systemPrompt);
    }

    const threadId = parsed.data.thread_id || uuidv4();

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send as SSE
    res.write(`data: ${JSON.stringify({ type: "token", content: reply })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "end", thread_id: threadId })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Agent error:", err);
    next(err);
  }
});

export default agentRouter;
