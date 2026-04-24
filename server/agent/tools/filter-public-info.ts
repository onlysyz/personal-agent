import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getPublicProfile } from "../../lib/profile.js";

export const filterPublicInfoTool = tool(
  async ({ query }: { query?: string }) => {
    const publicProfile = getPublicProfile();
    if (!publicProfile) {
      return "错误：profile.json 未找到";
    }
    if (query) {
      // Simple relevance filtering - return relevant sections
      const q = query.toLowerCase();
      const relevant: Record<string, unknown> = {};

      if (
        q.includes("技能") ||
        q.includes("技术") ||
        q.includes("擅长") ||
        q.includes("skill")
      ) {
        relevant.skills = publicProfile.skills;
      }
      if (
        q.includes("经历") ||
        q.includes("工作") ||
        q.includes("公司") ||
        q.includes("经验")
      ) {
        relevant.experiences = publicProfile.experiences;
      }
      if (
        q.includes("联系") ||
        q.includes("邮箱") ||
        q.includes("github")
      ) {
        relevant.contact = publicProfile.contact;
      }
      if (q.includes("介绍") || q.includes("背景")) {
        relevant.name = publicProfile.name;
        relevant.role = publicProfile.role;
        relevant.bio = publicProfile.bio;
      }

      return JSON.stringify(
        Object.keys(relevant).length > 0 ? relevant : publicProfile,
        null,
        2
      );
    }
    return JSON.stringify(publicProfile, null, 2);
  },
  {
    name: "filter_public_info",
    description:
      "获取用户公开可见的个人信息（已过滤 private 字段），用于回答访客问题。传入 query 可获取与问题相关的定向信息。",
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe(
          "访客的具体问题，用于定向提取相关信息（如：技能、工作经历等）"
        ),
    }),
  }
);
