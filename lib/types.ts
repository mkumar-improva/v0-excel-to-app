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
