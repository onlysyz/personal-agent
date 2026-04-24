import { ProfileData } from "../types";

const API_BASE = "/api";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  retryOnServerError?: boolean;
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<T> {
  const {
    retries = MAX_RETRIES,
    baseDelayMs = BASE_DELAY_MS,
    retryOnServerError = true,
  } = retryOptions;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, options);

      if (res.ok) {
        const json = await res.json();
        if (json.code === 0) return json.data;
        throw new Error(json.error || `API error: ${json.code}`);
      }

      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      if (res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        if (attempt < retries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        continue;
      }

      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      lastError = err as Error;
      if (attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Profile API
export async function fetchProfile(): Promise<ProfileData> {
  return fetchWithRetry(`${API_BASE}/profile`);
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  return fetchWithRetry(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

// Decisions API
export interface DecisionRecord {
  id: string;
  question: string;
  analysis: {
    pros: string[];
    cons: string[];
    alignment: number;
    summary: string;
  };
  created_at: string;
}

export async function fetchDecisions(): Promise<DecisionRecord[]> {
  return fetchWithRetry(`${API_BASE}/decisions`);
}

export async function fetchDecisionById(id: string): Promise<DecisionRecord> {
  return fetchWithRetry(`${API_BASE}/decisions/${id}`);
}

// Agent Chat API (SSE streaming)
export interface AgentStreamEvent {
  type: "token" | "end" | "error";
  content?: string;
  thread_id?: string;
  error?: string;
}

export interface StreamOptions {
  threadId?: string;
  mode?: "decision" | "profile" | "auto";
}

// SSE streaming via fetch POST (EventSource only supports GET)
export function streamAgentChat(
  message: string,
  options: StreamOptions = {}
): { stream: ReadableStream<AgentStreamEvent>; threadId: string } {
  const threadId = options.threadId || crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      // Use fetch with POST for SSE streaming
      fetch(`${API_BASE}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          thread_id: threadId,
          mode: options.mode || "auto",
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          function processChunk({ done, value }: { done: boolean; value?: Uint8Array }) {
            if (done) {
              controller.close();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6)) as AgentStreamEvent;
                  controller.enqueue(data);
                  if (data.type === "end" || data.type === "error") {
                    controller.close();
                    return;
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }

            reader!.read().then(processChunk);
          }

          reader!.read().then(processChunk);
        })
        .catch((err) => {
          controller.enqueue({ type: "error", error: err.message } as AgentStreamEvent);
          controller.close();
        });
    },
  });

  return { stream, threadId };
}

// Async wrapper for streamAgentChat (for use with async/await)
export async function chatWithAgent(
  message: string,
  options: StreamOptions = {}
): Promise<{ reply: string; threadId: string }> {
  const { stream, threadId } = streamAgentChat(message, options);
  const reader = stream.getReader();
  let reply = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || value.type === "end" || value.type === "error") break;
      if (value.type === "token" && value.content) {
        reply += value.content;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { reply, threadId };
}