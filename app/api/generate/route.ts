import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "nodejs"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        const apiKey = process.env.GOOGLE_API_KEY
        if (!apiKey) {
            return new Response("GOOGLE_API_KEY is not configured", { status: 500 })
        }

        const google = createGoogleGenerativeAI({ apiKey })

        const result = await streamText({
            model: google("gemini-3-pro-preview"),
            tools: {
                google_search: google.tools.googleSearch({
                    mode: "MODE_DYNAMIC",
                }),
            },
            prompt,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
