"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface PromptEditorProps {
  template: string
  onTemplateChange: (template: string) => void
  columns: string[]
}

export function PromptEditor({ template, onTemplateChange, columns }: PromptEditorProps) {
  const [localTemplate, setLocalTemplate] = useState(template)
  const [isPending, startTransition] = useTransition()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Sync from parent when template changes externally (e.g., loading a session)
  useEffect(() => {
    setLocalTemplate(template)
  }, [template])

  const handleChange = (value: string) => {
    setLocalTemplate(value)

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the parent update to prevent blocking
    timeoutRef.current = setTimeout(() => {
      startTransition(() => {
        onTemplateChange(value)
      })
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const insertPlaceholder = (column: string) => {
    const placeholder = `{{${column}}}`
    const textarea = textareaRef.current

    if (!textarea) {
      const newTemplate = localTemplate + placeholder
      setLocalTemplate(newTemplate)
      startTransition(() => onTemplateChange(newTemplate))
      return
    }

    const { selectionStart, selectionEnd } = textarea
    const before = localTemplate.slice(0, selectionStart)
    const after = localTemplate.slice(selectionEnd)
    const nextValue = `${before}${placeholder}${after}`

    setLocalTemplate(nextValue)
    startTransition(() => onTemplateChange(nextValue))

    const caret = selectionStart + placeholder.length
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(caret, caret)
      }
    })
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-foreground mb-2">Prompt Template</h2>
      <p className="text-xs text-muted-foreground mb-4">Use {"{{ColumnName}}"} syntax to insert row values</p>

      <Textarea
        ref={textareaRef}
        value={localTemplate}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter your prompt template..."
        className="min-h-[200px] max-h-[500px] font-mono text-sm resize-none mb-4"
      />

      {columns.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Available Columns</h3>
          <div className="flex flex-wrap gap-1.5">
            {columns.map((column) => (
              <Badge
                key={column}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors text-xs"
                onClick={() => insertPlaceholder(column)}
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
