"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { PromptDialog } from "./prompt-dialog"

interface DataTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
  promptTemplate: string
}

export function DataTable({ columns, rows, promptTemplate }: DataTableProps) {
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleGeneratePrompt = (row: Record<string, unknown>) => {
    setSelectedRow(row)
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Table Info Bar */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{rows.length}</span> rows
          </p>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {/* Fixed Header */}
          <div className="overflow-x-auto border-b border-border">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[100px] sticky left-0 bg-muted/50 z-10">Actions</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column} className="min-w-[150px]">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          {/* Scrollable Body */}
          <ScrollArea className="h-[calc(100%-0px)]" style={{ height: "calc(100% - 41px)" }}>
            <div className="overflow-x-auto">
              <Table className="min-w-max">
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index} className="hover:bg-muted/30">
                      <TableCell className="w-[100px] sticky left-0 bg-card z-10">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeneratePrompt(row)}
                          className="text-xs"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Generate
                        </Button>
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column} className="max-w-[300px] min-w-[150px] truncate">
                          {String(row[column] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
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
        onOpenChange={setDialogOpen}
        prompt={selectedRow ? generatePromptFromTemplate(selectedRow) : ""}
        rowData={selectedRow}
      />
    </>
  )
}
