"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepare = exports.db = void 0;
exports.get = get;
exports.all = all;
exports.run = run;
exports.transaction = transaction;
const node_sqlite_1 = require("node:sqlite");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.DB_PATH || path_1.default.join(process.cwd(), 'data', 'app.db');
fs_1.default.mkdirSync(path_1.default.dirname(dbPath), { recursive: true });
exports.db = new node_sqlite_1.DatabaseSync(dbPath);
exports.db.exec(`
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
const prepare = (sql) => exports.db.prepare(sql);
exports.prepare = prepare;
function get(sql, params = []) {
    return exports.db.prepare(sql).get(...params);
}
function all(sql, params = []) {
    return exports.db.prepare(sql).all(...params);
}
function run(sql, params = []) {
    const result = exports.db.prepare(sql).run(...params);
    return { changes: Number(result.changes), lastInsertRowid: result.lastInsertRowid };
}
function transaction(fn) {
    exports.db.exec('BEGIN');
    try {
        const result = fn();
        exports.db.exec('COMMIT');
        return result;
    }
    catch (e) {
        exports.db.exec('ROLLBACK');
        throw e;
    }
}
//# sourceMappingURL=db.js.map