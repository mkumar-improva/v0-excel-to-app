"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    ThumbsUp,
    RefreshCw,
    ArrowLeft,
    Monitor,
    CheckCircle2,
    ArrowRight,
    AlertTriangle,
    XCircle
} from "lucide-react"
import { ResponseData } from "@/lib/types"
import { isSimilarValue } from "@/lib/data-comparison"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AILoader } from "@/components/ai-loader"

interface ApprovalWorkspaceProps {
    data: ResponseData
    onClose: () => void
    onApprove?: (editedData?: ResponseData) => void
    onReiterate?: () => void
    onReject?: () => void
    isApproved: boolean
}

export function ApprovalWorkspace({ data, onClose, onApprove, onReiterate, onReject, isApproved }: ApprovalWorkspaceProps) {
    const [currentRefIndex, setCurrentRefIndex] = useState(0)
    const [iframeError, setIframeError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // State for editable validated data
    const [editedValidatedData, setEditedValidatedData] = useState<Record<string, any>>(
        data.validated_data || {}
    )

    const references = data.source_references || []
    const hasReferences = references.length > 0
    const currentRef = hasReferences ? references[currentRefIndex] : null

    useEffect(() => {
        // Reset state when changing references
        setIframeError(false)
        setIsLoading(true)
    }, [currentRefIndex])

    const handleNext = () => {
        if (currentRefIndex < references.length - 1) {
            setCurrentRefIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentRefIndex > 0) {
            setCurrentRefIndex(prev => prev - 1)
        }
    }

    const handleFieldEdit = (key: string, value: string) => {
        setEditedValidatedData(prev => ({
            ...prev,
            [key]: value
        }))
    }

    const handleApprove = () => {
        // Create updated data object with edited values
        const updatedData: ResponseData = {
            ...data,
            validated_data: editedValidatedData
        }
        onApprove?.(updatedData)
    }

    const allKeys = new Set([
        ...Object.keys(data.original_input || {}),
        ...Object.keys(editedValidatedData || {})
    ])

    const comparisonRows = Array.from(allKeys).map(key => {
        const original = data.original_input?.[key]
        const validated = editedValidatedData?.[key]
        // Use fuzzy comparison exported from ResponseViewer
        const hasChanged = !isSimilarValue(original, validated, key)

        return { key, original, validated, hasChanged }
    })

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Top Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Summary
                    </Button>
                    <div className="h-6 w-px bg-border" />
                    <h2 className="font-semibold text-sm flex items-center gap-2 text-primary">
                        <Monitor className="h-4 w-4 text-primary" />
                        Verification Workspace
                    </h2>
                </div>

                {
                    !isApproved ? (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onReiterate?.()}
                                className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-900/50 dark:text-orange-400"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Re-iterate
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleApprove}
                                className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
                            >
                                <ThumbsUp className="h-4 w-4" />
                                Approve Data
                            </Button>
                        </div>
                    )
                        :
                        (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onReject?.()}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                </Button>
                                <div className="flex items-center text-success px-4 py-1 bg-success/10 rounded-md border border-success/20">
                                    <CheckCircle2 className="mr-2 h-5 w-5" strokeWidth={1.7} />
                                    Approved
                                </div>
                            </div>
                        )
                }


            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Data Comparison */}
                <div className="w-[400px] border-r flex flex-col bg-muted/10 shrink-0">
                    <div className="p-4 border-b bg-card">
                        <h3 className="font-semibold text-sm">Data Comparison</h3>
                        <p className="text-xs text-muted-foreground mt-1">Review changes before approving</p>
                    </div>
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="p-4 space-y-4 overflow-y-auto ">
                            {comparisonRows.map(({ key, original, validated, hasChanged }) => (
                                <div key={key} className={cn(
                                    "text-sm border rounded-lg overflow-hidden bg-card shadow-sm transition-all",
                                    hasChanged ? "ring-1 ring-warning/30" : "ring-1 ring-success/30"
                                )}>
                                    <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                                        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">{key}</span>
                                        {hasChanged && <Badge variant="secondary" className="bg-warning/20 text-warning hover:bg-warning/30 text-[10px] h-5">Changed</Badge>}
                                    </div>
                                    <div className="p-3 space-y-3">
                                        <div>
                                            <div className="text-[10px] text-muted-foreground mb-1 uppercase">Original</div>
                                            <div className="text-muted-foreground line-through decoration-muted-foreground/50">
                                                {original || <span className="opacity-50 italic">Empty</span>}
                                            </div>
                                        </div>
                                        {hasChanged && (
                                            <div className="flex justify-center opacity-20">
                                                <ArrowRight className="h-4 w-4 rotate-90" />
                                            </div>
                                        )}
                                        <div>
                                            <div className={cn(
                                                "text-[10px] mb-1 uppercase font-semibold",
                                                hasChanged ? "text-warning" : "text-success"
                                            )}>Validated {!isApproved && <span className="text-muted-foreground font-normal">(Editable)</span>}</div>
                                            {isApproved ? (
                                                <div className={cn(
                                                    "font-medium",
                                                    hasChanged ? "text-warning-foreground" : ""
                                                )}>
                                                    {validated || <span className="opacity-50 italic">Empty</span>}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={validated || ""}
                                                    onChange={(e) => handleFieldEdit(key, e.target.value)}
                                                    className={cn(
                                                        "w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary/50",
                                                        hasChanged ? "border-warning/50 bg-warning/5" : "border-success/50 bg-success/5"
                                                    )}
                                                    placeholder="Enter value..."
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="h-12" />
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel - Reference Browser */}
                <div className="flex-1 flex flex-col bg-background h-full overflow-hidden">
                    {hasReferences ? (
                        <>
                            {/* Browser Bar */}
                            <div className="h-12 border-b flex items-center px-2 gap-2 bg-muted/20 shrink-0">
                                <div className="flex items-center gap-1 border-r pr-2 mr-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handlePrev}
                                        disabled={currentRefIndex === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleNext}
                                        disabled={currentRefIndex === references.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex-1 bg-background border rounded-md h-8 flex items-center px-3 text-sm text-muted-foreground truncate font-mono">
                                    {currentRef && (
                                        <>
                                            <div className="mr-2 font-semibold text-foreground px-1.5 py-0.5 bg-muted rounded text-xs">
                                                {currentRefIndex + 1} / {references.length}
                                            </div>
                                            <span className="truncate">{currentRef.url}</span>
                                        </>
                                    )}
                                </div>

                                {iframeError ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIframeError(false)}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Retry Preview</span>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIframeError(true)}
                                        title="Click here if the preview is blank or broken"
                                    >
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">Preview Blocked?</span>
                                    </Button>
                                )}

                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-2"
                                    onClick={() => currentRef && window.open(currentRef.url, '_blank')}
                                    title="Open content in a new browser tab"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Open in Browser</span>
                                </Button>
                            </div>

                            {/* Iframe Area */}
                            <div className="flex-1 relative bg-white">
                                {isLoading && !iframeError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                        <AILoader message="Loading preview..." />
                                    </div>
                                )}
                                {!iframeError && currentRef ? (
                                    <iframe
                                        src={currentRef.url}
                                        className="w-full h-full border-0"
                                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                        referrerPolicy="no-referrer"
                                        onLoad={() => setIsLoading(false)}
                                        onError={() => {
                                            setIframeError(true)
                                            setIsLoading(false)
                                        }}
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
                                        <div className="bg-background p-6 rounded-full mb-4 shadow-sm border">
                                            <ExternalLink className="h-12 w-12 opacity-20" />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground mb-2">Content cannot be displayed inline</h3>
                                        <p className="max-w-md mb-6 text-sm">
                                            This website likely prevents being displayed inside other pages (privacy/security settings).
                                            <br className="mb-2" />
                                            Please open it directly in your browser.
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => currentRef && window.open(currentRef.url, '_blank')}
                                            className="gap-2"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Open in New Tab
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <Monitor className="h-12 w-12 mb-4 opacity-20" />
                            <p>No source references available to display.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
