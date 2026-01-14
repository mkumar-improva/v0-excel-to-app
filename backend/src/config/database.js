const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/app.sqlite');

let db = null;

function getDb() {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize database
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('✅ Connected to SQLite database.');
      initializeTables();
    }
  });

  return db;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) {
        console.error('Error running SQL:', sql, err);
        reject(err);
      } else {
        // Return context which contains .lastID and .changes
        resolve(this);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, result) => {
      if (err) {
        console.error('Error getting data:', sql, err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error getting all rows:', sql, err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function initializeTables() {
  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        prompt_template TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (!err) {
        // Attempt to add column if table exists (migration)
        db.run('ALTER TABLE projects ADD COLUMN prompt_template TEXT', (err) => {
          // Ignore error if column already exists
        });

        // Add theme column migration
        db.run('ALTER TABLE projects ADD COLUMN theme TEXT', (err) => {
          // Ignore error if column already exists
        });
      }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS excel_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        columns TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        excel_file_id INTEGER NOT NULL,
        row_number INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (excel_file_id) REFERENCES excel_files(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS ai_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        estimated_cost REAL,
        status TEXT DEFAULT 'pending',
        approved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (!err) {
        // Migration: Add columns if they don't exist
        const columnsToAdd = [
          'ALTER TABLE ai_responses ADD COLUMN status TEXT DEFAULT "pending"',
          'ALTER TABLE ai_responses ADD COLUMN approved_at TEXT',
          'ALTER TABLE ai_responses ADD COLUMN model TEXT',
          'ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER',
          'ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER',
          'ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER',
          'ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL'
        ];

        columnsToAdd.forEach(sql => {
          db.run(sql, (e) => {
            // Ignore "duplicate column" errors
          });
        });

        console.log('✅ Token usage columns migration applied');
      }
    });

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_excel_files_project_id ON excel_files(project_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_entries_excel_file_id ON entries(excel_file_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ai_responses_entry_id ON ai_responses(entry_id)');

    // Analytics performance indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_ai_responses_status ON ai_responses(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ai_responses_created_at ON ai_responses(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ai_responses_status_created ON ai_responses(status, created_at)');

    console.log('✅ Database tables and indexes initialized');
  });
}

function closeDb() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
    db = null;
  }
}

module.exports = {
  getDb,
  run,
  get,
  all,
  closeDb
};
