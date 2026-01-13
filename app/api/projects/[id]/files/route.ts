import { NextRequest, NextResponse } from "next/server"
import { listExcelFilesByProject, createExcelFile } from "@/lib/db"
import { parseExcelFile } from "@/lib/excel-parser"
import { saveFile } from "@/lib/file-storage"
import { createEntriesBatch } from "@/lib/db"

// GET /api/projects/[id]/files - List Excel files in a project
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

        const files = listExcelFilesByProject(projectId)
        return NextResponse.json({ files })
    } catch (error) {
        console.error("Error listing files:", error)
        return NextResponse.json(
            { error: "Failed to list files" },
            { status: 500 }
        )
    }
}

// POST /api/projects/[id]/files - Upload a new Excel file
export async function POST(
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

        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            )
        }

        // Validate file type
        const validExtensions = [".xlsx", ".xls", ".csv"]
        const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
            return NextResponse.json(
                { error: "Invalid file type. Only Excel files (.xlsx, .xls, .csv) are allowed" },
                { status: 400 }
            )
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse Excel file
        const excelData = parseExcelFile(buffer, file.name)

        // Save file to disk
        const filePath = saveFile(projectId, file.name, buffer)

        // Create Excel file record in database
        const excelFile = createExcelFile(
            projectId,
            file.name,
            filePath,
            excelData.columns
        )

        // Create entries from Excel rows
        const entries = excelData.rows.map((row, index) => ({
            rowNumber: index + 1,
            data: row,
        }))

        const createdEntries = createEntriesBatch(excelFile.id, entries)

        return NextResponse.json({
            file: excelFile,
            entriesCreated: createdEntries.length,
        }, { status: 201 })
    } catch (error) {
        console.error("Error uploading file:", error)
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        )
    }
}
