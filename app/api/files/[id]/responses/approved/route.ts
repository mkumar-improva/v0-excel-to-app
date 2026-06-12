import { NextRequest, NextResponse } from "next/server"
import { listApprovedResponsesByFileId } from "@/lib/db"

// GET /api/files/[id]/responses/approved - List approved AI responses for a file
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const fileId = parseInt(id, 10)

        if (isNaN(fileId)) {
            return NextResponse.json(
                { error: "Invalid file ID" },
                { status: 400 }
            )
        }

        const responses = listApprovedResponsesByFileId(fileId)
        return NextResponse.json({ responses })
    } catch (error) {
        console.error("Error listing approved responses:", error)
        return NextResponse.json(
            { error: "Failed to list approved responses" },
            { status: 500 }
        )
    }
}
