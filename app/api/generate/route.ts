import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "nodejs"

// Pricing: $2.00 per 200k tokens (= $10.00 per 1M tokens)
const COST_PER_MILLION_TOKENS = 10.00

function calculateCost(totalTokens: number): number {
    return (totalTokens / 1_000_000) * COST_PER_MILLION_TOKENS
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
        const modelName = "gemini-3.1-flash-lite"

        // Capture usage data in a variable
        let capturedUsage: any = null

        const result = await streamText({
            model: google(modelName),
            system: `You are an expert Data Verification Auditor. Your role is to validate and verify business contact information against the provided web search results.
Your core objective is to compare the input query attributes with the verified sources:
1. Always prioritize official company websites and Google Business Profiles for active addresses and phone numbers.
2. Be strict on matching rules (fuzzy address matching, name alignment, phone normalization).
3. If the business has moved, record the updated address and set the status to "Moved".
4. If government registry data (e.g. NPI, state SOS) conflicts with recent web data, flag the government data as potentially stale/outdated.
5. Provide a precise confidence_score and a dynamic confidence_score_explanation detailing why this specific score was calculated (e.g. detailing why it is 100%, or why it is 84% based on matching or mismatching attributes).
6. Return ONLY the requested JSON format (no markdown code blocks, no trailing/leading text).`,
            prompt: enhancedPrompt,
            onFinish: async ({ usage }) => {
                // Capture usage statistics
                capturedUsage = usage
            }
        })

        // Create a custom stream that appends token usage at the end
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()

        const customStream = new TransformStream({
            async transform(chunk, controller) {
                controller.enqueue(chunk)
            },
            async flush(controller) {
                // Wait for usage data to be available
                const usage = await result.usage

                if (usage) {
                    // AI SDK uses different property names - cast to any to avoid type errors
                    const usageData = usage as any

                    // Debug: Log all available properties
                    console.log("🔍 Raw usage object:", JSON.stringify(usage, null, 2))
                    console.log("🔍 Usage object keys:", Object.keys(usage))

                    // The AI SDK might use different property names depending on the version
                    // Try multiple possible property names
                    let inputTokens = usageData.promptTokens ?? usageData.inputTokens ?? 0
                    let outputTokens = usageData.completionTokens ?? usageData.outputTokens ?? 0
                    let totalTokens = usageData.totalTokens ?? 0

                    // If we have totalTokens but not the breakdown, try to get it from the result
                    if (totalTokens > 0 && inputTokens === 0 && outputTokens === 0) {
                        // Try to get from the result object itself
                        const resultUsage = (result as any).usage
                        if (resultUsage) {
                            console.log("🔍 Checking result.usage:", JSON.stringify(resultUsage, null, 2))
                        }

                        // Some AI SDKs provide it in the experimental_providerMetadata
                        const providerMetadata = usageData.experimental_providerMetadata
                        if (providerMetadata) {
                            console.log("🔍 Provider metadata:", JSON.stringify(providerMetadata, null, 2))
                            inputTokens = providerMetadata.promptTokens ?? inputTokens
                            outputTokens = providerMetadata.completionTokens ?? outputTokens
                        }
                    }

                    // Calculate totalTokens if not available
                    if (totalTokens === 0 && (inputTokens > 0 || outputTokens > 0)) {
                        totalTokens = inputTokens + outputTokens
                    }

                    const cost = calculateCost(totalTokens)

                    console.log("📊 Final extracted token data:", { inputTokens, outputTokens, totalTokens, cost })

                    // Append a special marker with token data at the end
                    const tokenData = `\n\n__TOKEN_USAGE__:${JSON.stringify({
                        inputTokens,
                        outputTokens,
                        totalTokens,
                        estimatedCost: cost
                    })}`

                    controller.enqueue(encoder.encode(tokenData))
                    console.log("✅ Token usage appended to stream")
                } else {
                    console.warn("⚠️  No usage data available!")
                }
            }
        })

        // Get the text stream and pipe through our custom transform
        const textStream = result.textStream

        return new Response(textStream.pipeThrough(customStream), {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        })
    } catch (error) {
        console.error("API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
}
