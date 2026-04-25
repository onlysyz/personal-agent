import { createDeepAgent } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getProfile, generateAgentsMd } from "../lib/profile.js";
import { getServerConfig } from "../lib/config.js";
import {
  readProfileTool,
  saveDecisionTool,
  queryDecisionsTool,
  filterPublicInfoTool,
} from "./tools/index.js";
import {
  decisionAgentSystemPrompt,
  profileAgentSystemPrompt,
} from "./subagents/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface PersonalAgentConfig {
  llmModel?: string;
}

let agentInstance: ReturnType<typeof createDeepAgent> | null = null;

function parseLlmModel(modelStr: string): { provider: string; model: string } {
  const [provider, ...modelParts] = modelStr.split(":");
  return {
    provider: provider || "anthropic",
    model: modelParts.join(":") || "claude-sonnet-4-5-20250929",
  };
}

function createModel() {
  const config = getServerConfig();
  const { provider, model: modelName, apiKey, baseUrl } = config;
  const timeout = 30000;

  if (provider === "ollama") {
    return new ChatOpenAI({
      model: modelName || "llama3.2",
      temperature: 0,
      openAIApiKey: "ollama",
      configuration: {
        baseURL: baseUrl || "http://localhost:11434/v1",
      },
      timeout,
    });
  }

  if (provider === "anthropic") {
    return new ChatAnthropic({
      model: modelName || "claude-sonnet-4-5-20250929",
      temperature: 0,
      anthropicApiKey: apiKey,
      topP: 0.9,
      timeout,
    });
  }

  // openai or default
  return new ChatOpenAI({
    model: modelName || "gpt-4o",
    temperature: 0,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: baseUrl || undefined,
    },
    timeout,
  });
}

export function createPersonalAgent(_config?: PersonalAgentConfig) {
  // Don't cache agent - always use current config from settings
  const profile = getProfile();
  const profileName = profile?.name || "用户";

  // Ensure AGENTS.md exists for Agent memory
  const agentsMdPath = path.join(__dirname, "../../data/AGENTS.md");
  if (profile && !fs.existsSync(agentsMdPath)) {
    const agentsMd = generateAgentsMd(profile);
    const dir = path.dirname(agentsMdPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(agentsMdPath, agentsMd, "utf-8");
  }

  // Build tools
  const tools = [readProfileTool, saveDecisionTool, queryDecisionsTool, filterPublicInfoTool];

  const systemPrompt = `你是 ${profileName} 的私人 AI 助手。

你的职责：
1. 帮助 ${profileName} 分析人生抉择，回答关于 ${profileName} 个人信息的任何问题
2. 使用 read_profile 读取 ${profileName} 的个人信息来回答问题
3. 使用 save_decision 保存 ${profileName} 的重要决策分析
4. 使用 query_decisions 查询 ${profileName} 的历史决策

回答规则：
- 对于人生抉择问题：先读取个人信息，结合价值观和目标给出分析，最后保存决策
- 对于关于 ${profileName} 的问题：调用 filter_public_info 获取公开信息回答
- 不得透露任何敏感信息
- 使用中文回复`;

  const checkpointer = new MemorySaver();

  agentInstance = createDeepAgent({
    model: createModel(),
    systemPrompt,
    tools,
    checkpointer,
    name: "PersonalAgent",
  });

  return agentInstance;
}

export function getDecisionSystemPrompt(): string {
  const profile = getProfile();
  return decisionAgentSystemPrompt({
    values: profile?.values,
    current_goals: profile?.current_goals,
    decisions_context: profile?.decisions_context,
    name: profile?.name,
  });
}

export function getProfileSystemPrompt(): string {
  const profile = getProfile();
  return profileAgentSystemPrompt({ name: profile?.name, role: profile?.role });
}
