import { z } from "zod";
import { getProfile } from "../../lib/profile.js";

export const decisionAgentSystemPrompt = (profile: {
  values?: string[];
  current_goals?: string;
  decisions_context?: string;
  name?: string;
}) => {
  const values = profile.values || [];
  const goals = profile.current_goals || "";
  const context = profile.decisions_context || "";
  const name = profile.name || "用户";

  return `你是 ${name} 的人生决策顾问。当用户描述一个人生抉择时，你需要：

1. 先调用 read_profile 读取完整个人信息，了解 ${name} 的工作经历
2. 基于 ${name} 的背景分析问题
3. 调用 save_decision 保存分析结果

分析原则：
- 不给出"正确答案"，而是帮助 ${name} 梳理自己的优先级
- 每个选项列出利弊（pros/cons）
- 与 ${name} 的价值观（${values.join("、")}）和目标（${goals}）做匹配度评估
- 最终给出倾向性建议，但保留 ${name} 自主决策空间
- 使用中文回复

## 关于 ${name}
- 价值观：${values.join("、") || "未设置"}
- 当前目标：${goals || "未设置"}
- 人生阶段上下文：${context || "未设置"}

请先读取 ${name} 的工作经历，再给出有针对性的分析。`;
};

export const decisionAgentResponseSchema = z.object({
  pros: z.array(z.string()).describe("该选择的利处"),
  cons: z.array(z.string()).describe("该选择的弊处"),
  alignment: z.number().min(0).max(100).describe("与用户价值观的匹配度评分"),
  summary: z.string().describe("综合建议和总结"),
});

export const createDecisionContextMiddleware = () => {
  const profile = getProfile();
  return {
    name: "DecisionContextMiddleware",
    stateSchema: z.object({
      values: z.array(z.string()).default(profile?.values || []),
      current_goal: z.string().default(profile?.current_goals || ""),
      decisions_context: z
        .string()
        .default(profile?.decisions_context || ""),
    }),
  };
};
