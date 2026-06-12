import { NextRequest, NextResponse } from "next/server"
import { getProjectAnalytics } from "@/lib/db"

// GET /api/projects/[id]/analytics/summary - Get summary metrics for a project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const projectId = parseInt(id, 10)

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: "Invalid project ID" },
                { status: 400 }
            )
        }

        // Get all-time metrics for summary
        const analytics = getProjectAnalytics(projectId, "all")

        const summary = {
            totalResponses: analytics.totalResponses,
            approvedResponses: analytics.approvedResponses,
            pendingResponses: analytics.pendingResponses,
            approvalRate: analytics.totalResponses > 0
                ? ((analytics.approvedResponses / analytics.totalResponses) * 100).toFixed(1)
                : 0,
            totalTokens: analytics.totalTokens,
            totalCost: analytics.totalCost,
            avgTokensPerResponse: analytics.avgTokensPerResponse,
            avgCostPerResponse: analytics.avgCostPerResponse
        }

        return NextResponse.json({ summary })
    } catch (error) {
        console.error("Error fetching project analytics summary:", error)
        return NextResponse.json(
            { error: "Failed to fetch project analytics summary" },
            { status: 500 }
        )
    }
}
