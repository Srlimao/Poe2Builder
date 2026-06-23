const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create user_builds table for cloud build storage
    db.run(`CREATE TABLE IF NOT EXISTS user_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,
      build_name TEXT NOT NULL,
      build_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating user_builds table', err.message);
      } else {
        db.run(`CREATE INDEX IF NOT EXISTS idx_account_name ON user_builds(account_name)`);
      }
    });

    // Create public_builds table for scraped/curated builds
    db.run(`CREATE TABLE IF NOT EXISTS public_builds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT UNIQUE NOT NULL,
      pobb_url TEXT NOT NULL,
      build_name TEXT NOT NULL,
      author TEXT,
      class_name TEXT,
      ascendancy_name TEXT,
      build_data TEXT NOT NULL,
      popularity TEXT,
      ehp TEXT,
      dps TEXT,
      tags TEXT DEFAULT '[]',
      source_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating public_builds table', err.message);
      }
    });
  }
});

module.exports = db;
