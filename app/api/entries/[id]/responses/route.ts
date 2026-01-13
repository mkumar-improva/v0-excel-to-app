import { NextRequest, NextResponse } from "next/server"
import { listAIResponsesByEntry, createAIResponse } from "@/lib/db"

// GET /api/entries/[id]/responses - Get AI responses for an entry
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

        const responses = listAIResponsesByEntry(entryId)
        return NextResponse.json({ responses })
    } catch (error) {
        console.error("Error listing AI responses:", error)
        return NextResponse.json(
            { error: "Failed to list AI responses" },
            { status: 500 }
        )
    }
}

// POST /api/entries/[id]/responses - Save a new AI response
export async function POST(
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

        const { prompt, response, model } = await request.json()

        if (!prompt || !response) {
            return NextResponse.json(
                { error: "Prompt and response are required" },
                { status: 400 }
            )
        }

        const aiResponse = createAIResponse(entryId, prompt, response, model)
        return NextResponse.json({ response: aiResponse }, { status: 201 })
    } catch (error) {
        console.error("Error creating AI response:", error)
        return NextResponse.json(
            { error: "Failed to create AI response" },
            { status: 500 }
        )
    }
}
