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
