/**
 * Parallel Web Search Service
 * Integrates with Parallel AI Search API for enhanced web search capabilities
 * Docs: https://docs.parallel.ai/search/search-quickstart
 */

const PARALLEL_API_URL = 'https://api.parallel.ai/v1beta/search';
const PARALLEL_BETA_VERSION = 'search-extract-2025-10-10';
const DEFAULT_PROMPT_TEMPLATE = `You are an expert Data Verification Auditor validating US business contact information (healthcare & commercial) using public web sources.
Source Trust Order (High→Low):
Official Website > Google Business Profile > Google Maps > BBB > Yelp/Directories > NPI Registry > Gov/SoS Registry
⚠️ Gov/SoS data reflects registration time only — treat as historical. Never override official site or Google Business with it.
Input Data:
Name: {{Name}}
Facility Type: {{Facility Type}}
Address: {{Address}}
City: {{City}}
State: {{State}}
Zip: {{Zip}}
Telephone: {{Telephone}}
Fax: {{Fax}}
INSTRUCTIONS:
1. Search & Discovery
- Find Official Website first (highest confidence anchor).
- Fallback: Google Business Profile (near-authoritative for address/phone) and Google Maps.
- Supplement: BBB, Yelp, Healthgrades, Zocdoc, YellowPages, LinkedIn.
- NPI/Gov registries = supporting reference only.
- Search key: Business Name + Full Address.
2. Matching Rules (STRICT)
- MATCH: Name matches AND Address matches (normalized) AND (Telephone OR Fax matches).
- NOT MATCH: Not found, address mismatch, or unresolved contact conflict.
- Moved: Official site/Google shows different current address.
- Address normalize: St=Street, Rd=Road, Ave=Avenue, Blvd=Boulevard. Ignore suite format differences.
- Phone normalize: strip dashes, spaces, parentheses, country codes.
3. Validation Logic
- Name: Standardize. For chains/franchises, match specific branch — not corporate HQ.
- Address: Use current address from official site or Google Business. If relocated → status = "Moved". Match city/state from input only.
- Telephone: Match primary number from top-trust source. Note discrepancies.
- Fax: Verify via official site or directories. If unverified but plausible (healthcare) → keep original, note "Unverified". If business clearly doesn't use fax → null.
- Gov conflicts: Flag as "Government registry may contain outdated registration data." Do not downgrade confidence if higher-trust sources confirm.
4. Constraints
- Never guess. No assumptions without source evidence.
- confidence_score = 0.0 if no valid source found.
- Every validated field must trace to a specific URL.
5. Sources
- Collect 8–10 distinct source URLs where possible.
6. Conflict Resolution Priority
1. Official Website
2. Google Business Profile and Google Maps
3. BBB
4. Yelp / Healthgrades / Directories
5. NPI Registry
6. SoS / Gov Registry (flag if stale)
Output Requirements:
Return ONLY a valid JSON object.
No markdown formatting (no \`\`\`json blocks).
No introductory text or explanations outside the JSON.
Strictly follow this schema:
{
  "original_input": {
    "name": "String",
    "facility_type": "String",
    "address": "String",
    "city": "String",
    "state": "String",
    "zip": "String",
    "telephone": "String",
    "fax": "String"
  },
  "validated_data": {
    "name": "String",
    "facility_type": "String (Must be exactly identical to original_input's facility_type value. Do not validate or change this.)",
    "address": "String",
    "city": "String",
    "state": "String",
    "zip": "String",
    "telephone": "String",
    "fax": "String"
  },
  "status": "String (MATCH | NOT MATCH | Moved | Unverified)",
  "changes_detected": Boolean,
  "confidence_score": Number (0.0 to 1.0),
  "confidence_score_explanation": "String (dynamic, detailed explanation of how this specific confidence score was calculated and why it was assigned this value based on the verified and conflicting details)",
  "data_quality_notes": "String (brief explanation of match reasoning, source conflicts, and any stale government data flagged)",
  "comment": "String (explain exactly what changed between original_input and validated_data and why. If nothing changed, state that input details matched perfectly.)",
  "source_references": [
    {
      "source_name": "String (e.g., Official Website, Google Business Profile, BBB)",
      "url": "String (exact link)",
      "reference_confidence": Number (0.0 to 1.0)
    }
  ]
}`

/**
 * Execute a search using Parallel AI Search API
 * @param {Object} params - Search parameters
 * @param {string} params.objective - The search objective/question
 * @param {string[]} params.searchQueries - Array of search queries to execute
 * @param {number} [params.maxResults=10] - Maximum number of results to return
 * @param {number} [params.maxCharsPerResult=10000] - Maximum characters per excerpt
 * @returns {Promise<Object>} Search results with excerpts
 */
async function executeSearch({
    objective,
    searchQueries,
    maxResults = 10,
    maxCharsPerResult = 10000
}) {
    const apiKey = process.env.PARALLEL_API_KEY;

    if (!apiKey) {
        throw new Error('PARALLEL_API_KEY is not configured in environment variables');
    }

    try {
        const response = await fetch(PARALLEL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'parallel-beta': PARALLEL_BETA_VERSION
            },
            body: JSON.stringify({
                objective,
                search_queries: searchQueries,
                max_results: maxResults,
                excerpts: {
                    max_chars_per_result: maxCharsPerResult
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Parallel API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Parallel Search Error:', error);
        throw error;
    }
}

/**
 * Format search results into a consolidated text for LLM consumption
 * @param {Object} searchResults - Results from Parallel API
 * @returns {string} Formatted text with all excerpts
 */
function formatResultsForLLM(searchResults) {
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
        return 'No search results found.';
    }

    let formatted = `# Web Search Results\n\n`;
    formatted += `Search ID: ${searchResults.search_id}\n`;
    formatted += `Total Results: ${searchResults.results.length}\n\n`;
    formatted += `---\n\n`;

    searchResults.results.forEach((result, index) => {
        formatted += `## Result ${index + 1}: ${result.title}\n\n`;
        formatted += `**URL:** ${result.url}\n`;

        if (result.publish_date) {
            formatted += `**Published:** ${result.publish_date}\n`;
        }

        formatted += `\n**Content:**\n\n`;

        if (result.excerpts && result.excerpts.length > 0) {
            result.excerpts.forEach((excerpt, excerptIndex) => {
                // Clean up the excerpt text
                const cleanExcerpt = excerpt
                    .replace(/Last updated.*?\\n/g, '')
                    .replace(/\\n{3,}/g, '\n\n')
                    .trim();

                if (cleanExcerpt.length > 0) {
                    formatted += `${cleanExcerpt}\n\n`;
                }
            });
        }

        formatted += `---\n\n`;
    });

    return formatted;
}

/**
 * Extract the raw multiline Input Data block from the user prompt
 * @param {string} prompt - The full user prompt containing "Input Data:"
 * @returns {string|null} The exact multiline input block, or null if not found
 */
function extractInputBlockFromPrompt(prompt) {
    const inputDataBlockRegex = /Input Data:([\s\S]*?)(?:Instructions:|Output Requirements:|INSTRUCTIONS:|\n\n\n)/i;
    const match = prompt.match(inputDataBlockRegex);
    if (match && match[1]) {
        return match[1].trim();
    }
    return null;
}

/**
 * Generate search queries from a user prompt
 * This is a simple implementation - can be enhanced with LLM-based query generation
 * @param {string} prompt - User's original prompt
 * @returns {string[]} Array of search queries
 */
function generateSearchQueries(prompt) {
    // Extract key phrases and create variations
    // This is a simple heuristic - could be improved with NLP

    const queries = [];

    // Add the original prompt as-is
    queries.push(prompt);

    // Try to extract entity names or specific topics
    // Look for quoted phrases
    const quotedMatches = prompt.match(/"([^"]+)"/g);
    if (quotedMatches) {
        quotedMatches.forEach(match => {
            queries.push(match.replace(/"/g, ''));
        });
    }

    // Remove common question words for alternate query
    const cleanedQuery = prompt
        .replace(/^(what|when|where|who|why|how|is|are|was|were|can|could|should|would)\s+/i, '')
        .trim();

    if (cleanedQuery !== prompt && cleanedQuery.length > 3) {
        queries.push(cleanedQuery);
    }

    // Limit to 3 unique queries
    return [...new Set(queries)].slice(0, 3);
}

/**
 * Perform enhanced search with automatic query generation
 * @param {string} userPrompt - User's search question/prompt
 * @param {Object} [options] - Optional search parameters
 * @returns {Promise<Object>} Object containing formatted results and raw data
 */
async function enhancedSearch(userPrompt, options = {}) {
    let searchQueries = options.queries;
    
    if (!searchQueries || searchQueries.length === 0) {
        const inputBlock = extractInputBlockFromPrompt(userPrompt);
        if (inputBlock) {
            searchQueries = [inputBlock];
        } else {
            searchQueries = generateSearchQueries(userPrompt);
        }
    }

    // console.log('🔍 Generated Search Queries:', searchQueries);
    // console.log('🔍 Generated Search Queries:', options.promptTemplate);


    const searchResults = await executeSearch({
        objective: options.promptTemplate || DEFAULT_PROMPT_TEMPLATE,
        searchQueries,
        maxResults: options.maxResults || 10,
        maxCharsPerResult: options.maxCharsPerResult || 10000
    });

    const formattedText = formatResultsForLLM(searchResults);


    return {
        formattedText,
        rawResults: searchResults,
        queries: searchQueries
    };
}

module.exports = {
    executeSearch,
    formatResultsForLLM,
    generateSearchQueries,
    enhancedSearch
};
