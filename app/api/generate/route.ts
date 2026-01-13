import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "nodejs"

// Gemini pricing (as of current rates - adjust as needed)
const PRICING = {
    "gemini-3-pro-preview": {
        inputPer1M: 1.25,  // $1.25 per 1M input tokens
        outputPer1M: 5.00   // $5.00 per 1M output tokens
    }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[model as keyof typeof PRICING] || PRICING["gemini-3-pro-preview"]
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M
    return inputCost + outputCost
}

export async function POST(req: Request) {
    try {
        const { prompt, useSearch = true } = await req.json()

        const apiKey = process.env.GOOGLE_API_KEY
        if (!apiKey) {
            return new Response("GOOGLE_API_KEY is not configured", { status: 500 })
        }

        // Step 1: If search is enabled, use Parallel Web search first
        let enhancedPrompt = prompt
        let searchContext = ""

        if (useSearch) {
            try {
                // Call the backend search API
                const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
                const searchResponse = await fetch(`${backendUrl}/api/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt,
                        maxResults: 10,
                        maxCharsPerResult: 10000
                    })
                })

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json()

                    if (searchData.success && searchData.formattedText) {
                        searchContext = searchData.formattedText

                        // Enhance the prompt with search results
                        enhancedPrompt = `You are given the following web search results for context. Please analyze and consolidate this information to answer the user's question accurately.

${searchContext}

---

User's Question: ${prompt}

Please provide a comprehensive answer based on the search results above. Cite sources where appropriate and mention if the information is current.`
                    }
                } else {
                    console.warn('Search API failed, continuing without search results')
                }
            } catch (searchError) {
                console.error('Search error:', searchError)
                // Continue without search results if search fails
            }
        }

        // Step 2: Send to Gemini (with or without search context)
        const google = createGoogleGenerativeAI({ apiKey })
        const modelName = "gemini-3-pro-preview"

        const result = await streamText({
            model: google(modelName),
            prompt: enhancedPrompt,
            onFinish: async ({ usage }) => {
                // Usage statistics are captured here
                console.log("Token usage:", usage)
            }
        })

        // We need to convert the stream and append usage data at the end
        const stream = result.toTextStreamResponse()

        // Clone the response and add usage data as a custom header
        const usage = await result.usage

        // Create a new response with custom headers for token usage
        const headers = new Headers(stream.headers)
        if (usage) {
            // Using type assertion as AI SDK usage structure
            const usageData = usage as any
            const inputTokens = usageData.promptTokens ?? 0
            const outputTokens = usageData.completionTokens ?? 0
            const totalTokens = usageData.totalTokens ?? 0

            headers.set("X-Input-Tokens", String(inputTokens))
            headers.set("X-Output-Tokens", String(outputTokens))
            headers.set("X-Total-Tokens", String(totalTokens))
            const cost = calculateCost(modelName, inputTokens, outputTokens)
            headers.set("X-Estimated-Cost", String(cost))
        }

        return new Response(stream.body, {
            status: stream.status,
            statusText: stream.statusText,
            headers
        })
    } catch (error) {
        console.error("API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
