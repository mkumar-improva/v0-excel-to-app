"use client"

import { useState, useCallback } from "react"
import { FileUpload } from "./file-upload"
import { DataTable } from "./data-table"
import { PromptEditor } from "./prompt-editor"
import { FilterPanel } from "./filter-panel"
import { StorageDialog } from "./storage-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Filter, FileText } from "lucide-react"
import type { ExcelData, FilterState } from "@/lib/types"

export function ExcelViewer() {
  const [data, setData] = useState<ExcelData | null>(null)
  const [filters, setFilters] = useState<FilterState>({})
  const [promptTemplate, setPromptTemplate] = useState<string>(
    "Generate a summary for {{Name}} with the following details:\n\nEmail: {{Email}}\nRole: {{Role}}\n\nPlease provide insights and recommendations.",
  )
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [promptEditorOpen, setPromptEditorOpen] = useState(false)

  const handleFileUpload = useCallback((excelData: ExcelData) => {
    setData(excelData)
    setFilters({})
  }, [])

  const handleStorageLoad = useCallback((excelData: ExcelData, template: string) => {
    setData(excelData)
    setPromptTemplate(template)
    setFilters({})
  }, [])

  const filteredRows = data?.rows.filter((row) => {
    return Object.entries(filters).every(([column, filterValues]) => {
      if (!filterValues || filterValues.length === 0) return true
      const cellValue = String(row[column] ?? "")
      return filterValues.includes(cellValue)
    })
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Excel to App</h1>
            <p className="text-sm text-muted-foreground">Upload Excel files, filter data, and generate AI prompts</p>
          </div>
          <div className="flex items-center gap-2">
            <StorageDialog
              currentData={data}
              promptTemplate={promptTemplate}
              onDataLoad={handleStorageLoad}
              trigger={
                <Button variant="outline" size="icon" title="Storage Manager">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                    />
                  </svg>
                </Button>
              }
            />
            <Button
              variant="outline"
              size="icon"
              title="Edit Prompt Template"
              onClick={() => setPromptEditorOpen(true)}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <FileUpload onUpload={handleFileUpload} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {data && (
          <aside
            className={`relative border-r border-border bg-card transition-all duration-300 ease-in-out ${leftPanelOpen ? "w-64" : "w-12"
              }`}
          >
            {leftPanelOpen ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card shadow-sm"
                  onClick={() => setLeftPanelOpen(false)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <div className="overflow-y-auto h-full">
                  <FilterPanel columns={data.columns} rows={data.rows} filters={filters} onFilterChange={setFilters} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center pt-4 gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLeftPanelOpen(true)}
                  title="Open Filters"
                >
                  <Filter className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground [writing-mode:vertical-lr] rotate-180">Filters</span>
              </div>
            )}
          </aside>
        )}

        {/* Center - Data Table */}
        <main className="flex-1 overflow-hidden">
          {data ? (
            <DataTable columns={data.columns} rows={filteredRows || []} promptTemplate={promptTemplate} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">No file uploaded</h3>
                <p className="text-sm text-muted-foreground">Upload an Excel file or load a saved session</p>
              </div>
            </div>
          )}
        </main>

      </div>

      <Dialog open={promptEditorOpen} onOpenChange={setPromptEditorOpen}>
        <DialogContent className="!w-[98vw] sm:!w-[98vw] lg:!w-[94vw] !max-w-[1800px] sm:!max-w-[1800px] lg:!max-w-[2000px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Prompt Template</DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto">
            <PromptEditor template={promptTemplate} onTemplateChange={setPromptTemplate} columns={data?.columns || []} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
