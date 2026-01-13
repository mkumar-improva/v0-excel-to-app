import { NextRequest, NextResponse } from "next/server"
import { getAIResponseById, updateAIResponse, deleteAIResponse } from "@/lib/db"

// GET /api/responses/[id] - Get a specific AI response
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const responseId = parseInt(id, 10)

        if (isNaN(responseId)) {
            return NextResponse.json(
                { error: "Invalid response ID" },
                { status: 400 }
            )
        }

        const response = getAIResponseById(responseId)

        if (!response) {
            return NextResponse.json(
                { error: "Response not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ response })
    } catch (error) {
        console.error("Error getting AI response:", error)
        return NextResponse.json(
            { error: "Failed to get AI response" },
            { status: 500 }
        )
    }
}

// PUT /api/responses/[id] - Update an AI response
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const responseId = parseInt(id, 10)

        if (isNaN(responseId)) {
            return NextResponse.json(
                { error: "Invalid response ID" },
                { status: 400 }
            )
        }

        const { prompt, response, model } = await request.json()
        const updatedResponse = updateAIResponse(responseId, prompt, response, model)

        if (!updatedResponse) {
            return NextResponse.json(
                { error: "Response not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ response: updatedResponse })
    } catch (error) {
        console.error("Error updating AI response:", error)
        return NextResponse.json(
            { error: "Failed to update AI response" },
            { status: 500 }
        )
    }
}

// DELETE /api/responses/[id] - Delete an AI response
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const responseId = parseInt(id, 10)

        if (isNaN(responseId)) {
            return NextResponse.json(
                { error: "Invalid response ID" },
                { status: 400 }
            )
        }

        const deleted = deleteAIResponse(responseId)

        if (!deleted) {
            return NextResponse.json(
                { error: "Response not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting AI response:", error)
        return NextResponse.json(
            { error: "Failed to delete AI response" },
            { status: 500 }
        )
    }
}
