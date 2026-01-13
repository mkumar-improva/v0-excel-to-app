import { NextRequest, NextResponse } from "next/server"
import { listEntriesByExcelFile } from "@/lib/db"

// GET /api/files/[id]/entries - List entries for an Excel file
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

        const entries = listEntriesByExcelFile(fileId)
        return NextResponse.json({ entries })
    } catch (error) {
        console.error("Error listing entries:", error)
        return NextResponse.json(
            { error: "Failed to list entries" },
            { status: 500 }
        )
    }
}
