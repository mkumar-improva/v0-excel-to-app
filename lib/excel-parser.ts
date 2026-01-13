import * as XLSX from "xlsx"
import type { ExcelData } from "./types"

// Client-side: Parse from File object
export async function parseExcelFile(file: File): Promise<ExcelData>

// Server-side: Parse from Buffer
export function parseExcelFile(buffer: Buffer, fileName: string): ExcelData

// Implementation
export function parseExcelFile(
  input: File | Buffer,
  fileName?: string
): Promise<ExcelData> | ExcelData {
  // Server-side: Buffer input
  if (Buffer.isBuffer(input)) {
    if (!fileName) {
      throw new Error("fileName is required when parsing from Buffer")
    }

    const workbook = XLSX.read(input, { type: "buffer" })

    // Get the first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    })

    if (jsonData.length === 0) {
      throw new Error("No data found in the Excel file")
    }

    // Extract columns from the first row
    const columns = Object.keys(jsonData[0])

    return {
      columns,
      rows: jsonData,
      fileName,
    }
  }

  // Client-side: File input
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
        })

        if (jsonData.length === 0) {
          throw new Error("No data found in the Excel file")
        }

        // Extract columns from the first row
        const columns = Object.keys(jsonData[0])

        resolve({
          columns,
          rows: jsonData,
          fileName: input.name,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(input)
  })
}

