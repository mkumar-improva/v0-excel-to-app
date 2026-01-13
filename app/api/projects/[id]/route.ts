import { NextRequest, NextResponse } from "next/server"
import { getProjectById, updateProject, deleteProject } from "@/lib/db"

// GET /api/projects/[id] - Get a specific project
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

        const project = getProjectById(projectId)

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error("Error getting project:", error)
        return NextResponse.json(
            { error: "Failed to get project" },
            { status: 500 }
        )
    }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
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

        const { name, description } = await request.json()
        const project = updateProject(projectId, name, description)

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ project })
    } catch (error) {
        console.error("Error updating project:", error)
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        )
    }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
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

        const deleted = deleteProject(projectId)

        if (!deleted) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting project:", error)
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        )
    }
}
