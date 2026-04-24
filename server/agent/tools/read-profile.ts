import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getProfile } from "../../lib/profile.js";

export const readProfileTool = tool(
  async ({ section }: { section?: string }) => {
    const profile = getProfile();
    if (!profile) {
      return "错误：profile.json 未找到，请先编辑 data/profile.json";
    }
    if (section && profile) {
      const sectionData = (profile as unknown as Record<string, unknown>)[section];
      if (sectionData === undefined) {
        return `错误：未找到 section "${section}"`;
      }
      return JSON.stringify(sectionData, null, 2);
    }
    return JSON.stringify(profile, null, 2);
  },
  {
    name: "read_profile",
    description:
      "读取用户的个人信息。可指定 section 参数读取特定部分：basic（基本信息）、experiences（工作经历）、skills（技能）、values（价值观）、current_goals（当前目标）、decisions_context（决策上下文）。无参数时返回全部信息。",
    schema: z.object({
      section: z
        .string()
        .optional()
        .describe("要读取的 section 名称，如 basic/experiences/skills 等"),
    }),
  }
);
