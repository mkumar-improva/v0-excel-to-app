import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "nodejs"

// Gemini Paid Tier Pricing (per 1M tokens)
// Input:  $2.00/1M  for prompts ≤ 200k tokens
//         $4.00/1M  for prompts >  200k tokens
const INPUT_PRICE_STANDARD = 2.00   // $/1M input tokens (≤ 200k prompt)
const INPUT_PRICE_LARGE    = 4.00   // $/1M input tokens (> 200k prompt)
const TOKENS_200K          = 200_000

/**
 * Calculate estimated Gemini cost based on the official tiered pricing.
 * @param inputTokens  - Number of prompt/input tokens
 * @param outputTokens - Number of completion/output tokens
 * @returns Estimated cost in USD
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
    const inputRate   = inputTokens > TOKENS_200K ? INPUT_PRICE_LARGE : INPUT_PRICE_STANDARD
    const inputCost   = (inputTokens  / 1_000_000) * inputRate
    // Output pricing not specified — included at $0 until confirmed
    const outputCost  = 0
    return inputCost + outputCost
}

export async function POST(req: Request) {
    try {
        const { prompt, useSearch = true, promptTemplate } = await req.json()

        const apiKey = process.env.GOOGLE_API_KEY
        if (!apiKey) {
            return new Response("GOOGLE_API_KEY is not configured", { status: 500 })
        }

        const google = createGoogleGenerativeAI({ apiKey })
        const modelName = "gemini-3.1-flash-lite"

        // Step 1: If search is enabled, use Parallel Web search and Gemini extraction
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
                        promptTemplate,
                        maxResults: 10,
                        maxCharsPerResult: 10000
                    })
                })

                if (searchResponse.ok) {
                    const searchData = await searchResponse.json()

                    if (searchData.success && searchData.formattedText) {
                        searchContext = searchData.formattedText.trim()

                        // Parse evidence array to build an explicit source list for Gemini
                        let evidenceSourceList = ""
                        let officialWebsiteNote = ""
                        try {
                            const parsed = JSON.parse(searchContext)
                            const evidenceItems: any[] = parsed.evidence || []
                            if (evidenceItems.length > 0) {
                                // Find the single official website (already enforced by backend)
                                const official = evidenceItems.find((ev: any) => ev.is_official_website === true)
                                if (official) {
                                    officialWebsiteNote = `\n\n★ OFFICIAL WEBSITE (highest trust — use as primary reference for address, phone, and name validation):\n   URL: ${official.url}\n   Domain: ${official.domain}\n   Confidence: ${official.confidence}`
                                }

                                evidenceSourceList = `\n\nALL ${evidenceItems.length} EVIDENCE SOURCES (you MUST include every one in source_references — do NOT omit any):` +
                                    evidenceItems.map((ev: any, i: number) => {
                                        const officialTag = ev.is_official_website ? ' ★ OFFICIAL WEBSITE' : ''
                                        return `\n${i + 1}. [${ev.source_type}${officialTag}] source_name="${ev.source_type} - ${ev.domain}" url="${ev.url}" reference_confidence=${ev.confidence}`
                                    }).join("")
                            }
                        } catch (e) {
                            // JSON parse failed — evidenceSourceList stays empty, Gemini uses raw context
                        }

                        // Build the enhanced prompt using the structured evidence returned directly by Parallel
                        enhancedPrompt = `Please validate and verify the business contact information against the structured evidence provided below.

                            ORIGINAL BUSINESS INPUT:
                            ${prompt}
                            ${officialWebsiteNote}

                            STRUCTURED EVIDENCE EXTRACTED FROM WEB SEARCH (sorted by trust: Official Website first, then Google Business, BBB, Directories, NPI/Government last):
                            ${searchContext}${evidenceSourceList}

                            VALIDATION PRIORITY RULES:
                            1. The ★ OFFICIAL WEBSITE source (if present) is the highest-trust source — it MUST be used as the primary reference for address, phone number, and business name.
                            2. Google Business Profile and Google Maps are secondary references.
                            3. BBB and Directory sources are supporting references only.
                            4. NPI Registry and Government Registry data may be STALE — treat as historical context only.
                            5. If the official website conflicts with the input data, update validated_data to match the official website values.

                            CRITICAL INSTRUCTION: You MUST include ALL evidence sources listed above in the source_references array. Do not omit any source. Every URL must appear as a separate entry with its source_name, url, and reference_confidence. The ★ OFFICIAL WEBSITE entry must appear FIRST in source_references.

                            Based on the evidence, determine the final validated details, matching status, changes detected, confidence score, and comments. Return ONLY the JSON object matching the strict validation schema.`
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
        // Capture usage data in a variable
        let capturedUsage: any = null

        const result = await streamText({
            model: google(modelName),
            system: `You are an expert Data Verification Auditor. Your role is to validate and verify business contact information against the provided web search evidence.
                Your core objective is to compare the input query attributes with the verified sources:
                1. Always prioritize official company websites and Google Business Profiles for active addresses and phone numbers.
                2. Be strict on matching rules (fuzzy address matching, name alignment, phone normalization).
                3. If the business has moved, record the updated address and set the status to "Moved".
                4. If government registry data (e.g. NPI, state SOS) conflicts with recent web data, flag the government data as potentially stale/outdated.
                5. Provide a precise confidence_score and a dynamic confidence_score_explanation detailing why this specific score was assigned.
                6. Return ONLY the requested JSON format conforming strictly to the validation schema. Do not output markdown, explanations, or commentary outside the JSON.
                7. Normalize the address (e.g. ""St" -> "Street" ,"Main St" -> "Main Street", "Road" -> "Rd", "Ave" -> "Avenue" etc.) Don't change address line if it is correct.              
                STRICT VALIDATION JSON SCHEMA:
                {
                "original_input": {
                "name": "string",
                "facility_type": "string",
                "address": "string",
                "city": "string",
                "state": "string",
                "zip": "string",
                "telephone": "string",
                "fax": "string"
                },
                "validated_data": {
                "name": "string",
                "facility_type": "string (Must be exactly identical to original_input's facility_type value. Do not validate or change this.)",
                "address": "string",
                "city": "string",
                "state": "string",
                "zip": "string",
                "telephone": "string",
                "fax": "string"
                },
                 "status": "MATCH | NOT MATCH | Moved | Unverified",
                "changes_detected": boolean,
                "confidence_score": number (0.0 to 1.0),
                "confidence_score_explanation": "string (detailed explanation of the confidence score calculation)",
                "data_quality_notes": "string (match reasoning, conflicts, stale data flags)",
                "match_score": number (0.0 to 1.0, representing how closely the validated_data matches the original_input. Evaluate name, address, city, state, zip, telephone, and fax. If they are identical (ignoring casing and minor punctuation/spacing differences), the score is 1.0. If there are minor variations, standardizations or formatting fixes, it should be between 0.7 and 0.9. If there are major discrepancies or updates like moving address, it should be lower.),
                "comment": "string (explanation of changes or match details)",
                "source_references": [
                {
                "source_name": "string (e.g. 'Official Website - presbyterianliving.org')",
                "url": "string (exact URL from the evidence)",
                "reference_confidence": number (0.0 to 1.0, use the confidence value from the evidence item)
                }
                ]
                }

                MANDATORY RULE: source_references MUST contain an entry for EVERY source provided in the evidence list. Do not summarize, deduplicate, or omit any source. The array length must equal the number of evidence items provided.`,
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
                // Append search results context marker first
                if (searchContext) {
                    const searchMarker = `\n\n__SEARCH_CONTEXT__:${searchContext}`
                    controller.enqueue(encoder.encode(searchMarker))
                    console.log("✅ Search context appended to stream")
                }

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

                    const cost = calculateCost(inputTokens, outputTokens)

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
