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
        prompt_template TEXT,
        theme TEXT,
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
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        estimated_cost REAL,
        status TEXT DEFAULT 'pending',
        approved_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      );

      -- Create indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_excel_files_project_id ON excel_files(project_id);
      CREATE INDEX IF NOT EXISTS idx_entries_excel_file_id ON entries(excel_file_id);
      CREATE INDEX IF NOT EXISTS idx_ai_responses_entry_id ON ai_responses(entry_id);
      CREATE INDEX IF NOT EXISTS idx_ai_responses_status ON ai_responses(status);
    `)

    // Run migrations dynamically for existing databases
    try {
      db.exec('ALTER TABLE projects ADD COLUMN prompt_template TEXT')
    } catch (_) {}
    try {
      db.exec('ALTER TABLE projects ADD COLUMN theme TEXT')
    } catch (_) {}

    const columnsToAdd = [
      'ALTER TABLE ai_responses ADD COLUMN status TEXT DEFAULT "pending"',
      'ALTER TABLE ai_responses ADD COLUMN approved_at TEXT',
      'ALTER TABLE ai_responses ADD COLUMN model TEXT',
      'ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER',
      'ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER',
      'ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER',
      'ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL'
    ];
    for (const sql of columnsToAdd) {
      try {
        db.exec(sql)
      } catch (_) {}
    }

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
  prompt_template?: string
  theme?: string
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
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
  estimated_cost?: number
  status?: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  created_at: string
  updated_at: string
  entry_data?: Record<string, unknown>
}

export function createAIResponse(
  entryId: number,
  prompt: string,
  response: string,
  model?: string,
  inputTokens?: number,
  outputTokens?: number,
  totalTokens?: number,
  estimatedCost?: number
): AIResponse {
  const database = getDb()
  const stmt = database.prepare(
    "INSERT INTO ai_responses (entry_id, prompt, response, model, input_tokens, output_tokens, total_tokens, estimated_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
  const result = stmt.run(entryId, prompt, response, model || null, inputTokens || null, outputTokens || null, totalTokens || null, estimatedCost || null)
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

export function listApprovedResponsesByFileId(fileId: number): AIResponse[] {
  const database = getDb()
  const stmt = database.prepare(
    `SELECT r.*, e.row_number, e.data as entry_data
     FROM ai_responses r
     JOIN entries e ON r.entry_id = e.id
     WHERE e.excel_file_id = ? AND r.status = 'approved'
     ORDER BY e.row_number ASC`
  )
  const rows = stmt.all(fileId) as any[]
  return rows.map((row) => ({
    ...row,
    entry_data: JSON.parse(row.entry_data),
  })) as AIResponse[]
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

// ===== ANALYTICS OPERATIONS =====

export interface ProjectAnalytics {
  totalResponses: number
  approvedResponses: number
  pendingResponses: number
  rejectedResponses: number
  totalTokens: number
  totalCost: number
  avgTokensPerResponse: number
  avgCostPerResponse: number
  totalEntries: number
  entriesWithResponses: number
  entriesApproved: number
  timeSeriesData: Array<{ date: string; responses: number; tokens: number; cost: number }>
  statusDistribution: Array<{ name: string; value: number; color: string }>
  dailyActivity: Array<{ date: string; generated: number; approved: number }>
}

export function getProjectAnalytics(projectId: number, timeRange: string = '7d'): ProjectAnalytics {
  const database = getDb()
  
  // Calculate date threshold based on time range
  let dateThreshold: Date
  const now = new Date()

  switch (timeRange) {
    case '7d':
      dateThreshold = new Date(now.setDate(now.getDate() - 7))
      break
    case '30d':
      dateThreshold = new Date(now.setDate(now.getDate() - 30))
      break
    case 'all':
      dateThreshold = new Date('2000-01-01')
      break
    default:
      dateThreshold = new Date(now.setDate(now.getDate() - 7))
  }

  const dateThresholdStr = dateThreshold.toISOString()

  // 1. Get total metrics
  const totalMetricsQuery = `
    SELECT 
      COUNT(*) as total_responses,
      SUM(CASE WHEN ar.status = 'approved' THEN 1 ELSE 0 END) as approved_responses,
      SUM(CASE WHEN ar.status = 'pending' THEN 1 ELSE 0 END) as pending_responses,
      SUM(CASE WHEN ar.status = 'rejected' THEN 1 ELSE 0 END) as rejected_responses,
      COALESCE(SUM(ar.total_tokens), 0) as total_tokens,
      COALESCE(SUM(ar.estimated_cost), 0) as total_cost
    FROM ai_responses ar
    WHERE ar.entry_id IN (
      SELECT e.id FROM entries e
      WHERE e.excel_file_id IN (
        SELECT ef.id FROM excel_files ef
        WHERE ef.project_id = ?
      )
    )
    AND ar.created_at >= ?
  `
  const totalMetrics = database.prepare(totalMetricsQuery).get(projectId, dateThresholdStr) as any

  // 2. Get entry metrics
  const entryMetricsQuery = `
    SELECT 
      COUNT(DISTINCT e.id) as total_entries,
      COUNT(DISTINCT CASE WHEN ar.id IS NOT NULL THEN e.id END) as entries_with_responses,
      COUNT(DISTINCT CASE WHEN ar.status = 'approved' THEN e.id END) as entries_approved
    FROM entries e
    LEFT JOIN ai_responses ar ON e.id = ar.entry_id
    WHERE e.excel_file_id IN (
      SELECT ef.id FROM excel_files ef
      WHERE ef.project_id = ?
    )
  `
  const entryMetrics = database.prepare(entryMetricsQuery).get(projectId) as any

  // 3. Get time series data
  const timeSeriesQuery = `
    SELECT 
      DATE(ar.created_at) as date,
      COUNT(*) as responses,
      COALESCE(SUM(ar.total_tokens), 0) as tokens,
      COALESCE(SUM(ar.estimated_cost), 0) as cost
    FROM ai_responses ar
    WHERE ar.entry_id IN (
      SELECT e.id FROM entries e
      WHERE e.excel_file_id IN (
        SELECT ef.id FROM excel_files ef
        WHERE ef.project_id = ?
      )
    )
    AND ar.created_at >= ?
    GROUP BY DATE(ar.created_at)
    ORDER BY date ASC
  `
  const timeSeriesRows = database.prepare(timeSeriesQuery).all(projectId, dateThresholdStr) as any[]
  const timeSeriesData = timeSeriesRows.map(row => ({
    date: row.date,
    responses: row.responses,
    tokens: row.tokens,
    cost: parseFloat((row.cost || 0).toFixed(2))
  }))

  // 4. Get status distribution
  const statusQuery = `
    SELECT 
      ar.status,
      COUNT(*) as count
    FROM ai_responses ar
    WHERE ar.entry_id IN (
      SELECT e.id FROM entries e
      WHERE e.excel_file_id IN (
        SELECT ef.id FROM excel_files ef
        WHERE ef.project_id = ?
      )
    )
    AND ar.created_at >= ?
    GROUP BY ar.status
  `
  const colorMap: Record<string, string> = {
    'approved': 'oklch(0.62 0.16 145)',      // Success green
    'pending': 'oklch(0.70 0.16 55)',        // Warning amber
    'rejected': 'oklch(0.577 0.245 27.325)'  // Destructive red
  }
  const statusRows = database.prepare(statusQuery).all(projectId, dateThresholdStr) as any[]
  const statusDistribution = statusRows.map(row => ({
    name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    value: row.count,
    color: colorMap[row.status] || 'oklch(0.551 0.027 264.364)'
  }))

  // 5. Get daily activity
  const dailyQuery = `
    SELECT 
      DATE(ar.created_at) as date,
      COUNT(*) as generated,
      SUM(CASE WHEN ar.status = 'approved' THEN 1 ELSE 0 END) as approved
    FROM ai_responses ar
    WHERE ar.entry_id IN (
      SELECT e.id FROM entries e
      WHERE e.excel_file_id IN (
        SELECT ef.id FROM excel_files ef
        WHERE ef.project_id = ?
      )
    )
    AND ar.created_at >= ?
    GROUP BY DATE(ar.created_at)
    ORDER BY date DESC
    LIMIT 7
  `
  const dailyRows = database.prepare(dailyQuery).all(projectId, dateThresholdStr) as any[]
  const dailyActivity = dailyRows.reverse().map(row => ({
    date: row.date,
    generated: row.generated,
    approved: row.approved
  }))

  // Calculate averages
  const tr = totalMetrics?.total_responses || 0
  const tt = totalMetrics?.total_tokens || 0
  const tc = totalMetrics?.total_cost || 0
  const avgTokensPerResponse = tr > 0 ? tt / tr : 0
  const avgCostPerResponse = tr > 0 ? tc / tr : 0

  return {
    totalResponses: tr,
    approvedResponses: totalMetrics?.approved_responses || 0,
    pendingResponses: totalMetrics?.pending_responses || 0,
    rejectedResponses: totalMetrics?.rejected_responses || 0,
    totalTokens: tt,
    totalCost: tc,
    avgTokensPerResponse: Math.round(avgTokensPerResponse),
    avgCostPerResponse: parseFloat(avgCostPerResponse.toFixed(3)),
    totalEntries: entryMetrics?.total_entries || 0,
    entriesWithResponses: entryMetrics?.entries_with_responses || 0,
    entriesApproved: entryMetrics?.entries_approved || 0,
    timeSeriesData,
    statusDistribution,
    dailyActivity
  }
}
