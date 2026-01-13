export interface ExcelData {
  columns: string[]
  rows: Record<string, unknown>[]
  fileName: string
}

export type FilterState = Record<string, string[] | undefined>

export interface SavedSession {
  id: string
  name: string
  data: ExcelData
  promptTemplate: string
  savedAt: string
}

export interface SavedPromptResult {
  rowData: Record<string, unknown>
  prompt: string
  response: string
  timestamp: string
}

export interface ExportData {
  version: string
  sessions: SavedSession[]
  currentSession?: {
    data: ExcelData
    promptTemplate: string
  }
}

// Database entity types
export interface Project {
  id: number
  name: string
  description?: string
  prompt_template?: string
  created_at: string
  updated_at: string
}

export interface ExcelFileDB {
  id: number
  project_id: number
  file_name: string
  file_path: string
  columns: string[]
  uploaded_at: string
}

export interface Entry {
  id: number
  excel_file_id: number
  row_number: number
  data: Record<string, unknown>
  created_at: string
  response_count?: number
  approved_count?: number
}

export interface AIResponse {
  id: number
  entry_id: number
  prompt: string
  response: string
  model?: string
  status?: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  created_at: string
  updated_at: string
}
