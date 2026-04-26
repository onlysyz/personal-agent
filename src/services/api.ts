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
export async function fetchProfile(): Promise<ProfileData | null> {
  return fetchWithRetry(`${API_BASE}/profile`);
}

export async function saveProfile(profile: ProfileData): Promise<void> {
  return fetchWithRetry(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
}

export async function checkProfileInitialized(): Promise<boolean> {
  const data = await fetchWithRetry<{ initialized: boolean }>(
    `${API_BASE}/profile/initialized`
  );
  return data.initialized;
}

export interface ParsedResumeData {
  name?: string;
  role?: string;
  location?: string;
  email?: string;
  github?: string;
  bio?: string;
  skills?: { name: string; value: number; color?: string }[];
  experiences?: {
    company: string;
    period: string;
    role: string;
    description: string;
    visibility?: string;
  }[];
  raw: string;
}

export async function parseResume(file: File): Promise<ParsedResumeData> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/profile/parse-resume`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || `Upload failed: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Parse failed");
  }
  return json.data;
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

// Decision Export Functions
export function exportDecisionsToJSON(decisions: DecisionRecord[]): string {
  return JSON.stringify(decisions, null, 2);
}

export function exportDecisionsToMarkdown(decisions: DecisionRecord[]): string {
  const header = `# Decision History

Exported on ${new Date().toLocaleDateString()}

Total decisions: ${decisions.length}

---

`;

  const decisionLines = decisions.map((d, i) => {
    const date = new Date(d.created_at).toLocaleString();
    return `## ${i + 1}. ${d.question}

**Date:** ${date}
**Alignment Score:** ${d.analysis.alignment}/100

### Summary
${d.analysis.summary}

### Pros
${d.analysis.pros.map(p => `- ${p}`).join('\n')}

### Cons
${d.analysis.cons.map(c => `- ${c}`).join('\n')}

---
`;
  }).join('\n');

  return header + decisionLines;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Agent Chat API (SSE streaming)
export interface AgentStreamEvent {
  type: "token" | "end" | "error" | "sources";
  content?: string;
  thread_id?: string;
  error?: string;
  sources?: string[];
  citations?: string[];  // Document IDs corresponding to sources
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
): Promise<{ reply: string; threadId: string; sources?: string[]; citations?: string[] }> {
  const { stream, threadId } = streamAgentChat(message, options);
  const reader = stream.getReader();
  let reply = "";
  let sources: string[] | undefined;
  let citations: string[] | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || value.type === "end" || value.type === "error") break;
      if (value.type === "token" && value.content) {
        reply += value.content;
      }
      if (value.type === "sources" && value.sources) {
        sources = value.sources;
        citations = value.citations;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { reply, threadId, sources, citations };
}

// Knowledge Base API - LLM Wiki Pattern
export interface KnowledgeDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  tags?: string[];
}

export interface KnowledgeStatus {
  rawDocuments: number;
  wikiPages: number;
  categories: string[];
  tags: string[];
}

export async function fetchKnowledgeStatus(): Promise<KnowledgeStatus> {
  return fetchWithRetry(`${API_BASE}/knowledge`);
}

export interface TagInfo {
  name: string;
  inUse: boolean;
  documentCount: number;
}

export async function fetchKnowledgeTags(): Promise<TagInfo[]> {
  return fetchWithRetry(`${API_BASE}/knowledge/tags`);
}

export async function deleteTag(tag: string): Promise<{ removedFrom: number }> {
  const response = await fetch(`${API_BASE}/knowledge/tags/${encodeURIComponent(tag)}`, {
    method: "DELETE",
  });
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Failed to delete tag");
  }
  return json.data;
}

export async function renameTag(oldTag: string, newTag: string): Promise<{ renamed: number }> {
  const response = await fetch(`${API_BASE}/knowledge/tags/${encodeURIComponent(oldTag)}/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newTag }),
  });
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Failed to rename tag");
  }
  return json.data;
}

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return fetchWithRetry(`${API_BASE}/knowledge/raw`);
}

export interface DocumentContent {
  id: string;
  filename: string;
  mimeType: string;
  content: string;
}

export async function fetchDocumentContent(id: string): Promise<DocumentContent> {
  const response = await fetch(`${API_BASE}/knowledge/raw/${id}/content`);
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Failed to fetch document content");
  }
  return json.data;
}

export async function uploadDocument(file: File, tags: string[] = []): Promise<{ success: boolean; filename: string; tags: string[]; wikiPagesCreated: number; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (tags.length > 0) {
    formData.append("tags", JSON.stringify(tags));
  }

  const response = await fetch(`${API_BASE}/knowledge/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json.error || `Upload failed: ${response.status}`);
  }

  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Upload failed");
  }
  return json.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await fetchWithRetry(`${API_BASE}/knowledge/raw/${id}`, {
    method: "DELETE",
  });
}

export async function updateDocumentTags(id: string, tags: string[]): Promise<void> {
  await fetchWithRetry(`${API_BASE}/knowledge/tags/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
}

export async function batchUpdateDocumentTags(ids: string[], tags: string[]): Promise<{ updated: number; failed: string[] }> {
  const response = await fetch(`${API_BASE}/knowledge/tags/batch`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, tags }),
  });
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(json.error || "Batch update failed");
  }
  return json.data;
}

export async function queryKnowledge(question: string): Promise<{ answer: string; pagesCount: number; citations: string[] }> {
  return fetchWithRetry(`${API_BASE}/knowledge/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export interface LintResult {
  contradictions: string[];
  staleClaims: string[];
  orphanPages: string[];
  missingLinks: string[];
}

export async function lintKnowledge(): Promise<LintResult> {
  return fetchWithRetry(`${API_BASE}/knowledge/lint`, {
    method: "POST",
  });
}

export async function clearConversation(threadId: string): Promise<void> {
  await fetchWithRetry(`${API_BASE}/agent/conversation/${threadId}`, {
    method: "DELETE",
  });
}

export interface ConversationMessage {
  id: number;
  thread_id: string;
  role: string;
  content: string;
  title: string | null;
  mode: string | null;
  created_at: string;
}

export interface ConversationListItem {
  threadId: string;
  title: string | null;
  mode: string | null;
  created_at: string;
  messageCount: number;
}

export async function fetchConversationsList(): Promise<ConversationListItem[]> {
  return fetchWithRetry(`${API_BASE}/agent/conversations`);
}

export async function fetchConversation(threadId: string): Promise<ConversationMessage[]> {
  return fetchWithRetry(`${API_BASE}/agent/conversation/${threadId}`);
}