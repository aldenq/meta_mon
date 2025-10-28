import { CacheStore } from "./cache";

  
  /* -------------------------- Server: SQLite KV -------------------------- */
  // Uses better-sqlite3 (sync, safe in Next.js Node runtime; not Edge).
  // npm i better-sqlite3
  let _sqliteDb: any = null;
  export const runtime = 'nodejs';

  export class ServerSQLiteCache implements CacheStore {
    private ready = false;
    constructor(private dbPath = "./pokedex-cache.sqlite") {}
  
    async init(): Promise<void> {
      if (this.ready) return;
      const BetterSqlite3 = (await import("better-sqlite3")).default;
      _sqliteDb = new BetterSqlite3(this.dbPath);
      _sqliteDb.prepare(`
        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `).run();
  
      _sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_kv_key ON kv(key)`).run();
      this.ready = true;
    }
  
    async get(key: string): Promise<string | null> {
      const row = _sqliteDb.prepare(`SELECT value FROM kv WHERE key = ?`).get(key);
      return row ? (row.value as string) : null;
    }
  
    async set(key: string, value: string): Promise<void> {
      const ts = Date.now();
      _sqliteDb
        .prepare(
          `INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`
        )
        .run(key, value, ts);
    }
  
    async del(key: string): Promise<void> {
      _sqliteDb.prepare(`DELETE FROM kv WHERE key = ?`).run(key);
    }
  
    async keys(prefix = ""): Promise<string[]> {
      if (!prefix) {
        return _sqliteDb.prepare(`SELECT key FROM kv`).all().map((r: any) => r.key as string);
      }
      return _sqliteDb
        .prepare(`SELECT key FROM kv WHERE key LIKE ?`)
        .all(`${prefix}%`)
        .map((r: any) => r.key as string);
    }
  }
  