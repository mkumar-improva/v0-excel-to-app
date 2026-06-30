"use client"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ExternalLink, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, Activity, Globe, Monitor, HelpCircle, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResponseData } from "@/lib/types"
import { isSimilarValue } from "@/lib/data-comparison"
import { ApprovalWorkspace } from "./approval-workspace"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThumbsUp, RefreshCw } from "lucide-react"

interface ResponseViewerProps {
    data: ResponseData
    rawJson: string
    onApprove?: (editedData?: any) => void
    onReject?: () => void
    onReiterate?: () => void
    status?: 'pending' | 'approved' | 'rejected'
    tokenUsage?: {
        inputTokens: number
        outputTokens: number
        totalTokens: number
        estimatedCost: number
    }
    matchPercentage?: number
}

export function ResponseViewer({ data, rawJson, onApprove, onReject, onReiterate, status = 'pending', tokenUsage, matchPercentage }: ResponseViewerProps) {
    const [showApprovalWorkspace, setShowApprovalWorkspace] = useState(false)
    const [revertedFields, setRevertedFields] = useState<Set<string>>(new Set())

    // If data doesn't look structured enough (missing key fields), fallback to raw JSON
    const isStructured = data.validated_data || data.data_quality_notes || data.source_references

    console.log(status)

    if (showApprovalWorkspace) {
        return (
            <ApprovalWorkspace
                data={data}
                onClose={() => setShowApprovalWorkspace(false)}
                onApprove={(editedData) => {
                    // Forward the edited data to the parent's onApprove
                    onApprove?.(editedData)
                    setShowApprovalWorkspace(false)
                }}
                onReiterate={() => {
                    onReiterate?.()
                    setShowApprovalWorkspace(false)
                }}
                onReject={() => {
                    onReject?.()
                    setShowApprovalWorkspace(false)
                }}
                isApproved={status === 'approved'}
            />
        )
    }

    if (!isStructured) {
        return (
            <div className="p-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mb-4 text-sm text-yellow-800 dark:text-yellow-200 flex gap-2 items-center">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Response format not recognized. Showing raw JSON.</span>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-mono break-words bg-muted/50 p-4 rounded-md">
                    {rawJson}
                </pre>
            </div>
        )
    }

    const confidencePercent = data.confidence_score ? Math.round(data.confidence_score * 100) : 0

    let matchPercent: number | null = null
    if (typeof data.match_score === 'number') {
        matchPercent = data.match_score <= 1.0 ? Math.round(data.match_score * 100) : Math.round(data.match_score)
    } else if (typeof matchPercentage === 'number') {
        matchPercent = matchPercentage
    }

    // Prepare comparison rows
    const allKeys = new Set([
        ...Object.keys(data.original_input || {}),
        ...Object.keys(data.validated_data || {})
    ])

    const comparisonRows = Array.from(allKeys).map(key => {
        const original = data.original_input?.[key]
        const validated = data.validated_data?.[key]
        // Use fuzzy comparison instead of strict JSON comparison
        const hasChanged = !isSimilarValue(original, validated, key)

        return { key, original, validated, hasChanged }
    })

    const COST_PER_MILLION_TOKENS = 2.00

    function calculateCost(totalTokens: number): number {
        return (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header Section */}
            <div className="flex items-center justify-between p-4 border-b bg-card">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">Analysis Result</span>
                    </div>
                    {data.status && (
                        <Badge variant={data.status === "Active" ? "default" : "secondary"} className={
                            data.status === "Active" ? "bg-green-500 hover:bg-green-600" : ""
                        }>
                            {data.status}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 relative group cursor-help">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className={cn(
                            "font-bold",
                            confidencePercent >= 90 ? "text-green-600 dark:text-green-400" :
                                confidencePercent >= 70 ? "text-yellow-600 dark:text-yellow-400" :
                                    "text-red-600 dark:text-red-400"
                        )}>
                            {confidencePercent}%
                        </span>
                        <HelpCircle className="h-4 w-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
                        
                        {/* Hover Tooltip Box */}
                        <div className="absolute top-full right-0 mt-2 hidden group-hover:flex flex-col gap-2 p-4 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 w-80 text-xs font-normal pointer-events-none transition-all duration-200">
                            <h5 className="font-semibold text-sm border-b pb-1.5 mb-1 text-foreground">Confidence Score Reasoning</h5>
                            <p className="leading-relaxed text-foreground font-medium">
                                Why {confidencePercent}%?
                            </p>
                            <p className="leading-relaxed text-muted-foreground">
                                {data.confidence_score_explanation || data.data_quality_notes || `This score represents the level of certainty based on verified source matching.`}
                            </p>
                        </div>
                    </div>

                    {matchPercent !== null && (
                        <div className="flex items-center gap-2 border-l pl-6">
                            <span className="text-muted-foreground">Data Match:</span>
                            <span className={cn(
                                "font-bold",
                                matchPercent === 100 ? "text-green-600 dark:text-green-400" :
                                    matchPercent >= 80 ? "text-yellow-600 dark:text-yellow-400" :
                                        "text-red-600 dark:text-red-400"
                            )}>
                                {matchPercent}%
                            </span>
                        </div>
                    )}

                    {tokenUsage && (
                        <div className="flex items-center gap-8 border-l pl-6">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Tokens</span>
                                <span className="text-xs text-center font-medium">
                                    {tokenUsage.totalTokens.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground text-center">Cost</span>
                                <span className="text-xs font-medium text-primary">
                                    ${calculateCost(tokenUsage.totalTokens).toFixed(3)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <ScrollArea className="flex-1 p-6">
                    <div className=" w-full space-y-8">

                        {/* Insights / Notes */}
                        {data.data_quality_notes && (
                            <section>
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                    AI Insights
                                </h3>
                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800/50 text-sm leading-relaxed">
                                    {data.data_quality_notes}
                                </div>
                            </section>
                        )}

                        {/* Data Comparison */}
                        <section>
                            <h3 className="text-lg font-semibold mb-4">Data Verification</h3>
                            <div className="border rounded-md overflow-hidden bg-card">
                                <div className="grid grid-cols-12 bg-muted/50 p-3 text-xs font-medium text-muted-foreground border-b text-center sm:text-left">
                                    <div className="col-span-3 sm:col-span-3">Field</div>
                                    <div className="col-span-4 sm:col-span-4">Original Input</div>
                                    <div className="col-span-1 sm:col-span-1 text-center"></div>
                                    <div className="col-span-4 sm:col-span-4">Validated Data</div>
                                </div>
                                <div className="divide-y">
                                    {comparisonRows.map(({ key, original, validated, hasChanged }) => {
                                        const isReverted = revertedFields.has(key)
                                        const displayValue = isReverted ? original : validated

                                        return (
                                            <div key={key} className={cn(
                                                "grid grid-cols-12 p-3 text-sm items-center transition-colors",
                                                hasChanged
                                                    ? (isReverted ? "bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20" : "bg-warning/20 hover:bg-warning/30")
                                                    : "bg-success/20 hover:bg-success/30"
                                            )}>
                                                <div className="col-span-3 sm:col-span-3 font-medium text-muted-foreground truncate" title={key}>
                                                    {key}
                                                </div>
                                                <div className="col-span-4 sm:col-span-4 truncate text-muted-foreground" title={String(original ?? "")}>
                                                    {original ?? <span className="italic text-xs opacity-50">Empty</span>}
                                                </div>
                                                <div className="col-span-1 sm:col-span-1 flex justify-center">
                                                    {hasChanged && (
                                                        <button
                                                           disabled={status === 'approved'}
                                                            onClick={() => {
                                                                setRevertedFields(prev => {
                                                                    const next = new Set(prev)
                                                                    if (next.has(key)) {
                                                                        next.delete(key)
                                                                    } else {
                                                                        next.add(key)
                                                                    }
                                                                    return next
                                                                })
                                                            }}
                                                            className={cn(
                                                                "p-1 rounded-md transition-colors cursor-pointer",
                                                                isReverted
                                                                    ? "text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                                                    : "text-muted-foreground/50 hover:text-warning hover:bg-warning/10"
                                                            )}
                                                            title={isReverted ? "Click to use verified data" : "Click to revert to original"}
                                                        >
                                                            {isReverted ? (
                                                                <ArrowLeft className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowRight className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "col-span-4 sm:col-span-4 font-medium truncate",
                                                    hasChanged
                                                        ? (isReverted ? "text-blue-600 dark:text-blue-400" : "text-warning")
                                                        : "text-foreground"
                                                )} title={String(displayValue ?? "")}>
                                                    {displayValue ?? <span className="italic text-xs opacity-50">Empty</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                </ScrollArea>

                {/* Right Sidebar - References */}
                {data.source_references && data.source_references.length > 0 && (
                    <div className="w-80 border-l bg-muted/10 flex flex-col shrink-0">
                        <div className="p-4 border-b">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">References</h4>
                        </div>
                        <ScrollArea className="flex-1 p-4 h-full">
                            <div className="space-y-3">
                                {data.source_references.map((source, idx) => (
                                    <a
                                        key={idx}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block group p-3 rounded-md border bg-card hover:shadow-md transition-all duration-200 hover:border-primary/50"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                                {source.source_name}
                                            </div>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 truncate opacity-70">
                                            {new URL(source.url).hostname}
                                        </div>
                                    </a>
                                ))}
                                <div className="h-16" />
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
            {/* Action Buttons */}
            <div className="p-4 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex justify-end gap-3 shrink-0 z-10">
                {status === 'approved' ? (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setShowApprovalWorkspace(true)}
                            className="bg-muted hover:bg-muted/80 hover:text-foreground transition-all mr-auto cursor-pointer"
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            Verify with Sources
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject?.()}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Undo2 className="mr-2 h-4 w-4" />
                            Revert to Queue
                        </Button>
                        <div className="flex items-center text-success font-medium px-4 py-2 bg-success/10 rounded-md border border-success/20">
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Approved
                        </div>
                    </>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setShowApprovalWorkspace(true)}
                            className="bg-muted hover:bg-muted/80 hover:text-foreground transition-all mr-auto cursor-pointer"
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                            Verify with Sources
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => onReiterate?.()}
                            className="text-warning border-warning/30 hover:bg-warning/10 hover:text-warning hover:border-warning transition-all"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Re-iterate with more sources
                        </Button>

                        <Button
                            onClick={() => {
                                if (revertedFields.size > 0) {
                                    // Build modified data with reverted fields
                                    const editedData = { ...data }
                                    if (editedData.validated_data) {
                                        editedData.validated_data = { ...editedData.validated_data }
                                        revertedFields.forEach(key => {
                                            if (data.original_input?.[key] !== undefined) {
                                                editedData.validated_data![key] = data.original_input[key]
                                            }
                                        })
                                    }
                                    onApprove?.(editedData)
                                } else {
                                    onApprove?.()
                                }
                            }}
                            className="bg-success hover:bg-success/90 text-success-foreground shadow-sm hover:shadow transition-all"
                        >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Approve{revertedFields.size > 0 ? ` (${revertedFields.size} reverted)` : ''}
                        </Button>
                    </>
                )}
            </div>
        </div >
    )
}
