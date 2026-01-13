# Token Usage Data Flow

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTION                                 │
│                  Click "Send to AI" Button                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND: PromptDialog.tsx                        │
│  • handleSendToAI() called                                          │
│  • POST to /api/generate with prompt                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FRONTEND API: /app/api/generate/route.ts               │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ 1. Send prompt to Gemini AI (streamText)                  │     │
│  │ 2. Capture usage: await result.usage                      │     │
│  │ 3. Calculate cost: calculateCost(inputTokens, outputTokens)│     │
│  │ 4. Add to response headers:                               │     │
│  │    • X-Input-Tokens: 800                                  │     │
│  │    • X-Output-Tokens: 434                                 │     │
│  │    • X-Total-Tokens: 1234                                 │     │
│  │    • X-Estimated-Cost: 0.002570                           │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND: PromptDialog.tsx                        │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ • Read response stream (AI response text)                 │     │
│  │ • Extract headers:                                        │     │
│  │   - response.headers.get("X-Input-Tokens")               │     │
│  │   - response.headers.get("X-Output-Tokens")              │     │
│  │   - response.headers.get("X-Total-Tokens")               │     │
│  │   - response.headers.get("X-Estimated-Cost")             │     │
│  │ • Store in tokenUsage state                              │     │
│  └───────────────────────────────────────────────────────────┘     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SAVE TO DATABASE                                  │
│  saveResponse(fullResponse, activePrompt, tokenUsage)               │
│  ↓                                                                  │
│  POST /api/entries/:id/responses                                   │
│  {                                                                  │
│    prompt: "...",                                                   │
│    response: "...",                                                 │
│    model: "gemini-3-pro-preview",                                   │
│    input_tokens: 800,                                               │
│    output_tokens: 434,                                              │
│    total_tokens: 1234,                                              │
│    estimated_cost: 0.002570                                         │
│  }                                                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                   ┌─────────┴──────────┐
                   │                    │
                   ▼                    ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ FRONTEND ROUTE       │  │ BACKEND ROUTE        │
    │ (Next.js API)        │  │ (Express Server)     │
    │                      │  │                      │
    │ /api/entries/[id]/   │  │ /api/entries/:id/    │
    │ responses/route.ts   │  │ responses            │
    │                      │  │                      │
    │ Calls:               │  │ Calls:               │
    │ createAIResponse()   │  │ ResponseModel        │
    │   in lib/db.ts       │  │   .create()          │
    └──────────┬───────────┘  └─────────┬────────────┘
               │                        │
               ▼                        ▼
    ┌─────────────────────┐  ┌─────────────────────┐
    │ FRONTEND DATABASE   │  │ BACKEND DATABASE    │
    │ data/app.sqlite     │  │ backend/data/       │
    │                     │  │ app.sqlite          │
    │ INSERT INTO         │  │                     │
    │ ai_responses        │  │ INSERT INTO         │
    │ (entry_id,          │  │ ai_responses        │
    │  prompt,            │  │ (entry_id,          │
    │  response,          │  │  prompt,            │
    │  model,             │  │  response,          │
    │  input_tokens,      │  │  model,             │
    │  output_tokens,     │  │  input_tokens,      │
    │  total_tokens,      │  │  output_tokens,     │
    │  estimated_cost)    │  │  total_tokens,      │
    │                     │  │  estimated_cost)    │
    └─────────────────────┘  └─────────────────────┘
                   │                    │
                   └─────────┬──────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   DATA RETRIEVAL & DISPLAY                          │
│                                                                     │
│  When viewing saved response:                                       │
│  1. loadLatestResponse(entryId)                                     │
│  2. Extract token usage from response:                              │
│     - latest.input_tokens                                           │
│     - latest.output_tokens                                          │
│     - latest.total_tokens                                           │
│     - latest.estimated_cost                                         │
│  3. Set to tokenUsage state                                         │
│  4. Pass to ResponseViewer component                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│               UI DISPLAY: ResponseViewer.tsx                        │
│  ┌───────────────────────────────────────────────────────────┐     │
│  │ Header Section:                                           │     │
│  │                                                           │     │
│  │  Tokens              Cost                                │     │
│  │  1,234               $0.002570                           │     │
│  │  (800 in / 434 out)                                      │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Points

1. **Token capture happens at the API level** - The `/api/generate` route captures usage from Gemini's response
2. **Data transmitted via headers** - Token data flows from API to frontend via HTTP headers
3. **Saved with each response** - Every AI response includes token usage in the database
4. **Immediate UI feedback** - Users see token usage as soon as the response completes
5. **Historical tracking** - Token data persists and can be viewed later

## Benefits

✅ **Transparency** - Users see exactly what each AI call costs  
✅ **Accountability** - All usage is tracked and stored  
✅ **Optimization** - Identify expensive queries  
✅ **Budgeting** - Plan costs based on historical data  
