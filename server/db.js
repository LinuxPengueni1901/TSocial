const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'tsocial.db'));

// Clear tables for a fresh start with the new schema (optional, but keep for now until stable)
// db.prepare('DROP TABLE IF EXISTS posts').run();
// db.prepare('DROP TABLE IF EXISTS users').run();

// Create Users Table
db.prepare(`
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
    suspension_reason TEXT
  )
`).run();

// Maintenance: Ensure columns exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT CURRENT_TIMESTAMP').run();
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [last_active]:", e.message);
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0').run();
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [is_suspended]:", e.message);
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN suspension_reason TEXT').run();
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [suspension_reason]:", e.message);
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN suspended_by TEXT').run();
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [suspended_by]:", e.message);
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN appeal_status TEXT').run(); // NULL, 'pending', 'rejected'
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [appeal_status]:", e.message);
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN appeal_text TEXT').run();
} catch (e) {
  if (!e.message.includes('duplicate column name')) console.log("Init [appeal_text]:", e.message);
}

try {
  // Backfill NULLs for existing users if any
  db.prepare('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE last_active IS NULL').run();
} catch (e) { }

// Create Posts Table
db.prepare(`
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
`).run();

// Create Post Likes Table
db.prepare(`
  CREATE TABLE IF NOT EXISTS post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  )
`).run();

// Create Bookmarks Table
db.prepare(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  )
`).run();

// Create Messages Table
db.prepare(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  )
`).run();

// Insert Initial System User if not exists
const systemUser = db.prepare('SELECT id FROM users WHERE handle = ?').get('tsocial');
if (!systemUser) {
  db.prepare(`
    INSERT INTO users (name, handle, password, bio, location, website, joinDate, followers, following, postsCount, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
  );

  const tsocialUser = db.prepare('SELECT id FROM users WHERE handle = ?').get('tsocial');
  db.prepare(`
    INSERT INTO posts (user_id, username, handle, avatar, time, content, likes, comments, reposts, views)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tsocialUser.id, 'TSocial Ekibi', 'tsocial', null, 'Az önce', 'TSocial yayına girdi! Yeni nesil sosyal ağ deneyimine hazır mısınız? 🚀 #TSocial #Hoşgeldiniz', 0, 0, 0, '0');
} else {
  // Ensure existing tsocial user has admin rights
  db.prepare('UPDATE users SET is_admin = 1 WHERE handle = ?').run('tsocial');
}

console.log("Database initialized successfully.");

module.exports = db;
