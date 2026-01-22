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
  theme?: string | Record<string, any>
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
  last_generated_at?: string
  last_approved_at?: string
  latest_response_text?: string
  approved_response_text?: string
}

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

export interface SourceReference {
  source_name: string
  url: string
}

export interface ResponseData {
  original_input?: Record<string, any>
  validated_data?: Record<string, any>
  status?: string
  changes_detected?: boolean
  confidence_score?: number
  data_quality_notes?: string
  source_references?: SourceReference[]
}
