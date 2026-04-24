import { ProfileData } from "../types";

const API_BASE = "/api";

// Profile API
export async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch(`${API_BASE}/profile`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.error || "Failed to fetch profile");
  return json.data;
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.error || "Failed to save profile");
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
  const res = await fetch(`${API_BASE}/decisions`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.error || "Failed to fetch decisions");
  return json.data;
}

export async function fetchDecisionById(id: string): Promise<DecisionRecord> {
  const res = await fetch(`${API_BASE}/decisions/${id}`);
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.error || "Failed to fetch decision");
  return json.data;
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

            reader.read().then(processChunk);
          }

          reader.read().then(processChunk);
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