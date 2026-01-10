"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ExcelData, SavedSession, ExportData } from "@/lib/types"

const STORAGE_KEY = "excel-to-app-sessions"
const CURRENT_SESSION_KEY = "excel-to-app-current"

interface StorageDialogProps {
  currentData: ExcelData | null
  promptTemplate: string
  onDataLoad: (data: ExcelData, template: string) => void
  trigger: React.ReactNode
}

export function StorageDialog({ currentData, promptTemplate, onDataLoad, trigger }: StorageDialogProps) {
  const [open, setOpen] = useState(false)
  const [sessions, setSessions] = useState<SavedSession[]>([])
  const [sessionName, setSessionName] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSessions(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse stored sessions:", e)
      }
    }

    // Auto-load current session if exists
    const current = localStorage.getItem(CURRENT_SESSION_KEY)
    if (current) {
      try {
        const { data, template } = JSON.parse(current)
        if (data && template) {
          onDataLoad(data, template)
        }
      } catch (e) {
        console.error("Failed to parse current session:", e)
      }
    }
  }, [])

  // Auto-save current session
  useEffect(() => {
    if (currentData) {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify({ data: currentData, template: promptTemplate }))
    }
  }, [currentData, promptTemplate])

  const handleSaveSession = () => {
    if (!currentData || !sessionName.trim()) return

    setSaveStatus("saving")

    const newSession: SavedSession = {
      id: Date.now().toString(),
      name: sessionName.trim(),
      data: currentData,
      promptTemplate,
      savedAt: new Date().toISOString(),
    }

    const updatedSessions = [...sessions, newSession]
    setSessions(updatedSessions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))
    setSessionName("")

    setSaveStatus("success")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  const handleLoadSession = (session: SavedSession) => {
    onDataLoad(session.data, session.promptTemplate)
    setOpen(false)
  }

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter((s) => s.id !== id)
    setSessions(updatedSessions)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions))
  }

  const handleExport = () => {
    const exportData: ExportData = {
      version: "1.0",
      sessions,
      currentSession: currentData ? { data: currentData, promptTemplate } : undefined,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `excel-to-app-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importData: ExportData = JSON.parse(event.target?.result as string)

        if (importData.sessions) {
          const mergedSessions = [...sessions]
          importData.sessions.forEach((imported) => {
            if (!mergedSessions.find((s) => s.id === imported.id)) {
              mergedSessions.push(imported)
            }
          })
          setSessions(mergedSessions)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSessions))
        }

        if (importData.currentSession) {
          onDataLoad(importData.currentSession.data, importData.currentSession.promptTemplate)
        }
      } catch (err) {
        console.error("Failed to import data:", err)
        alert("Failed to import. Please check the file format.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleSync = () => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSessions(JSON.parse(stored))
    }
    const current = localStorage.getItem(CURRENT_SESSION_KEY)
    if (current) {
      const { data, template } = JSON.parse(current)
      if (data && template) {
        onDataLoad(data, template)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Storage Manager</DialogTitle>
          <DialogDescription>Save, load, import, or export your sessions</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Save Current Session */}
          {currentData && (
            <div className="space-y-2">
              <Label htmlFor="session-name" className="text-sm">
                Save Current Session
              </Label>
              <div className="flex gap-2">
                <Input
                  id="session-name"
                  placeholder="Session name..."
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSaveSession}
                  disabled={!sessionName.trim() || saveStatus === "saving"}
                  variant="outline"
                >
                  {saveStatus === "success" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Saved Sessions List */}
          {sessions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Saved Sessions</Label>
              <ScrollArea className="h-40 rounded-md border border-border">
                <div className="p-2 space-y-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                    >
                      <button onClick={() => handleLoadSession(session)} className="flex-1 text-left">
                        <p className="text-sm font-medium truncate">{session.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.savedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <Button
                        onClick={() => handleDeleteSession(session.id)}
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Import/Export/Sync Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={handleSync} variant="outline" className="text-sm bg-transparent">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" className="text-sm w-full pointer-events-none bg-transparent" asChild>
                <span>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Import
                </span>
              </Button>
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <Button onClick={handleExport} variant="outline" className="text-sm bg-transparent">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Data is saved locally in your browser. Use Export to backup.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
