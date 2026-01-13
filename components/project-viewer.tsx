"use client"

import { useState, useCallback, useEffect } from "react"
import { api } from "@/lib/api-client"
import { DataTable } from "./data-table"
import { PromptEditor } from "./prompt-editor"
import { FilterPanel } from "./filter-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Loader2, ChevronLeft, Filter } from "lucide-react"
import { ExcelFileDB, FilterState, Project } from "@/lib/types"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ProjectViewerProps {
    fileId: number
    project: Project
    promptEditorOpen: boolean
    onPromptEditorOpenChange: (open: boolean) => void
    onTemplateUpdate: (template: string) => void
    refreshTrigger: number
}

export function ProjectViewer({
    fileId,
    project,
    promptEditorOpen,
    onPromptEditorOpenChange,
    onTemplateUpdate,
    refreshTrigger
}: ProjectViewerProps) {
    const [file, setFile] = useState<ExcelFileDB | null>(null)
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [promptTemplate, setPromptTemplate] = useState<string>(
        project.prompt_template || "Generate a summary for {{Name}}..."
    )
    const [filters, setFilters] = useState<FilterState>({})
    const [leftPanelOpen, setLeftPanelOpen] = useState(true)
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [activeTab, setActiveTab] = useState("in-queue")

    // Update local state when project prop changes (e.g. initial load)
    useEffect(() => {
        if (project.prompt_template) {
            setPromptTemplate(project.prompt_template)
        }
    }, [project.prompt_template])

    // Reset filters only when file changes
    useEffect(() => {
        setFilters({})
    }, [fileId])

    useEffect(() => {
        if (!fileId) return
        loadData()
    }, [fileId, refreshTrigger])

    const loadData = async () => {
        try {
            setLoading(true)
            const [fileData, entriesData] = await Promise.all([
                api.files.get(fileId),
                api.files.listEntries(fileId)
            ])

            setFile(fileData)

            const processedRows = entriesData.map(entry => ({
                ...entry.data,
                _entryId: entry.id, // Keep track of ID for responses
                _responseCount: entry.response_count || 0,
                _approvedCount: entry.approved_count || 0
            }))

            setRows(processedRows)

        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleTemplateSave = async () => {
        try {
            setSavingTemplate(true)
            await api.projects.update(project.id, {
                name: project.name,
                description: project.description,
                prompt_template: promptTemplate
            })
            onTemplateUpdate(promptTemplate)
            toast.success("Prompt template saved")
            onPromptEditorOpenChange(false)
        } catch (err) {
            console.error(err)
            toast.error("Failed to save template")
        } finally {
            setSavingTemplate(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!file) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a file to view data
            </div>
        )
    }

    const filteredRows = rows.filter((row) => {
        // Apply column filters
        const passesFilters = Object.entries(filters).every(([column, filterValues]) => {
            if (!filterValues || filterValues.length === 0) return true
            const cellValue = String(row[column] ?? "")
            return filterValues.includes(cellValue)
        })

        if (!passesFilters) return false

        // Apply tab filter
        const responseCount = row._responseCount || 0
        const approvedCount = row._approvedCount || 0

        switch (activeTab) {
            case "in-queue":
                return responseCount === 0
            case "generated":
                return responseCount > 0
            case "approved":
                return approvedCount > 0
            default:
                return true
        }
    })

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="flex items-center gap-4 border-b px-4 py-2 bg-background shrink-0">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold truncate">{file.file_name}</h2>
                    <p className="text-xs text-muted-foreground">{filteredRows.length} of {rows.length} rows</p>
                </div>
                <div className="flex-shrink-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList>
                            <TabsTrigger value="in-queue">In Queue</TabsTrigger>
                            <TabsTrigger value="generated">Generated</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
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
                                <FilterPanel columns={file.columns} rows={rows} filters={filters} onFilterChange={setFilters} />
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

                <main className="flex-1 overflow-hidden">
                    <DataTable
                        columns={file.columns}
                        rows={filteredRows}
                        promptTemplate={promptTemplate}
                    />
                </main>
            </div>

            <Dialog open={promptEditorOpen} onOpenChange={onPromptEditorOpenChange}>
                <DialogContent className="sm:max-w-[80vw] w-[80vw] max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Edit Prompt Template</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col h-[700px]">
                        <div className="flex-1 overflow-hidden">
                            <PromptEditor
                                template={promptTemplate}
                                onTemplateChange={setPromptTemplate}
                                columns={file.columns}
                            />
                        </div>
                        <div className="flex justify-end pt-4 gap-2 border-t mt-4">
                            <Button variant="outline" onClick={() => onPromptEditorOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleTemplateSave} disabled={savingTemplate}>
                                {savingTemplate ? "Saving..." : "Save Template"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
