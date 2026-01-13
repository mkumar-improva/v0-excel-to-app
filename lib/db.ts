import fs from "fs"
import path from "path"
import Database from "better-sqlite3"

const dbPath = path.join(process.cwd(), "data", "app.sqlite")

let db: Database.Database | null = null

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
    db = new Database(dbPath)

    // Create tables with foreign key constraints
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS excel_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        columns TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        excel_file_id INTEGER NOT NULL,
        row_number INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (excel_file_id) REFERENCES excel_files(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        model TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_excel_files_project_id ON excel_files(project_id);
      CREATE INDEX IF NOT EXISTS idx_entries_excel_file_id ON entries(excel_file_id);
      CREATE INDEX IF NOT EXISTS idx_ai_responses_entry_id ON ai_responses(entry_id);
    `)

    // Enable foreign keys
    db.pragma("foreign_keys = ON")
  }
  return db
}

// ===== PROJECT OPERATIONS =====

export interface Project {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export function createProject(name: string, description?: string): Project {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO projects (name, description) VALUES (?, ?)"
  )
  const result = stmt.run(name, description || null)
  return getProjectById(result.lastInsertRowid as number)!
}

export function getProjectById(id: number): Project | null {
  const database = getDb()
  const stmt = database.prepare("SELECT * FROM projects WHERE id = ?")
  return stmt.get(id) as Project | null
}

export function listProjects(): Project[] {
  const database = getDb()
  const stmt = database.prepare("SELECT * FROM projects ORDER BY created_at DESC")
  return stmt.all() as Project[]
}

export function updateProject(id: number, name?: string, description?: string): Project | null {
  const database = getDb()
  const updates: string[] = []
  const values: any[] = []

  if (name !== undefined) {
    updates.push("name = ?")
    values.push(name)
  }
  if (description !== undefined) {
    updates.push("description = ?")
    values.push(description)
  }

  if (updates.length === 0) return getProjectById(id)

  updates.push("updated_at = CURRENT_TIMESTAMP")
  values.push(id)

  const stmt = database.prepare(
    `UPDATE projects SET ${updates.join(", ")} WHERE id = ?`
  )
  stmt.run(...values)
  return getProjectById(id)
}

export function deleteProject(id: number): boolean {
  const database = getDb()
  const stmt = database.prepare("DELETE FROM projects WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// ===== EXCEL FILE OPERATIONS =====

export interface ExcelFile {
  id: number
  project_id: number
  file_name: string
  file_path: string
  columns: string[]
  uploaded_at: string
}

export function createExcelFile(
  projectId: number,
  fileName: string,
  filePath: string,
  columns: string[]
): ExcelFile {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO excel_files (project_id, file_name, file_path, columns) VALUES (?, ?, ?, ?)"
  )
  const result = stmt.run(projectId, fileName, filePath, JSON.stringify(columns))
  return getExcelFileById(result.lastInsertRowid as number)!
}

export function getExcelFileById(id: number): ExcelFile | null {
  const database = getDb()
  const stmt = database.prepare("SELECT * FROM excel_files WHERE id = ?")
  const row = stmt.get(id) as any
  if (!row) return null
  return {
    ...row,
    columns: JSON.parse(row.columns),
  }
}

export function listExcelFilesByProject(projectId: number): ExcelFile[] {
  const database = getDb()
  const stmt = database.prepare(
    "SELECT * FROM excel_files WHERE project_id = ? ORDER BY uploaded_at DESC"
  )
  const rows = stmt.all(projectId) as any[]
  return rows.map((row) => ({
    ...row,
    columns: JSON.parse(row.columns),
  }))
}

export function deleteExcelFile(id: number): boolean {
  const database = getDb()
  const stmt = database.prepare("DELETE FROM excel_files WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// ===== ENTRY OPERATIONS =====

export interface Entry {
  id: number
  excel_file_id: number
  row_number: number
  data: Record<string, unknown>
  created_at: string
}

export function createEntry(
  excelFileId: number,
  rowNumber: number,
  data: Record<string, unknown>
): Entry {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO entries (excel_file_id, row_number, data) VALUES (?, ?, ?)"
  )
  const result = stmt.run(excelFileId, rowNumber, JSON.stringify(data))
  return getEntryById(result.lastInsertRowid as number)!
}

export function createEntriesBatch(
  excelFileId: number,
  entries: Array<{ rowNumber: number; data: Record<string, unknown> }>
): Entry[] {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO entries (excel_file_id, row_number, data) VALUES (?, ?, ?)"
  )

  const insertMany = database.transaction((items: typeof entries) => {
    for (const entry of items) {
      stmt.run(excelFileId, entry.rowNumber, JSON.stringify(entry.data))
    }
  })

  insertMany(entries)
  return listEntriesByExcelFile(excelFileId)
}

export function getEntryById(id: number): Entry | null {
  const database = getDb()
  const stmt = database.prepare("SELECT * FROM entries WHERE id = ?")
  const row = stmt.get(id) as any
  if (!row) return null
  return {
    ...row,
    data: JSON.parse(row.data),
  }
}

export function listEntriesByExcelFile(excelFileId: number): Entry[] {
  const database = getDb()
  const stmt = database.prepare(
    "SELECT * FROM entries WHERE excel_file_id = ? ORDER BY row_number ASC"
  )
  const rows = stmt.all(excelFileId) as any[]
  return rows.map((row) => ({
    ...row,
    data: JSON.parse(row.data),
  }))
}

export function deleteEntry(id: number): boolean {
  const database = getDb()
  const stmt = database.prepare("DELETE FROM entries WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// ===== AI RESPONSE OPERATIONS =====

export interface AIResponse {
  id: number
  entry_id: number
  prompt: string
  response: string
  model?: string
  created_at: string
  updated_at: string
}

export function createAIResponse(
  entryId: number,
  prompt: string,
  response: string,
  model?: string
): AIResponse {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO ai_responses (entry_id, prompt, response, model) VALUES (?, ?, ?, ?)"
  )
  const result = stmt.run(entryId, prompt, response, model || null)
  return getAIResponseById(result.lastInsertRowid as number)!
}

export function getAIResponseById(id: number): AIResponse | null {
  const database = getDb()
  const stmt = database.prepare("SELECT * FROM ai_responses WHERE id = ?")
  return stmt.get(id) as AIResponse | null
}

export function listAIResponsesByEntry(entryId: number): AIResponse[] {
  const database = getDb()
  const stmt = database.prepare(
    "SELECT * FROM ai_responses WHERE entry_id = ? ORDER BY created_at DESC"
  )
  return stmt.all(entryId) as AIResponse[]
}

export function updateAIResponse(
  id: number,
  prompt?: string,
  response?: string,
  model?: string
): AIResponse | null {
  const database = getDb()
  const updates: string[] = []
  const values: any[] = []

  if (prompt !== undefined) {
    updates.push("prompt = ?")
    values.push(prompt)
  }
  if (response !== undefined) {
    updates.push("response = ?")
    values.push(response)
  }
  if (model !== undefined) {
    updates.push("model = ?")
    values.push(model)
  }

  if (updates.length === 0) return getAIResponseById(id)

  updates.push("updated_at = CURRENT_TIMESTAMP")
  values.push(id)

  const stmt = database.prepare(
    `UPDATE ai_responses SET ${updates.join(", ")} WHERE id = ?`
  )
  stmt.run(...values)
  return getAIResponseById(id)
}

export function deleteAIResponse(id: number): boolean {
  const database = getDb()
  const stmt = database.prepare("DELETE FROM ai_responses WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

// ===== HELPER QUERIES =====

export interface EntryWithResponses extends Entry {
  ai_responses: AIResponse[]
}

export function getEntryWithResponses(entryId: number): EntryWithResponses | null {
  const entry = getEntryById(entryId)
  if (!entry) return null

  const responses = listAIResponsesByEntry(entryId)
  return {
    ...entry,
    ai_responses: responses,
  }
}

export function listEntriesWithResponses(excelFileId: number): EntryWithResponses[] {
  const entries = listEntriesByExcelFile(excelFileId)
  return entries.map((entry) => ({
    ...entry,
    ai_responses: listAIResponsesByEntry(entry.id),
  }))
}
