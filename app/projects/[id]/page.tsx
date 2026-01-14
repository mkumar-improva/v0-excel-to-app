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
import { ChevronLeft, Upload, FileText, Loader2, RefreshCw, BarChart3, Table, Settings } from "lucide-react"
import Link from "next/link"
import { ProjectSettingsDialog } from "@/components/project-settings-dialog"

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
            const result = await api.projects.uploadFile(projectId, file)
            setRefreshTrigger(prev => prev + 1)
            setSelectedFileId(result.file.id)
        } catch (err) {
            console.error(err)
            alert("Upload failed")
        } finally {
            setUploading(false)
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
        </div>
    )
}
