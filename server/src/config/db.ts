import sqlite3 from 'sqlite3';
import path from 'path';
import { createClient, Client } from '@libsql/client';

const isTurso = !!process.env.TURSO_DATABASE_URL;

let tursoClient: Client | null = null;
let sqliteDb: sqlite3.Database | null = null;

if (isTurso) {
  console.log(`🌐 Connecting to Turso Cloud Database at ${process.env.TURSO_DATABASE_URL}`);
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  // Initialize Turso schema
  (async () => {
    try {
      await tursoClient!.execute(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        name TEXT,
        passwordHash TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      try {
        await tursoClient!.execute(`ALTER TABLE users ADD COLUMN name TEXT`);
      } catch {}

      await tursoClient!.execute(`CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await tursoClient!.execute(`CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        username TEXT,
        role TEXT,
        roomId TEXT
      )`);

      await tursoClient!.execute(`CREATE TABLE IF NOT EXISTS video_states (
        roomId TEXT PRIMARY KEY,
        playState TEXT DEFAULT 'paused',
        currentTime REAL DEFAULT 0,
        videoId TEXT DEFAULT '',
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await tursoClient!.execute(`DELETE FROM participants`);
      await tursoClient!.execute(`DELETE FROM rooms`);
      console.log('✅ Turso Database schema initialized successfully');
    } catch (err: any) {
      console.error('❌ Failed to initialize Turso schema:', err.message);
    }
  })();
} else {
  // Store SQLite DB file reliably in local working directory
  const dbPath = path.resolve(process.cwd(), 'dev.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening sqlite3 database:', err.message);
    } else {
      console.log(`📁 Connected to local SQLite database at ${dbPath}`);
    }
  });

  sqliteDb.run('PRAGMA foreign_keys = ON');

  sqliteDb.serialize(() => {
    sqliteDb!.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      passwordHash TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDb!.run(`ALTER TABLE users ADD COLUMN name TEXT`, () => {});

    sqliteDb!.run(`CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    sqliteDb!.run(`CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      username TEXT,
      role TEXT,
      roomId TEXT,
      FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE
    )`);

    sqliteDb!.run(`CREATE TABLE IF NOT EXISTS video_states (
      roomId TEXT PRIMARY KEY,
      playState TEXT DEFAULT 'paused',
      currentTime REAL DEFAULT 0,
      videoId TEXT DEFAULT '',
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE
    )`);

    sqliteDb!.run(`DELETE FROM participants`);
    sqliteDb!.run(`DELETE FROM rooms`);
  });
}

export const db = sqliteDb;

// Utility functions for async/await queries
export const runQuery = async (sql: string, params: any[] = []): Promise<void> => {
  if (tursoClient) {
    await tursoClient.execute({ sql, args: params });
    return;
  }

  return new Promise((resolve, reject) => {
    sqliteDb!.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const getQuery = async <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  if (tursoClient) {
    const rs = await tursoClient.execute({ sql, args: params });
    if (rs.rows.length === 0) return undefined;
    return rs.rows[0] as unknown as T;
  }

  return new Promise((resolve, reject) => {
    sqliteDb!.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const allQuery = async <T>(sql: string, params: any[] = []): Promise<T[]> => {
  if (tursoClient) {
    const rs = await tursoClient.execute({ sql, args: params });
    return rs.rows as unknown as T[];
  }

  return new Promise((resolve, reject) => {
    sqliteDb!.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};
