"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { Project } from "@/lib/types"
import { FileList } from "@/components/file-list"
import { ProjectViewer } from "@/components/project-viewer"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Upload, FileText, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function ProjectPage() {
    const params = useParams()
    const projectId = parseInt(params.id as string)
    const [project, setProject] = useState<Project | null>(null)
    const [selectedFileId, setSelectedFileId] = useState<number>(0)
    const [promptEditorOpen, setPromptEditorOpen] = useState(false)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        loadProject()
    }, [projectId])

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
            {/* Top Header */}
            <header className="h-14 border-b flex items-center px-4 bg-card shrink-0 z-10">
                <Link href="/">
                    <Button variant="ghost" size="sm" className="mr-4">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>
                <div>
                    <h1 className="font-semibold">{project.name}</h1>
                    {project.description && (
                        <p className="text-xs text-muted-foreground">{project.description}</p>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
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
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
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
            </div>
        </div>
    )
}
