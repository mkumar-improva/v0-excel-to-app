"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { Project } from "@/lib/types"
import { FileList } from "@/components/file-list"
import { ProjectViewer } from "@/components/project-viewer"
import { ProjectDashboard } from "@/components/project-dashboard"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Upload, FileText, Loader2, RefreshCw, BarChart3, Table, Settings, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { ProjectSettingsDialog } from "@/components/project-settings-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ProjectPage() {
    const params = useParams()
    const projectId = parseInt(params.id as string)
    const [project, setProject] = useState<Project | null>(null)
    const [selectedFileId, setSelectedFileId] = useState<number>(0)
    const [promptEditorOpen, setPromptEditorOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [uploading, setUploading] = useState(false)
    const [activeView, setActiveView] = useState<'dashboard' | 'data'>('data')
    
    // Multi-sheet upload states
    const [sheetSelectorOpen, setSheetSelectorOpen] = useState(false)
    const [availableSheets, setAvailableSheets] = useState<string[]>([])
    const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set())
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [pendingWorkbook, setPendingWorkbook] = useState<any>(null)


    useEffect(() => {
        loadProject()
    }, [projectId])

    // Apply project theme
    useEffect(() => {
        if (!project?.theme) return

        try {
            const theme = typeof project.theme === 'string' ? JSON.parse(project.theme) : project.theme
            if (theme?.primary) {
                const root = document.documentElement
                root.style.setProperty('--primary', theme.primary)
                // Optionally calculate primary-foreground or other shades if needed, 
                // but usually just primary is sufficient for a simple re-theme
            }
        } catch (e) {
            console.error("Failed to apply theme", e)
        }

        // Cleanup function to reset theme when leaving project page
        return () => {
            document.documentElement.style.removeProperty('--primary')
        }
    }, [project?.theme])

    const loadProject = async () => {
        try {
            const data = await api.projects.get(projectId)
            setProject(data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            
            // Read and parse Excel file in browser using sheetjs
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const data = event.target?.result
                    const XLSX = await import('xlsx')
                    const workbook = XLSX.read(data, { type: 'array' })
                    const sheetNames = workbook.SheetNames

                    if (sheetNames.length <= 1) {
                        // Normal single-sheet upload flow
                        const result = await api.projects.uploadFile(projectId, file)
                        setRefreshTrigger(prev => prev + 1)
                        setSelectedFileId(result.file.id)
                        setUploading(false)
                    } else {
                        // Open sheet selector dialog for multi-sheet file
                        setPendingFile(file)
                        setPendingWorkbook(workbook)
                        setAvailableSheets(sheetNames)
                        setSelectedSheets(new Set(sheetNames)) // Select all by default
                        setSheetSelectorOpen(true)
                        setUploading(false)
                    }
                } catch (err) {
                    console.error("Failed to read Excel file:", err)
                    alert("Failed to read Excel file structure")
                    setUploading(false)
                }
            }
            reader.readAsArrayBuffer(file)
        } catch (err) {
            console.error(err)
            alert("Upload failed")
            setUploading(false)
        }
    }

    const handleImportSelectedSheets = async () => {
        if (!pendingFile || !pendingWorkbook || selectedSheets.size === 0) return

        try {
            setUploading(true)
            const XLSX = await import('xlsx')
            let lastFileId = 0

            for (const sheetName of Array.from(selectedSheets)) {
                // Create a single-sheet workbook
                const newWorkbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(newWorkbook, pendingWorkbook.Sheets[sheetName], sheetName)
                
                // Write to array buffer
                const wbout = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' })
                
                // Construct clean filename
                const cleanName = pendingFile.name.replace(/\.[^/.]+$/, "")
                const sheetFile = new File(
                    [wbout], 
                    `${cleanName} - ${sheetName}.xlsx`, 
                    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                )

                const result = await api.projects.uploadFile(projectId, sheetFile)
                lastFileId = result.file.id
            }

            setRefreshTrigger(prev => prev + 1)
            if (lastFileId) {
                setSelectedFileId(lastFileId)
            }
            setSheetSelectorOpen(false)
        } catch (err) {
            console.error("Error importing sheets:", err)
            alert("Failed to import some sheets")
        } finally {
            setUploading(false)
            setPendingFile(null)
            setPendingWorkbook(null)
        }
    }

    const handleTemplateUpdate = (newTemplate: string) => {
        if (project) {
            setProject({ ...project, prompt_template: newTemplate })
        }
    }

    if (!project) return null

    return (
        <div className="flex flex-col h-screen bg-background">
            <ProjectSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                project={project}
                onProjectUpdated={setProject}
            />

            {/* Top Header */}
            <header className="h-14 border-b flex items-center px-4 bg-card shrink-0 z-10 gap-4">
                <Link href="/">
                    <Button variant="ghost" size="sm">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div className="flex items-center gap-2">
                    <div>
                        <h1 className="font-semibold">{project.name}</h1>
                        {project.description && (
                            <p className="text-xs text-muted-foreground">{project.description}</p>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-muted-foreground" onClick={() => setSettingsOpen(true)}>
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {/* View Toggle */}
                    <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
                        <TabsList>
                            <TabsTrigger value="dashboard" className="gap-2">
                                <BarChart3 className="h-4 w-4" />
                                Dashboard
                            </TabsTrigger>
                            <TabsTrigger value="data" className="gap-2">
                                <Table className="h-4 w-4" />
                                Data
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {activeView === 'data' && (
                        <>
                            {selectedFileId !== 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                                    title="Refresh Data"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            )}
                            <label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    className="hidden"
                                    onChange={handleUpload}
                                    disabled={uploading}
                                />
                                <Button variant="secondary" size="sm" className="cursor-pointer" asChild disabled={uploading}>
                                    <span>
                                        {uploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Excel
                                            </>
                                        )}
                                    </span>
                                </Button>
                            </label>

                            {selectedFileId !== 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPromptEditorOpen(true)}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Edit Prompt
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {activeView === 'dashboard' ? (
                    <div className="flex-1 overflow-auto bg-background">
                        <ProjectDashboard
                            projectId={projectId}
                            projectName={project.name}
                        />
                    </div>
                ) : (
                    <>
                        <FileList
                            projectId={projectId}
                            selectedFileId={selectedFileId}
                            onFileSelect={setSelectedFileId}
                            refreshTrigger={refreshTrigger}
                        />

                        <div className="flex-1 bg-muted/10 relative overflow-hidden">
                            {selectedFileId ? (
                                <ProjectViewer
                                    fileId={selectedFileId}
                                    project={project}
                                    promptEditorOpen={promptEditorOpen}
                                    onPromptEditorOpenChange={setPromptEditorOpen}
                                    onTemplateUpdate={handleTemplateUpdate}
                                    refreshTrigger={refreshTrigger}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <h3 className="text-lg font-medium mb-2">No file selected</h3>
                                        <p>Select a file from the sidebar or upload a new one.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Dialog open={sheetSelectorOpen} onOpenChange={setSheetSelectorOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            Select Sheets to Import
                        </DialogTitle>
                        <DialogDescription>
                            This Excel file contains multiple sheets. Please choose which sheets you want to import.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                {selectedSheets.size} of {availableSheets.length} selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setSelectedSheets(new Set(availableSheets))}
                                >
                                    Select All
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => setSelectedSheets(new Set())}
                                >
                                    Deselect All
                                </Button>
                            </div>
                        </div>

                        <ScrollArea className="h-[200px] border rounded-md p-3 bg-muted/10">
                            <div className="space-y-2">
                                {availableSheets.map(sheetName => {
                                    const isSelected = selectedSheets.has(sheetName)
                                    return (
                                        <div
                                            key={sheetName}
                                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                                            onClick={() => {
                                                const next = new Set(selectedSheets)
                                                if (next.has(sheetName)) {
                                                    next.delete(sheetName)
                                                } else {
                                                    next.add(sheetName)
                                                }
                                                setSelectedSheets(next)
                                            }}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => {}} // handled by click handler above
                                            />
                                            <span className="text-sm font-medium text-foreground truncate">{sheetName}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSheetSelectorOpen(false)} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImportSelectedSheets}
                            disabled={selectedSheets.size === 0 || uploading}
                            className="gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>Import Selected</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
