"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { PromptDialog } from "./prompt-dialog"
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"

interface DataTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
  promptTemplate: string
  onDataChange?: () => void
  matchFields?: string[]
}

type SortConfig = {
  column: string
  direction: 'asc' | 'desc'
}

export function DataTable({ columns, rows, promptTemplate, onDataChange, matchFields }: DataTableProps) {
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [initialDialogTab, setInitialDialogTab] = useState<"prompt" | "response">("prompt")
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([])

  const handleGeneratePrompt = (row: Record<string, unknown>) => {
    setSelectedRow(row)
    const hasResponse = (row._responseCount as number) > 0
    setInitialDialogTab(hasResponse ? "response" : "prompt")
    setDialogOpen(true)
  }

  const generatePromptFromTemplate = (row: Record<string, unknown>) => {
    let prompt = promptTemplate
    columns.forEach((col) => {
      const regex = new RegExp(`{{${col}}}`, "g")
      prompt = prompt.replace(regex, String(row[col] ?? ""))
    })
    return prompt
  }

  const handleSort = (column: string, isShiftClick: boolean) => {
    setSortConfigs(prev => {
      // Find if this column is already being sorted
      const existingIndex = prev.findIndex(config => config.column === column)

      if (isShiftClick) {
        // Shift+Click: Add to multi-sort or toggle existing
        if (existingIndex >= 0) {
          // Toggle direction or remove if desc
          const existing = prev[existingIndex]
          if (existing.direction === 'asc') {
            // Change to desc
            const newConfigs = [...prev]
            newConfigs[existingIndex] = { column, direction: 'desc' }
            return newConfigs
          } else {
            // Remove this sort
            return prev.filter((_, i) => i !== existingIndex)
          }
        } else {
          // Add new sort
          return [...prev, { column, direction: 'asc' }]
        }
      } else {
        // Regular click: Single column sort
        if (existingIndex === 0 && prev.length === 1) {
          // Toggle if it's the only sort
          const existing = prev[0]
          if (existing.direction === 'asc') {
            return [{ column, direction: 'desc' }]
          } else {
            return [] // Remove sort
          }
        } else {
          // Set as single sort
          return [{ column, direction: 'asc' }]
        }
      }
    })
  }

  const getSortedRows = () => {
    if (sortConfigs.length === 0) return rows

    return [...rows].sort((a, b) => {
      for (const config of sortConfigs) {
        const aValue = String(a[config.column] ?? '')
        const bValue = String(b[config.column] ?? '')

        // Try numeric comparison first
        const aNum = parseFloat(aValue)
        const bNum = parseFloat(bValue)

        let comparison = 0
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum
        } else {
          comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
        }

        if (comparison !== 0) {
          return config.direction === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })
  }

  const getSortIndicator = (column: string) => {
    const sortIndex = sortConfigs.findIndex(config => config.column === column)
    if (sortIndex === -1) {
      return <ArrowUpDown className="h-3 w-3 opacity-30" />
    }

    const config = sortConfigs[sortIndex]
    const priority = sortConfigs.length > 1 ? sortIndex + 1 : null

    return (
      <div className="flex items-center gap-1">
        {config.direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 text-primary" />
        ) : (
          <ArrowDown className="h-3 w-3 text-primary" />
        )}
        {priority && (
          <span className="text-[10px] font-bold text-primary">{priority}</span>
        )}
      </div>
    )
  }

  const sortedRows = getSortedRows()

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Table Info Bar */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{sortedRows.length}</span> rows
            </p>
            {sortConfigs.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Sorted by {sortConfigs.length} column{sortConfigs.length > 1 ? 's' : ''}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortConfigs([])}
                  className="h-6 text-xs"
                >
                  Clear Sort
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="w-full">
              <Table className="min-w-max">
                <TableHeader className="sticky top-0 z-20 bg-background">
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[100px] sticky left-0 bg-muted/50 z-30 border-r">Actions</TableHead>
                    {columns.map((column) => (
                      <TableHead
                        key={column}
                        className="min-w-[150px] bg-muted/50 cursor-pointer hover:bg-muted transition-colors select-none"
                        onClick={(e) => handleSort(column, e.shiftKey)}
                        title="Click to sort, Shift+Click for multi-column sort"
                      >
                        <div className="flex items-center gap-2">
                          <span>{column}</span>
                          {getSortIndicator(column)}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row, index) => {
                    const hasResponse = (row._responseCount as number) > 0
                    return (
                      <TableRow
                        key={index}
                        className={`group hover:bg-muted/50 cursor-pointer transition-colors`}
                        onClick={() => handleGeneratePrompt(row)}
                      >
                        <TableCell className="w-[100px] sticky left-0 bg-card z-10 transition-colors group-hover:bg-muted/50">
                          <Button
                            size="sm"
                            variant={hasResponse ? "secondary" : "outline"}
                            onClick={() => handleGeneratePrompt(row)}
                            className={`text-xs ${hasResponse ? "text-green-600 dark:text-green-400" : ""}`}
                          >
                            {hasResponse ? (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                Generate
                              </>
                            )}
                          </Button>
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell key={column} className="max-w-[300px] min-w-[150px] truncate">
                            {String(row[column] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </div>

      <PromptDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            onDataChange?.()
          }
        }}
        prompt={selectedRow ? generatePromptFromTemplate(selectedRow) : ""}
        rowData={selectedRow}
        initialTab={initialDialogTab}
        matchFields={matchFields}
      />
    </>
  )
}
