import { NextRequest, NextResponse } from "next/server"
import { createProject, listProjects } from "@/lib/db"

// GET /api/projects - List all projects
export async function GET() {
    try {
        const projects = listProjects()
        return NextResponse.json({ projects })
    } catch (error) {
        console.error("Error listing projects:", error)
        return NextResponse.json(
            { error: "Failed to list projects" },
            { status: 500 }
        )
    }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
    try {
        const { name, description } = await request.json()

        if (!name || typeof name !== "string") {
            return NextResponse.json(
                { error: "Project name is required" },
                { status: 400 }
            )
        }

        const project = createProject(name, description)
        return NextResponse.json({ project }, { status: 201 })
    } catch (error) {
        console.error("Error creating project:", error)
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        )
    }
}
