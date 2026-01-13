import { NextRequest, NextResponse } from "next/server"
import { getEntryById, deleteEntry } from "@/lib/db"

// GET /api/entries/[id] - Get a specific entry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const entryId = parseInt(id, 10)

        if (isNaN(entryId)) {
            return NextResponse.json(
                { error: "Invalid entry ID" },
                { status: 400 }
            )
        }

        const entry = getEntryById(entryId)

        if (!entry) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ entry })
    } catch (error) {
        console.error("Error getting entry:", error)
        return NextResponse.json(
            { error: "Failed to get entry" },
            { status: 500 }
        )
    }
}

// DELETE /api/entries/[id] - Delete an entry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const entryId = parseInt(id, 10)

        if (isNaN(entryId)) {
            return NextResponse.json(
                { error: "Invalid entry ID" },
                { status: 400 }
            )
        }

        const deleted = deleteEntry(entryId)

        if (!deleted) {
            return NextResponse.json(
                { error: "Entry not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting entry:", error)
        return NextResponse.json(
            { error: "Failed to delete entry" },
            { status: 500 }
        )
    }
}
