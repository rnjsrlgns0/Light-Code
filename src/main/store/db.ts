import path from 'path'
import { app } from 'electron'

// Native module - use createRequire to load from node_modules at runtime
import { createRequire } from 'module'
const require2 = createRequire(import.meta.url || __filename)
const Database = require2('better-sqlite3')

let db: any

export function getDb(): any {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'light-code.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      system_prompt TEXT DEFAULT '',
      triggers TEXT DEFAULT '[]',
      learnings TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_context (
      id TEXT PRIMARY KEY DEFAULT 'default',
      brief TEXT DEFAULT '',
      preferences TEXT DEFAULT '[]',
      patterns TEXT DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      messages TEXT DEFAULT '[]',
      detections TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO user_context (id, brief) VALUES ('default', '');
  `)
}
