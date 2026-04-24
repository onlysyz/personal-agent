import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { saveDecision } from "../../lib/db.js";
import { v4 as uuidv4 } from "uuid";

export const saveDecisionTool = tool(
  async ({
    question,
    analysis,
  }: {
    question: string;
    analysis: string;
  }) => {
    const id = uuidv4();
    let parsed;
    try {
      parsed = JSON.parse(analysis);
    } catch {
      parsed = {
        pros: [],
        cons: [],
        alignment: 0,
        summary: analysis,
      };
    }
    saveDecision(id, question, parsed);
    return `决策已保存，ID: ${id}`;
  },
  {
    name: "save_decision",
    description:
      "保存一次决策分析结果，供未来回顾。分析结果应为包含 pros、cons、alignment、summary 的 JSON 字符串。",
    schema: z.object({
      question: z.string().describe("用户的抉择问题"),
      analysis: z.string().describe("AI 的完整分析（JSON 字符串）"),
    }),
  }
);
