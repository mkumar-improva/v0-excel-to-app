# Parallel Web Search Integration

This document explains the integration of Parallel AI Search API to enhance the application's web search capabilities, addressing Gemini's search limitations.

## Overview

The application now uses a two-step approach for generating AI responses with web search:

1. **Step 1: Web Search** - Use Parallel AI Search API to retrieve relevant web content as excerpts
2. **Step 2: AI Analysis** - Pass the search results to Gemini for consolidation and answer generation

This approach provides:
- **Better Search Quality** - Parallel AI specializes in web search and returns LLM-optimized excerpts
- **More Control** - You can customize search queries and filter results
- **Cost Efficiency** - Gemini doesn't need to use its search tool, reducing costs
- **Better Context** - Search results are formatted specifically for LLM consumption

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│  Next.js API     │─────▶│  Backend API    │
│             │      │  /api/generate   │      │  /api/search    │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │                         │
                              │                         ▼
                              │                 ┌──────────────┐
                              │                 │  Parallel AI │
                              │                 │  Search API  │
                              │                 └──────────────┘
                              │                         │
                              ▼                         │
                     ┌────────────────┐                 │
                     │  Gemini API    │◀────────────────┘
                     │  (with context)│  Search excerpts
                     └────────────────┘
```

## Configuration

### Backend Setup

1. **Get Parallel API Key**
   - Visit [https://platform.parallel.ai](https://platform.parallel.ai)
   - Sign up and get your API key

2. **Configure Environment Variable**
   
   Edit `backend/.env`:
   ```env
   PARALLEL_API_KEY=your_actual_api_key_here
   ```

3. **Verify Configuration**
   ```bash
   curl http://localhost:5000/api/search/health
   ```
   
   Expected response:
   ```json
   {
     "configured": true,
     "service": "Parallel AI Search",
     "version": "v1beta",
     "message": "Search service is ready"
   }
   ```

### Frontend Setup

The frontend automatically uses the search integration. You can control it via the `useSearch` parameter:

```typescript
// Enable search (default)
const response = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'your question',
    useSearch: true  // This is the default
  })
})

// Disable search (use Gemini directly)
const response = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'your question',
    useSearch: false
  })
})
```

## API Reference

### Search API Endpoint

**Endpoint:** `POST /api/search`

**Request Body:**
```json
{
  "prompt": "Your search question or objective",
  "queries": ["query 1", "query 2"],  // Optional: custom search queries
  "maxResults": 10,                    // Optional: max results (1-20)
  "maxCharsPerResult": 10000          // Optional: max chars per excerpt (1000-50000)
}
```

**Response:**
```json
{
  "success": true,
  "prompt": "Your original prompt",
  "queries": ["generated", "search", "queries"],
  "formattedText": "# Web Search Results\n\n...",
  "resultsCount": 10,
  "searchId": "search_abc123...",
  "rawResults": {
    "search_id": "search_abc123...",
    "results": [
      {
        "url": "https://example.com",
        "title": "Page Title",
        "publish_date": "2025-01-01",
        "excerpts": ["relevant content..."]
      }
    ]
  }
}
```

### Health Check Endpoint

**Endpoint:** `GET /api/search/health`

**Response:**
```json
{
  "configured": true,
  "service": "Parallel AI Search",
  "version": "v1beta",
  "message": "Search service is ready"
}
```

## How It Works

### 1. Query Generation

When you send a prompt, the system automatically generates search queries. For example:

**Prompt:** `"What are the best practices for React performance?"`

**Generated Queries:**
- `"What are the best practices for React performance?"`
- `"React performance best practices"`
- `"best practices React performance"`

You can also provide custom queries:

```javascript
{
  prompt: "Tell me about AI",
  queries: [
    "artificial intelligence overview",
    "AI applications 2025",
    "machine learning vs AI"
  ]
}
```

### 2. Search Execution

The backend calls Parallel AI Search API with your queries and returns:
- Relevant web pages
- Content excerpts optimized for LLM consumption
- Metadata (URLs, titles, publish dates)

### 3. Context Enhancement

The search results are formatted into a structured context:

```markdown
# Web Search Results

Search ID: search_xyz...
Total Results: 10

---

## Result 1: Page Title

**URL:** https://example.com
**Published:** 2025-01-01

**Content:**

[Relevant excerpt from the page...]

---

## Result 2: Another Page

...
```

### 4. Gemini Analysis

The enhanced prompt is sent to Gemini:

```
You are given the following web search results for context. Please analyze and consolidate this information to answer the user's question accurately.

[Search results context here]

---

User's Question: [Original prompt]

Please provide a comprehensive answer based on the search results above. Cite sources where appropriate and mention if the information is current.
```

Gemini then consolidates the information and provides a comprehensive answer.

## Service Module Details

### `parallel-search.service.js`

Located at: `backend/src/services/parallel-search.service.js`

**Key Functions:**

#### `executeSearch(params)`
Executes a search using Parallel AI API.

```javascript
const results = await executeSearch({
  objective: "When was UN founded?",
  searchQueries: ["UN founding", "United Nations established"],
  maxResults: 10,
  maxCharsPerResult: 10000
})
```

#### `formatResultsForLLM(searchResults)`
Formats raw search results into LLM-friendly markdown.

```javascript
const formatted = formatResultsForLLM(searchResults)
// Returns markdown string with all excerpts
```

#### `generateSearchQueries(prompt)`
Auto-generates search queries from a user prompt.

```javascript
const queries = generateSearchQueries("What is AI?")
// Returns: ["What is AI?", "AI", "artificial intelligence"]
```

#### `enhancedSearch(userPrompt, options)`
High-level function combining all steps.

```javascript
const result = await enhancedSearch("Tell me about AI", {
  maxResults: 5,
  maxCharsPerResult: 5000
})
// Returns: { formattedText, rawResults, queries }
```

## Error Handling

The integration includes comprehensive error handling:

1. **Missing API Key** - Returns 503 with helpful message
2. **Search API Failures** - Falls back to Gemini without search
3. **Network Errors** - Logs error and continues without search
4. **Invalid Responses** - Validates and handles malformed API responses

Example error response:
```json
{
  "error": "Search service not configured",
  "message": "Parallel API key is missing. Please configure PARALLEL_API_KEY in environment variables."
}
```

## Testing

### Test Search API Directly

```bash
# Test search endpoint
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the capital of France?",
    "maxResults": 5
  }'

# Check health
curl http://localhost:5000/api/search/health
```

### Test End-to-End

```bash
# Test complete flow (search + Gemini)
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "useSearch": true
  }'
```

## Best Practices

1. **Query Optimization**
   - Keep queries focused and specific
   - Use 2-3 queries for best results
   - Combine broad and specific queries

2. **Result Limits**
   - Use `maxResults: 10` for comprehensive coverage
   - Use `maxResults: 5` for faster responses
   - Don't exceed 20 results (API limit)

3. **Content Length**
   - `maxCharsPerResult: 10000` is good for detailed answers
   - `maxCharsPerResult: 5000` for quicker processing
   - Balance between context and token usage

4. **Error Handling**
   - Always check `success` field in response
   - Handle cases where search is unavailable
   - Provide fallback behavior

## Cost Considerations

- **Parallel AI** - Charges per search query executed
- **Gemini** - Charges per token (input + output)
- **Combined** - Search results count as input tokens to Gemini

To optimize costs:
- Limit `maxResults` to what you need
- Reduce `maxCharsPerResult` for shorter contexts
- Cache search results when possible
- Disable search for simple queries that don't need web context

## Troubleshooting

### Search Returns No Results

Check:
1. API key is correctly set in `.env`
2. Backend server is running
3. Network connectivity to Parallel AI API
4. Query is not too restrictive

### Search Times Out

- Reduce `maxResults`
- Reduce `maxCharsPerResult`
- Check network connection
- Verify API key is valid

### High Costs

- Review `maxResults` settings
- Monitor token usage in Gemini
- Consider caching search results
- Use search selectively for complex queries only

## Future Enhancements

Potential improvements:
- **Caching Layer** - Cache search results to reduce API calls
- **Smart Query Generation** - Use LLM to generate better search queries
- **Result Ranking** - Re-rank results based on relevance
- **Source Filtering** - Allow filtering by domain or date
- **Streaming Results** - Stream search results as they arrive
- **Multi-Search Providers** - Support multiple search APIs as fallback

## References

- [Parallel AI Documentation](https://docs.parallel.ai)
- [Search API Quickstart](https://docs.parallel.ai/search/search-quickstart)
- [Platform Dashboard](https://platform.parallel.ai)
