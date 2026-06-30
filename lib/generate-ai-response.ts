/**
 * Shared AI generation logic — used by both single-entry (prompt-dialog)
 * and batch (project-viewer) flows to ensure identical behavior.
 */

export interface GenerateResult {
  finalResponse: string
  tokenUsage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    estimatedCost: number
  }
}

/**
 * Calls /api/generate with the given prompt, streams the response,
 * extracts search context + token usage markers, and returns the
 * cleaned final response ready to save.
 *
 * @param prompt - The fully substituted prompt with provider data
 * @param promptTemplate - The raw template (sent to API for search extraction)
 * @param onChunk - Optional callback for each streamed chunk (for live UI updates)
 */
export async function generateAIResponse(
  prompt: string,
  promptTemplate: string,
  onChunk?: (chunk: string) => void
): Promise<GenerateResult> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, promptTemplate }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || response.statusText)
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ""

  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      fullResponse += chunk
      onChunk?.(chunk)
    }
  }

  // Extract markers robustly using index slices
  let searchContextText = ""
  const searchMarkerIndex = fullResponse.indexOf("__SEARCH_CONTEXT__:")
  const tokenMarkerIndex = fullResponse.indexOf("__TOKEN_USAGE__:")

  let tokenUsage: GenerateResult["tokenUsage"] = undefined

  if (searchMarkerIndex !== -1) {
    const endSearchIndex = tokenMarkerIndex !== -1 && tokenMarkerIndex > searchMarkerIndex
      ? tokenMarkerIndex
      : fullResponse.length
    searchContextText = fullResponse.substring(searchMarkerIndex + 19, endSearchIndex).trim()
  }

  if (tokenMarkerIndex !== -1) {
    const endTokenIndex = searchMarkerIndex !== -1 && searchMarkerIndex > tokenMarkerIndex
      ? searchMarkerIndex
      : fullResponse.length
    const tokenDataStr = fullResponse.substring(tokenMarkerIndex + 16, endTokenIndex).trim()
    if (tokenDataStr) {
      try {
        tokenUsage = JSON.parse(tokenDataStr)
      } catch (e) {
        console.error("Failed to parse token usage:", e)
      }
    }
  }

  // Clean response from stream markers
  const firstMarkerIndex = [searchMarkerIndex, tokenMarkerIndex]
    .filter(idx => idx !== -1)
    .sort((a, b) => a - b)[0]

  if (firstMarkerIndex !== undefined) {
    fullResponse = fullResponse.substring(0, firstMarkerIndex).trim()
  }

  // Inject search results into JSON response
  let finalResponse = fullResponse
  if (searchContextText) {
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : fullResponse
      const parsed = JSON.parse(jsonString)
      parsed.raw_search_results = searchContextText
      finalResponse = JSON.stringify(parsed, null, 2)
    } catch (e) {
      console.error("Failed to inject search results into response JSON:", e)
    }
  }

  return { finalResponse, tokenUsage }
}
