import { NextRequest, NextResponse } from "next/server"
import { getExcelFileById, deleteExcelFile } from "@/lib/db"
import { deleteFile } from "@/lib/file-storage"

// GET /api/files/[id] - Get Excel file details
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

        const file = getExcelFileById(fileId)

        if (!file) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ file })
    } catch (error) {
        console.error("Error getting file:", error)
        return NextResponse.json(
            { error: "Failed to get file" },
            { status: 500 }
        )
    }
}

// DELETE /api/files/[id] - Delete an Excel file
export async function DELETE(
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

        const file = getExcelFileById(fileId)

        if (!file) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            )
        }

        // Delete from database (will cascade to entries and AI responses)
        const deleted = deleteExcelFile(fileId)

        if (deleted) {
            // Also delete the physical file
            deleteFile(file.file_path)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting file:", error)
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        )
    }
}
