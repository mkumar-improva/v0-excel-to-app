import * as XLSX from "xlsx"
import type { ExcelData } from "./types"

export async function parseExcelFile(file: File): Promise<ExcelData> {
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
          fileName: file.name,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(file)
  })
}
