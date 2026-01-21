"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    DollarSign,
    TrendingUp,
    Activity,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    BarChart3
} from "lucide-react"
import { api } from "@/lib/api-client"
import { AILoader } from "./ai-loader"

interface UsageStats {
    totalRequests: number
    totalTokens: number
    totalCost: number
    successRate: number
    avgTokensPerRequest: number
    recentActivity: ActivityItem[]
}

interface ActivityItem {
    id: number
    entry_id: number
    created_at: string
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost: number
    status: string
    model: string
    prompt_preview: string
}

interface UsageViewerProps {
    projectId: number
}

export function UsageViewer({ projectId }: UsageViewerProps) {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<UsageStats | null>(null)
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadUsageData()
    }, [projectId, timeRange])

    const loadUsageData = async () => {
        try {
            setLoading(true)
            const analytics = await api.projects.getAnalytics(projectId, timeRange)
            setStats(analytics)
        } catch (err) {
            console.error("Failed to load usage data:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadUsageData()
        setRefreshing(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <AILoader message="Loading usage data..." />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No usage data available
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full p-6 space-y-6 overflow-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Usage & Analytics</h2>
                    <p className="text-sm text-muted-foreground">
                        Monitor AI processing and token consumption
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                        <TabsList>
                            <TabsTrigger value="7d">7 Days</TabsTrigger>
                            <TabsTrigger value="30d">30 Days</TabsTrigger>
                            <TabsTrigger value="all">All Time</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${stats.totalCost.toFixed(4)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats.totalRequests} requests
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalTokens.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Avg: {Math.round(stats.avgTokensPerRequest).toLocaleString()} per request
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.successRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {Math.round(stats.totalRequests * stats.successRate / 100)} successful
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Requests</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalRequests}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total API calls
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card className="flex-1">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        Latest AI generation requests and their token usage
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                            {stats.recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        {activity.status === 'approved' ? (
                                            <CheckCircle2 className="h-5 w-5 text-success" />
                                        ) : activity.status === 'rejected' ? (
                                            <XCircle className="h-5 w-5 text-destructive" />
                                        ) : (
                                            <Clock className="h-5 w-5 text-warning" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium truncate">
                                                    {activity.prompt_preview}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {new Date(activity.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="flex-shrink-0">
                                                {activity.model || 'gemini-2.5-flash'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Activity className="h-3 w-3" />
                                                {activity.total_tokens.toLocaleString()} tokens
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="h-3 w-3" />
                                                ${activity.estimated_cost.toFixed(6)}
                                            </span>
                                            <span className="text-muted-foreground/60">
                                                In: {activity.input_tokens.toLocaleString()} | Out: {activity.output_tokens.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No recent activity</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
