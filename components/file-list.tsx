"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api-client"
import { ExcelFileDB } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { FileSpreadsheet, Menu, Trash2, Plus, Upload, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface FileListProps {
    projectId: number
    selectedFileId: number | null
    onFileSelect: (fileId: number) => void
    refreshTrigger: number
}

export function FileList({ projectId, selectedFileId, onFileSelect, refreshTrigger }: FileListProps) {
    const [files, setFiles] = useState<ExcelFileDB[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [collapsed, setCollapsed] = useState(false)

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true)
            const data = await api.projects.listFiles(projectId)
            setFiles(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [projectId])

    useEffect(() => {
        loadFiles()
    }, [loadFiles, refreshTrigger])



    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation()
        if (!confirm("Delete this file?")) return

        try {
            await api.files.delete(id)
            await loadFiles()
            if (selectedFileId === id) {
                onFileSelect(0) // Deselect
            }
        } catch (err) {
            console.error(err)
        }
    }

    const FileListContent = () => (
        <div className="flex-col bg-card h-full transition-all duration-300 ease-in-out relative flex w-full min-w-0 overflow-hidden">
            {/* Removed internal upload button section */}
            <div className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden">
                <div className="p-2 space-y-2 w-full min-w-0 flex flex-col">
                    {loading ? (
                        <p className="p-4 text-sm text-center text-muted-foreground">Loading files...</p>
                    ) : files.length === 0 ? (
                        <p className="p-4 text-sm text-center text-muted-foreground">No files uploaded yet.</p>
                    ) : (
                        files.map((file) => (
                            <div
                                key={file.id}
                                onClick={() => onFileSelect(file.id)}
                                className={`
                  group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors gap-2 w-full min-w-0
                  ${selectedFileId === file.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted"
                                    }
                `}
                            >
                                <div className="flex items-center min-w-0 flex-1">
                                    <FileSpreadsheet className="mr-3 h-4 w-4 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate" title={file.file_name}>{file.file_name}</p>
                                        <p className={`text-xs truncate ${selectedFileId === file.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                            {formatDistanceToNow(new Date(file.uploaded_at))} ago
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`
                    h-8 w-8 flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity
                    ${selectedFileId === file.id 
                                            ? "hover:bg-primary-foreground/20 text-primary-foreground hover:text-white" 
                                            : "text-muted-foreground hover:text-red-500 hover:bg-destructive/10"
                                        }
                  `}
                                    onClick={(e) => handleDelete(e, file.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* Desktop Sidebar */}
            <div
                className={`hidden md:flex flex-col border-r bg-card h-full transition-all duration-300 ease-in-out relative flex-shrink-0 min-w-0 ${collapsed ? "w-12" : "w-64"
                    }`}
            >
                <div className="absolute -right-3 top-3 z-50">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full border border-border bg-card shadow-sm hover:bg-accent"
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </Button>
                </div>

                {!collapsed ? (
                    <>
                        <div className="p-4 font-semibold border-b">Project Files</div>
                        <FileListContent />
                    </>
                ) : (
                    <div className="flex flex-col items-center pt-4 gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCollapsed(false)}
                            title="Expand Files"
                        >
                            <FileSpreadsheet className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile Drawer */}
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="fixed left-4 bottom-4 z-50 rounded-full shadow-lg">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-80">
                        <SheetHeader className="p-4 border-b">
                            <SheetTitle>Project Files</SheetTitle>
                        </SheetHeader>
                        <FileListContent />
                    </SheetContent>
                </Sheet>
            </div>
        </>
    )
}
