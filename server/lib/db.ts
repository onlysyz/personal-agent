import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/decisions.db");

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initDB();
  }
  return db;
}

export function initDB(): void {
  const database = getDB();
  database.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      analysis TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      title TEXT,
      mode TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_thread ON conversations(thread_id);
  `);
}

export interface DecisionRecord {
  id: string;
  question: string;
  analysis: string;
  created_at: string;
}

export interface DecisionAnalysis {
  pros: string[];
  cons: string[];
  alignment: number;
  summary: string;
}

export function saveDecision(
  id: string,
  question: string,
  analysis: DecisionAnalysis
): void {
  const database = getDB();
  const stmt = database.prepare(
    "INSERT OR REPLACE INTO decisions (id, question, analysis, created_at) VALUES (?, ?, ?, datetime('now'))"
  );
  stmt.run(id, question, JSON.stringify(analysis));
}

export function getDecisions(limit = 20): DecisionRecord[] {
  const database = getDB();
  const stmt = database.prepare(
    "SELECT id, question, analysis, created_at FROM decisions ORDER BY created_at DESC LIMIT ?"
  );
  const rows = stmt.all(limit) as DecisionRecord[];
  return rows.map((row) => ({
    ...row,
    analysis: JSON.parse(row.analysis),
  }));
}

export function getDecisionById(id: string): DecisionRecord | null {
  const database = getDB();
  const stmt = database.prepare(
    "SELECT id, question, analysis, created_at FROM decisions WHERE id = ?"
  );
  const row = stmt.get(id) as DecisionRecord | undefined;
  if (!row) return null;
  return {
    ...row,
    analysis: JSON.parse(row.analysis),
  };
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

export function saveMessage(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  mode?: string,
  title?: string
): void {
  try {
    const database = getDB();
    const stmt = database.prepare(
      "INSERT INTO conversations (thread_id, role, content, title, mode, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
    );
    stmt.run(threadId, role, content, title || null, mode || null);
  } catch (err) {
    console.error("saveMessage failed:", err);
  }
}

export function getConversation(threadId: string): ConversationMessage[] {
  const database = getDB();
  const stmt = database.prepare(
    "SELECT id, thread_id, role, content, title, mode, created_at FROM conversations WHERE thread_id = ? ORDER BY created_at ASC"
  );
  return stmt.all(threadId) as ConversationMessage[];
}

export function clearConversation(threadId: string): void {
  const database = getDB();
  const stmt = database.prepare("DELETE FROM conversations WHERE thread_id = ?");
  stmt.run(threadId);
}

export function searchDecisions(keyword: string): DecisionRecord[] {
  const database = getDB();
  const stmt = database.prepare(
    "SELECT id, question, analysis, created_at FROM decisions WHERE question LIKE ? ORDER BY created_at DESC LIMIT 20"
  );
  const rows = stmt.all(`%${keyword}%`) as DecisionRecord[];
  return rows.map((row) => ({
    ...row,
    analysis: JSON.parse(row.analysis),
  }));
}
