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

export function streamAgentChat(
  message: string,
  options: StreamOptions = {}
): { stream: ReadableStream<AgentStreamEvent>; threadId: string } {
  const params = new URLSearchParams({ message });
  if (options.threadId) params.set("thread_id", options.threadId);
  if (options.mode) params.set("mode", options.mode);

  const threadId = options.threadId || crypto.randomUUID();
  params.set("thread_id", threadId);

  const stream = new ReadableStream({
    start(controller) {
      const eventSource = new EventSource(`${API_BASE}/agent?${params.toString()}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentStreamEvent;
          controller.enqueue(data);
          if (data.type === "end" || data.type === "error") {
            eventSource.close();
            controller.close();
          }
        } catch {
          // ignore parse errors
        }
      };

      eventSource.onerror = () => {
        controller.enqueue({ type: "error", error: "Connection failed" } as AgentStreamEvent);
        eventSource.close();
        controller.close();
      };
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