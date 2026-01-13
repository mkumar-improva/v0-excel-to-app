/**
 * Parallel Web Search Service
 * Integrates with Parallel AI Search API for enhanced web search capabilities
 * Docs: https://docs.parallel.ai/search/search-quickstart
 */

const PARALLEL_API_URL = 'https://api.parallel.ai/v1beta/search';
const PARALLEL_BETA_VERSION = 'search-extract-2025-10-10';

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
    const searchQueries = options.queries || generateSearchQueries(userPrompt);

    const searchResults = await executeSearch({
        objective: userPrompt,
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
