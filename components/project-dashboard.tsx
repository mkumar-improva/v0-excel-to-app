"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    Area, AreaChart
} from 'recharts'
import {
    TrendingUp, DollarSign, Zap, CheckCircle2,
    Clock, FileText, Activity, Calendar
} from "lucide-react"
import { format, parseISO, startOfDay, subDays } from 'date-fns'
import { api } from "@/lib/api-client"
import { AILoader } from "@/components/ai-loader"

interface ProjectDashboardProps {
    projectId: number
    projectName: string
}

interface AnalyticsData {
    totalResponses: number
    approvedResponses: number
    pendingResponses: number
    totalTokens: number
    totalCost: number
    avgTokensPerResponse: number
    avgCostPerResponse: number
    totalEntries: number
    entriesWithResponses: number
    entriesApproved: number
    timeSeriesData: Array<{
        date: string
        responses: number
        tokens: number
        cost: number
    }>
    statusDistribution: Array<{
        name: string
        value: number
        color: string
    }>
    dailyActivity: Array<{
        date: string
        generated: number
        approved: number
    }>
}

const COLORS = {
    approved: 'oklch(0.62 0.16 145)',      // Success green from theme
    pending: 'oklch(0.70 0.16 55)',        // Warning amber from theme
    rejected: 'oklch(0.577 0.245 27.325)', // Destructive red from theme
    primary: 'oklch(0.57 0.23 27)'         // Primary red from theme
}

export function ProjectDashboard({ projectId, projectName }: ProjectDashboardProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')

    useEffect(() => {
        loadAnalytics()
    }, [projectId, timeRange])

    const loadAnalytics = async () => {
        try {
            setLoading(true)
            const data = await api.projects.getAnalytics(projectId, timeRange)
            setAnalytics(data)
        } catch (error) {
            console.error('Failed to load analytics:', error)
            // Fallback to empty data on error
            setAnalytics({
                totalResponses: 0,
                approvedResponses: 0,
                pendingResponses: 0,
                totalTokens: 0,
                totalCost: 0,
                avgTokensPerResponse: 0,
                avgCostPerResponse: 0,
                totalEntries: 0,
                entriesWithResponses: 0,
                entriesApproved: 0,
                timeSeriesData: [],
                statusDistribution: [],
                dailyActivity: []
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading || !analytics) {
        return (
            <div className="flex items-center justify-center h-96">
                <AILoader message="Loading analytics..." />
            </div>
        )
    }

    const approvalRate = ((analytics.approvedResponses / analytics.totalResponses) * 100).toFixed(1)

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{projectName} Analytics</h2>
                    <p className="text-muted-foreground">Comprehensive AI consumption and performance metrics</p>
                </div>
                <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                    <TabsList>
                        <TabsTrigger value="7d">7 Days</TabsTrigger>
                        <TabsTrigger value="30d">30 Days</TabsTrigger>
                        <TabsTrigger value="all">All Time</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalResponses}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.approvedResponses} approved
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvalRate}%</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.approvedResponses} of {analytics.totalResponses}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(analytics.totalTokens / 1000000).toFixed(2)}M
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Avg {(analytics.avgTokensPerResponse / 1000).toFixed(1)}K per response
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${analytics.totalCost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg ${analytics.avgCostPerResponse.toFixed(3)} per response
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entry Coverage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalEntries}</div>
                        <p className="text-xs text-muted-foreground">
                            {analytics.entriesWithResponses} generated, {analytics.entriesApproved} approved
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Token Consumption Over Time */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Token Consumption Over Time</CardTitle>
                        <CardDescription>Daily token usage and cost trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                                />
                                <YAxis />
                                <Tooltip
                                    labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                                    formatter={(value: number) => [(value / 1000).toFixed(1) + 'K', 'Tokens']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tokens"
                                    stroke={COLORS.primary}
                                    fillOpacity={1}
                                    fill="url(#colorTokens)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Daily Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Activity</CardTitle>
                        <CardDescription>Generated vs Approved responses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.dailyActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => {
                                        try {
                                            return format(parseISO(date), 'MM/dd/yyyy')
                                        } catch (e) {
                                            return date
                                        }
                                    }}
                                />
                                <YAxis />
                                <Tooltip 
                                    labelFormatter={(date) => {
                                        try {
                                            return format(parseISO(date as string), 'MM/dd/yyyy')
                                        } catch (e) {
                                            return String(date)
                                        }
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="generated" fill={COLORS.primary} name="Generated" />
                                <Bar dataKey="approved" fill={COLORS.approved} name="Approved" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Status Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status Distribution</CardTitle>
                        <CardDescription>Response approval status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics.statusDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cost Over Time */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Cost Trends</CardTitle>
                        <CardDescription>Daily AI consumption costs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.timeSeriesData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                                />
                                <YAxis tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="cost"
                                    stroke={COLORS.primary}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Daily Cost"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest AI generation requests and their token usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-3">
                                {analytics.timeSeriesData.slice(0, 10).map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <Activity className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">
                                                        {item.responses} response{item.responses !== 1 ? 's' : ''} generated
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {format(parseISO(item.date), 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Zap className="h-3 w-3" />
                                                    {(item.tokens / 1000).toFixed(1)}K tokens
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    ${item.cost.toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {analytics.timeSeriesData.length === 0 && (
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
        </div>
    )
}
