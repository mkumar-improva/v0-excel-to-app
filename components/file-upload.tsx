"use client"

import type React from "react"

import { useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { parseExcelFile } from "@/lib/excel-parser"
import type { ExcelData } from "@/lib/types"

interface FileUploadProps {
  onUpload: (data: ExcelData) => void
}

export function FileUpload({ onUpload }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        const data = await parseExcelFile(file)
        onUpload(data)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        alert("Failed to parse Excel file. Please ensure it's a valid .xlsx or .xls file.")
      }

      // Reset input to allow re-uploading the same file
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    },
    [onUpload],
  )

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
        id="file-upload"
      />
      <Button
        onClick={() => inputRef.current?.click()}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Upload Excel
      </Button>
    </>
  )
}
