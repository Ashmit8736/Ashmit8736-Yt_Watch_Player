import sqlite3 from 'sqlite3';
import path from 'path';

// Store SQLite DB file reliably in current working directory
const dbPath = path.resolve(process.cwd(), 'dev.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening sqlite3 database:', err.message);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Enforce foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database schema
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    passwordHash TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration for existing users table
  db.run(`ALTER TABLE users ADD COLUMN name TEXT`, () => {});

  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    username TEXT,
    role TEXT,
    roomId TEXT,
    FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS video_states (
    roomId TEXT PRIMARY KEY,
    playState TEXT DEFAULT 'paused',
    currentTime REAL DEFAULT 0,
    videoId TEXT DEFAULT '',
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(roomId) REFERENCES rooms(id) ON DELETE CASCADE
  )`);

  // Clean stale in-memory socket participants and empty rooms on server restart
  db.run(`DELETE FROM participants`);
  db.run(`DELETE FROM rooms`);
});

// Utility functions for async/await queries
export const runQuery = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const getQuery = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const allQuery = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};
