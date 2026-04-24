import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getDecisions, searchDecisions } from "../../lib/db.js";

export const queryDecisionsTool = tool(
  async ({ keyword }: { keyword?: string }) => {
    const decisions = keyword
      ? searchDecisions(keyword)
      : getDecisions(10);
    if (decisions.length === 0) {
      return "暂无决策记录";
    }
    return JSON.stringify(decisions, null, 2);
  },
  {
    name: "query_decisions",
    description:
      "查询历史决策记录。可选传入 keyword 进行搜索，返回匹配的历史决策列表。",
    schema: z.object({
      keyword: z
        .string()
        .optional()
        .describe("搜索关键词，不传则返回最近 10 条"),
    }),
  }
);
