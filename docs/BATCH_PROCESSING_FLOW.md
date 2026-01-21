# Batch Processing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BATCH PROCESSING FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: USER SELECTION                                             │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  Queue Tab - Data Table                                   │      │
│  │  ┌──┬────────┬──────────┬──────────┬────────────────┐    │      │
│  │  │☑│Actions │ Name     │ Address  │ Phone          │    │      │
│  │  ├──┼────────┼──────────┼──────────┼────────────────┤    │      │
│  │  │☑│Generate│ John Doe │ 123 Main │ 555-0100       │ ◄──┼──┐   │
│  │  │☐│Generate│ Jane Doe │ 456 Oak  │ 555-0200       │    │  │   │
│  │  │☑│Generate│ Bob Smith│ 789 Pine │ 555-0300       │ ◄──┼──┤   │
│  │  │☑│Generate│ Alice J. │ 321 Elm  │ 555-0400       │ ◄──┼──┘   │
│  │  └──┴────────┴──────────┴──────────┴────────────────┘    │      │
│  │                                                            │      │
│  │  Selection: 3 rows selected                               │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: INITIATE BATCH PROCESS                                     │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  [🚀 Process Batch (3)]  ◄── User clicks button          │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: SEQUENTIAL PROCESSING LOOP                                 │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  FOR EACH SELECTED ROW (1 of 3, 2 of 3, 3 of 3)          │      │
│  │                                                            │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.1: Generate Prompt from Template           │        │      │
│  │  │  Template: "Find info for {{Name}} at       │        │      │
│  │  │            {{Address}}, phone {{Phone}}"     │        │      │
│  │  │  ↓                                            │        │      │
│  │  │  Result: "Find info for John Doe at          │        │      │
│  │  │           123 Main, phone 555-0100"          │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                      ▼                                     │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.2: Call AI API with Web Search             │        │      │
│  │  │  POST /api/generate                          │        │      │
│  │  │  { prompt: "...", useSearch: true }          │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                      ▼                                     │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.3: Stream AI Response                      │        │      │
│  │  │  🤖 Gemini 2.5 Flash                         │        │      │
│  │  │  📡 Streaming chunks...                      │        │      │
│  │  │  ✓ Full response received                    │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                      ▼                                     │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.4: Extract Token Usage                     │        │      │
│  │  │  __TOKEN_USAGE__:                            │        │      │
│  │  │  {                                            │        │      │
│  │  │    inputTokens: 1250,                        │        │      │
│  │  │    outputTokens: 850,                        │        │      │
│  │  │    totalTokens: 2100,                        │        │      │
│  │  │    estimatedCost: 0.000105                   │        │      │
│  │  │  }                                            │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                      ▼                                     │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.5: Save to Database                        │        │      │
│  │  │  💾 api.entries.createResponse()             │        │      │
│  │  │  - AI response text                          │        │      │
│  │  │  - Token metrics                             │        │      │
│  │  │  - Cost data                                 │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                      ▼                                     │      │
│  │  ┌──────────────────────────────────────────────┐        │      │
│  │  │ 3.6: Update Progress                         │        │      │
│  │  │  [⏳ Processing 1/3]                         │        │      │
│  │  │  [⏳ Processing 2/3]                         │        │      │
│  │  │  [⏳ Processing 3/3]                         │        │      │
│  │  └──────────────────────────────────────────────┘        │      │
│  │                                                            │      │
│  │  LOOP CONTINUES UNTIL ALL ROWS PROCESSED                 │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: COMPLETION                                                 │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  ✅ Batch processing complete                             │      │
│  │  📊 Summary: 3 succeeded, 0 failed                        │      │
│  │  🔄 Refreshing data...                                    │      │
│  │  🧹 Clearing selection...                                 │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: VIEW RESULTS                                               │
│  ┌───────────────────────────────────────────────────────────┐      │
│  │  Switch to "Generated" tab to see results                 │      │
│  │  Switch to "Dashboard" tab to see analytics               │      │
│  │                                                            │      │
│  │  Dashboard shows:                                          │      │
│  │  - Total tokens used: 6,300                               │      │
│  │  - Total cost: $0.000315                                  │      │
│  │  - Success rate: 100%                                     │      │
│  │  - Recent activity with details                           │      │
│  └───────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

### 🎯 Multi-Select
- Checkbox on each row
- Select all option
- Visual feedback for selected rows

### ⚡ Batch Processing
- Sequential processing (one at a time)
- Real-time progress updates
- Error handling per row

### 📊 Token Tracking
- Input tokens counted
- Output tokens counted
- Cost calculated automatically
- All data saved to database

### 📈 Analytics Dashboard
- View all metrics in one place
- Time-based filtering (7d, 30d, all)
- Charts and visualizations
- Recent activity log

## Cost Calculation

```
Cost per token = $10.00 / 1,000,000 tokens
               = $0.00001 per token

Example:
- Input tokens: 1,250
- Output tokens: 850
- Total tokens: 2,100
- Cost: 2,100 × $0.00001 = $0.000021
```

## Error Handling

```
If a row fails:
├─ Error is logged
├─ Failure count incremented
├─ Processing continues with next row
└─ Final summary shows: "X succeeded, Y failed"
```
