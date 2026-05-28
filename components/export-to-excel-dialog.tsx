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
    const hasValidatedData = columns.includes("Validated Data")
    const preferredOrder = [
        "Name",
        "Facility Type",
        "Address",
        "City",
        "State",
        "Zip",
        "Telephone",
        "Fax",
        "Confidence Score",
        "Comment"
    ]

    const [availableColumns, setAvailableColumns] = useState<string[]>(() => {
        const cols = new Set<string>()
        
        columns.forEach(col => {
            if (!col.startsWith('_') && col !== "Validated Data" && col !== "response") {
                cols.add(col)
            }
        })
        
        if (rows.length > 0) {
            Object.keys(rows[0]).forEach(key => {
                if (!key.startsWith('_') && key !== "Validated Data" && key !== "response" && key !== "entry_data" && key !== "prompt") {
                    cols.add(key)
                }
            })
        }
        
        const allCols = Array.from(cols)
        allCols.sort((a, b) => {
            const idxA = preferredOrder.indexOf(a)
            const idxB = preferredOrder.indexOf(b)
            if (idxA !== -1 && idxB !== -1) return idxA - idxB
            if (idxA !== -1) return -1
            if (idxB !== -1) return 1
            return a.localeCompare(b)
        })
        
        return allCols
    })

    const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
        // Default select the preferred columns if they are available
        const defaults = availableColumns.filter(col => preferredOrder.includes(col))
        if (defaults.length > 0) return defaults
        return availableColumns
    })

    // Map of original column name to display name
    const [columnNames, setColumnNames] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {}
        availableColumns.forEach(col => {
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
        setSelectedColumns(availableColumns)
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
            // Check if we're exporting validated data (from approved tab)
            const hasValidatedData = columns.includes("Validated Data")

            let exportData: any[]

            if (hasValidatedData) {
                // Extract validated_data from each row's JSON response
                exportData = rows.map(row => {
                    try {
                        const validatedDataStr = row["Validated Data"]
                        if (!validatedDataStr) return {}

                        // Parse the JSON response
                        const parsedResponse = JSON.parse(validatedDataStr)

                        // Extract validated_data object
                        const validatedData = parsedResponse.validated_data || {}

                        // Filter to only include selected columns with renamed headers
                        const filteredRow: any = {}
                        selectedColumns.forEach(col => {
                            if (col === "Validated Data") {
                                // Skip the "Validated Data" column itself, we're extracting its contents
                                return
                            }
                            const displayName = columnNames[col] || col
                            const lowercaseCol = col.toLowerCase()
                            
                            // Check if present at root of response JSON (e.g. comment, model, tokens, cost)
                            let rootVal = parsedResponse[col] !== undefined
                                ? parsedResponse[col]
                                : (parsedResponse[lowercaseCol] !== undefined
                                    ? parsedResponse[lowercaseCol]
                                    : undefined)

                            // Special mappings for display fields
                            if (col === "Tokens" && parsedResponse.total_tokens !== undefined) {
                                rootVal = parsedResponse.total_tokens
                            }
                            if (col === "Cost" && parsedResponse.estimated_cost !== undefined) {
                                rootVal = parsedResponse.estimated_cost
                            }

                            // Assign value: try root of parsed JSON first, then validated_data object, then fallback to original row data
                            let mappedVal = rootVal !== undefined
                                ? rootVal
                                : (validatedData[col] !== undefined
                                    ? validatedData[col]
                                    : (validatedData[lowercaseCol] !== undefined
                                        ? validatedData[lowercaseCol]
                                        : undefined))

                            // Schema translation fallbacks for Location/Name and Phone/Telephone compatibility
                            if (mappedVal === undefined) {
                                if (lowercaseCol === "name" || lowercaseCol === "location") {
                                    mappedVal = validatedData.name ?? validatedData.location ?? validatedData.Name ?? validatedData.Location
                                } else if (lowercaseCol === "telephone" || lowercaseCol === "phone") {
                                    mappedVal = validatedData.telephone ?? validatedData.phone ?? validatedData.Telephone ?? validatedData.Phone
                                }
                            }

                            // Finally fallback to original row data
                            filteredRow[displayName] = mappedVal !== undefined
                                ? mappedVal
                                : row[col]
                        })

                        // Add all fields from validated_data that aren't in columns
                        Object.keys(validatedData).forEach(key => {
                            const displayName = columnNames[key] || key
                                .replace(/_/g, ' ')
                                .replace(/([A-Z])/g, ' $1')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')
                                .trim()

                            if (!filteredRow.hasOwnProperty(displayName)) {
                                filteredRow[displayName] = validatedData[key]
                            }
                        })

                        return filteredRow
                    } catch (error) {
                        console.error("Error parsing validated data for row:", error)
                        // Fallback to regular export for this row
                        const filteredRow: any = {}
                        selectedColumns.forEach(col => {
                            if (col !== "Validated Data") {
                                const displayName = columnNames[col] || col
                                filteredRow[displayName] = row[col]
                            }
                        })
                        return filteredRow
                    }
                })
            } else {
                // Regular export (non-validated data)
                exportData = rows.map(row => {
                    const filteredRow: any = {}
                    selectedColumns.forEach(col => {
                        // Use the renamed column name as the key
                        const displayName = columnNames[col] || col
                        filteredRow[displayName] = row[col]
                    })
                    return filteredRow
                })
            }

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData)

            // Auto-size columns
            const allColumnNames = Object.keys(exportData[0] || {})
            const columnWidths = allColumnNames.map(displayName => {
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Validated Data")

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
                        {hasValidatedData
                            ? "Exporting AI-validated data from approved responses. Select which fields to include in the Excel export."
                            : "Select columns and customize their names for the Excel export"
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {selectedColumns.length} of {availableColumns.length} columns selected
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
                            {availableColumns.map(column => (
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
