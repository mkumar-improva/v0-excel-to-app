import { NextRequest, NextResponse } from "next/server"
import { getProjectAnalytics } from "@/lib/db"

// GET /api/projects/[id]/analytics - Get analytics for a project
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

        const url = new URL(request.url)
        const timeRange = url.searchParams.get("range") || "7d"

        const analytics = getProjectAnalytics(projectId, timeRange)
        return NextResponse.json({ analytics })
    } catch (error) {
        console.error("Error fetching project analytics:", error)
        return NextResponse.json(
            { error: "Failed to fetch project analytics" },
            { status: 500 }
        )
    }
}
