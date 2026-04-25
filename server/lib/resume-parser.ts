import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import type { ProfileData } from "./profile.js";

function createModel() {
  const modelStr = process.env.LLM_MODEL || "anthropic:claude-sonnet-4-5-20250929";
  const [provider, ...modelParts] = modelStr.split(":");
  const modelName = modelParts.join(":") || "claude-sonnet-4-5-20250929";

  if (provider === "openai") {
    return new ChatOpenAI({ model: modelName, temperature: 0 });
  }
  return new ChatAnthropic({ model: modelName, temperature: 0 });
}

const EXTRACTION_PROMPT = `你是一个简历解析助手。从以下简历文本中提取结构化的个人信息。

返回JSON格式（只返回JSON，不要其他内容）：
{
  "name": "姓名",
  "role": "职业头衔",
  "location": "所在城市",
  "email": "邮箱",
  "github": "GitHub地址",
  "bio": "个人简介",
  "skills": [{"name": "技能名", "value": 0.8, "color": "primary"}],
  "experiences": [{"company": "公司名", "period": "时间段", "role": "职位", "description": "工作描述", "visibility": "public"}]
}

简历文本：
{resumeText}

注意：
- skills的value是0-1之间的数字，表示技能熟练度
- experiences的visibility默认设为"public"
- 如果某项信息不存在或无法确定，该字段可以省略
- 只返回有效的JSON，不要任何markdown代码块标记`;

export async function extractProfileFromText(text: string): Promise<Partial<ProfileData>> {
  const model = createModel();
  const messages = [
    new HumanMessage(EXTRACTION_PROMPT.replace("{resumeText}", text))
  ];

  const response = await model.invoke(messages);
  const content = typeof response.content === "string"
    ? response.content
    : (response.content as { type: string; text: string }[])[0]?.text || "";

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse extracted JSON");
    }
  }
  return {};
}
