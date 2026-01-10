"use client"

import { useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { FilterState } from "@/lib/types"

interface FilterPanelProps {
  columns: string[]
  rows: Record<string, unknown>[]
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
}

export function FilterPanel({ columns, rows, filters, onFilterChange }: FilterPanelProps) {
  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values: Record<string, string[]> = {}
    columns.forEach((col) => {
      const uniqueValues = [...new Set(rows.map((row) => String(row[col] ?? "")))].filter((v) => v !== "").sort()
      values[col] = uniqueValues
    })
    return values
  }, [columns, rows])

  const handleCheckboxChange = (column: string, value: string, checked: boolean) => {
    const currentFilters = filters[column] || []
    let newFilters: string[]

    if (checked) {
      newFilters = [...currentFilters, value]
    } else {
      newFilters = currentFilters.filter((v) => v !== value)
    }

    onFilterChange({
      ...filters,
      [column]: newFilters.length > 0 ? newFilters : undefined,
    })
  }

  const clearAllFilters = () => {
    onFilterChange({})
  }

  const activeFilterCount = Object.values(filters).filter((v) => v && v.length > 0).length

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      <Accordion type="multiple" className="w-full">
        {columns.map((column) => {
          const values = columnValues[column]
          if (values.length === 0 || values.length > 50) return null

          const selectedCount = filters[column]?.length || 0

          return (
            <AccordionItem key={column} value={column} className="border-b border-border">
              <AccordionTrigger className="text-sm py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="truncate">{column}</span>
                  {selectedCount > 0 && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-primary text-primary-foreground">
                      {selectedCount}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {values.map((value) => {
                      const isChecked = filters[column]?.includes(value) || false
                      const id = `${column}-${value}`

                      return (
                        <div key={id} className="flex items-center space-x-2">
                          <Checkbox
                            id={id}
                            checked={isChecked}
                            onCheckedChange={(checked) => handleCheckboxChange(column, value, checked === true)}
                          />
                          <Label htmlFor={id} className="text-sm text-muted-foreground cursor-pointer truncate flex-1">
                            {value}
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
