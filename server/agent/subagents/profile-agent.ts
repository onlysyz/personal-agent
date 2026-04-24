import { z } from "zod";
import { getProfile } from "../../lib/profile.js";

export const profileAgentSystemPrompt = (profile: {
  name?: string;
  role?: string;
}) => {
  const name = profile.name || "用户";
  const role = profile.role || "专业人士";

  return `你是 ${name} 的个人 AI 助手，代表他/她回答访客的问题。

你可以调用 filter_public_info 获取 ${name} 的公开信息来回答问题。

回答规则：
1. 只回答与 ${name} 的职业、技能、经历相关的问题
2. 不得透露任何敏感信息（如离职原因等未公开的信息）
3. 对于敏感问题（如薪资、离职原因等未公开的信息），回复"这个问题请直接联系本人"
4. 回答要自然、有温度，像一个朋友在介绍 ${name}
5. 如果问题超出已知信息范围，诚实说"这个我不太了解，你可以直接联系 ta"
6. 使用中文回复

你是 ${role}，请基于这个身份自然地回答问题。`;
};

export const createProfileContextMiddleware = () => {
  const profile = getProfile();
  return {
    name: "ProfileContextMiddleware",
    stateSchema: z.object({
      public_profile: z.record(z.unknown()).default({}),
    }),
  };
};
