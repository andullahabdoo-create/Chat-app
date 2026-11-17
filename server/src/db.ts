import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  displayName TEXT,
  avatarColor TEXT,
  status TEXT DEFAULT 'online',
  lastSeen INTEGER,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')) DEFAULT 'dm',
  name TEXT,
  avatarColor TEXT,
  createdBy TEXT,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  joinedAt INTEGER NOT NULL,
  lastReadAt INTEGER DEFAULT 0,
  PRIMARY KEY (conversationId, userId),
  FOREIGN KEY (conversationId) REFERENCES conversations(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  content TEXT DEFAULT '',
  mediaUrl TEXT,
  mediaType TEXT,
  createdAt INTEGER NOT NULL,
  readAt INTEGER DEFAULT 0,
  FOREIGN KEY (conversationId) REFERENCES conversations(id),
  FOREIGN KEY (senderId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversationId, createdAt);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(userId);
`);

export const prepare = (sql: string) => db.prepare(sql);

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  return (db.prepare(sql) as any).get(...params) as T | undefined;
}

export function all<T = any>(sql: string, params: any[] = []): T[] {
  return (db.prepare(sql) as any).all(...params) as T[];
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
  const result = (db.prepare(sql) as any).run(...params) as { changes: number | bigint; lastInsertRowid: number | bigint };
  return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
}

export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}