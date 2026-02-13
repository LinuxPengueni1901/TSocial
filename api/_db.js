import 'dotenv/config';
import { createClient } from '@libsql/client';

// Lazy-initialized client
let client = null;

export const db = {
  get client() {
    if (!client) {
      if (!process.env.TURSO_DATABASE_URL) {
        throw new Error("TURSO_DATABASE_URL is missing! Please set it in Vercel.");
      }
      client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    }
    return client;
  }
};

// Helper function to execute queries
export async function execute(sql, params = []) {
  try {
    return await db.client.execute({ sql, args: params });
  } catch (error) {
    console.error("Database Execution Error:", error.message);
    throw error;
  }
}

// Global flag to track initialization
let isInitialized = false;

// Initialize database schema (Lazy)
export async function initializeDatabase() {
  if (isInitialized) return;

  if (!process.env.TURSO_DATABASE_URL) {
    console.warn("DB skip: TURSO_DATABASE_URL is missing.");
    return;
  }

  try {
    // Create Users Table
    await execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        password TEXT,
        bio TEXT,
        location TEXT,
        website TEXT,
        joinDate TEXT,
        avatar TEXT,
        banner TEXT,
        followers TEXT,
        following TEXT,
        postsCount TEXT,
        is_admin INTEGER DEFAULT 0,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_suspended INTEGER DEFAULT 0,
        suspension_reason TEXT,
        suspended_by TEXT,
        appeal_status TEXT,
        appeal_text TEXT
      )
    `);

    // Create Posts Table
    await execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        handle TEXT,
        avatar TEXT,
        time TEXT,
        content TEXT,
        image TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        reposts INTEGER DEFAULT 0,
        views TEXT DEFAULT '0',
        parent_id INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (parent_id) REFERENCES posts(id)
      )
    `);

    // Create Post Likes Table
    await execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);

    // Create Bookmarks Table
    await execute(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        post_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES posts(id)
      )
    `);

    // Create Messages Table
    await execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        receiver_id INTEGER,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )
    `);

    // Insert Initial System User if not exists
    const systemUserResult = await execute('SELECT id FROM users WHERE handle = ?', ['tsocial']);
    if (systemUserResult.rows.length === 0) {
      await execute(`
        INSERT INTO users (name, handle, password, bio, location, website, joinDate, followers, following, postsCount, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'TSocial Ekibi',
        'tsocial',
        '$2b$10$Afq5BBOrGbvJZ45kucfao.oWTWiw6.TZJ0kScrg42gXSkk9m2/j1e', // Hash for '123456'
        'TSocial dünyasına hoş geldiniz! Burada özgürce paylaşım yapabilir, topluluğu keşfedebilirsiniz. ✨',
        'İstanbul, TR',
        'tsocial.app',
        'Şubat 2026',
        '0',
        '0',
        '1',
        1 // is_admin
      ]);
    } else {
      await execute('UPDATE users SET is_admin = 1 WHERE handle = ?', ['tsocial']);
    }

    console.log("Database initialized successfully.");
    isInitialized = true;
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}
