"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, FileSpreadsheet, Edit2 } from "lucide-react"
import * as XLSX from 'xlsx'
import { toast } from "sonner"

interface ExportToExcelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    rows: any[]
    columns: string[]
    fileName?: string
}

export function ExportToExcelDialog({
    open,
    onOpenChange,
    rows,
    columns,
    fileName = "export"
}: ExportToExcelDialogProps) {
    // Initialize with all columns selected except internal ones
    const visibleColumns = columns.filter(col => !col.startsWith('_'))

    const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns)

    // Map of original column name to display name
    const [columnNames, setColumnNames] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        visibleColumns.forEach(col => {
            // Convert snake_case or camelCase to Title Case
            initial[col] = col
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim()
        })
        return initial
    })

    const handleToggleColumn = (column: string) => {
        setSelectedColumns(prev =>
            prev.includes(column)
                ? prev.filter(c => c !== column)
                : [...prev, column]
        )
    }

    const handleColumnNameChange = (column: string, newName: string) => {
        setColumnNames(prev => ({
            ...prev,
            [column]: newName
        }))
    }

    const handleSelectAll = () => {
        setSelectedColumns(visibleColumns)
    }

    const handleDeselectAll = () => {
        setSelectedColumns([])
    }

    const handleExport = () => {
        if (selectedColumns.length === 0) {
            toast.error("Please select at least one column to export")
            return
        }

        try {
            // Filter data to only include selected columns with renamed headers
            const exportData = rows.map(row => {
                const filteredRow: any = {}
                selectedColumns.forEach(col => {
                    // Use the renamed column name as the key
                    const displayName = columnNames[col] || col
                    filteredRow[displayName] = row[col]
                })
                return filteredRow
            })

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData)

            // Auto-size columns based on renamed headers
            const columnWidths = selectedColumns.map(col => {
                const displayName = columnNames[col] || col
                return {
                    wch: Math.max(
                        displayName.length,
                        ...exportData.map(row => String(row[displayName] || '').length)
                    ) + 2
                }
            })
            worksheet['!cols'] = columnWidths

            // Create workbook
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data")

            // Generate file name with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
            const fullFileName = `${fileName}_${timestamp}.xlsx`

            // Download
            XLSX.writeFile(workbook, fullFileName)

            toast.success(`Exported ${rows.length} rows to ${fullFileName}`)
            onOpenChange(false)
        } catch (error) {
            console.error("Export error:", error)
            toast.error("Failed to export data")
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Export to Excel
                    </DialogTitle>
                    <DialogDescription>
                        Select columns and customize their names for the Excel export
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {selectedColumns.length} of {visibleColumns.length} columns selected
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSelectAll}
                                className="h-8 text-xs"
                            >
                                Select All
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeselectAll}
                                className="h-8 text-xs"
                            >
                                Deselect All
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[350px] border rounded-md p-4">
                        <div className="space-y-3">
                            {visibleColumns.map(column => (
                                <div key={column} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <Checkbox
                                        id={`column-${column}`}
                                        checked={selectedColumns.includes(column)}
                                        onCheckedChange={() => handleToggleColumn(column)}
                                        className="mt-2"
                                    />
                                    <div className="flex-1 space-y-1.5">
                                        <Label
                                            htmlFor={`column-${column}`}
                                            className="text-xs text-muted-foreground cursor-pointer"
                                        >
                                            Original: {column}
                                        </Label>
                                        <Input
                                            value={columnNames[column] || column}
                                            onChange={(e) => handleColumnNameChange(column, e.target.value)}
                                            placeholder="Column name in Excel..."
                                            className="h-8 text-sm"
                                            disabled={!selectedColumns.includes(column)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <p className="text-muted-foreground">
                            <strong>{rows.length}</strong> rows will be exported
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={selectedColumns.length === 0}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export Excel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
