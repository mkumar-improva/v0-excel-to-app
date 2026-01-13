# Token Usage and Cost Tracking - Implementation Summary

## ✅ Changes Completed

This document summarizes all changes made to implement token usage and cost tracking across the entire application.

---

## 📊 Database Changes

### Schema Updates

Both frontend and backend databases now include these fields in the `ai_responses` table:

```sql
input_tokens INTEGER       -- Number of input tokens
output_tokens INTEGER      -- Number of output tokens  
total_tokens INTEGER       -- Total tokens (input + output)
estimated_cost REAL        -- Calculated cost in USD
```

### Files Modified:

1. **Frontend Database** (`lib/db.ts`)
   - Updated `CREATE TABLE` statement (lines 43-55)
   - Updated `createAIResponse()` function to accept token parameters (lines 269-285)
   - Updated TypeScript interface `AIResponse` in `lib/types.ts` (lines 62-73)

2. **Backend Database** (`backend/src/config/database.js`)
   - Updated schema in `initializeTables()` (lines 118-146)
   - Added automatic migration for existing databases
   - Migration runs on server startup

---

## 🔧 Backend API Changes

### Files Modified:

1. **`backend/src/models/response.model.js`**
   - Updated `create()` method signature (line 4)
   - Now accepts: `inputTokens`, `outputTokens`, `totalTokens`, `estimatedCost`
   - Automatically saves token data to database

2. **`backend/src/routes/response.routes.js`**
   - Added validation for token fields (lines 11-14)
   - Updated POST `/api/entries/:id/responses` handler (lines 47-56)
   - Extracts token data from request body and passes to model

---

## 🎨 Frontend Changes

### API Route - Token Capture

**File:** `app/api/generate/route.ts`

- Added pricing configuration (lines 6-12)
- Implemented `calculateCost()` function (lines 14-19)
- Captures usage from AI SDK's `result.usage` 
- Returns token data in response headers:
  - `X-Input-Tokens`
  - `X-Output-Tokens`
  - `X-Total-Tokens`
  - `X-Estimated-Cost`

### Frontend Components

**1. `components/prompt-dialog.tsx`**
   - Added `tokenUsage` state (lines 28-33)
   - Updated `handleSendToAI()` to extract tokens from headers (lines 139-148)
   - Updated `saveResponse()` to save token data (lines 82-101)
   - Updated `loadLatestResponse()` to load saved token data (lines 71-78)
   - Passes token usage to `ResponseViewer` component

**2. `components/response-viewer.tsx`**
   - Added `tokenUsage` prop to interface (lines 30-36)
   - Added token/cost display in header section (lines 106-127)
   - Shows formatted token counts and cost

**3. `lib/api-client.ts`**
   - Updated `createResponse` type signature (lines 88-96)
   - Now accepts token usage fields

---

## 💰 Pricing Configuration

**Location:** `app/api/generate/route.ts` (lines 6-12)

Current rates for **Gemini 3 Pro Preview**:
- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens

**To update pricing:** Modify the `PRICING` object in the generate route.

---

## 🎯 UI Display

### Where Token Usage Appears

Token usage is displayed in the **Response Viewer header** when:
- Generating a new AI response
- Viewing a previously saved response (if token data exists)

### Display Format

```
┌──────────────────────────────────────────────────────────────┐
│  Tokens                     Cost                             │
│  1,234                      $0.002570                        │
│  (800 in / 434 out)                                         │
└──────────────────────────────────────────────────────────────┘
```

Located in the top-right corner of the response viewer, next to the confidence score.

---

## 🔄 Data Flow

1. **User sends prompt** → PromptDialog
2. **Frontend calls** → `/api/generate`
3. **API processes** → Gemini AI with usage tracking
4. **API returns** → Stream + headers with token data
5. **Frontend extracts** → Token usage from headers
6. **Frontend saves** → via `/api/entries/:id/responses`
7. **Backend stores** → Token data in database
8. **UI displays** → Token usage in ResponseViewer

---

## 📝 Migration Scripts

### Frontend Migration
**File:** `scripts/migrate-add-token-usage.js`

Run manually if needed:
```bash
node scripts/migrate-add-token-usage.js
```

### Backend Migration
**Automatic** - Runs on server startup via `database.js`

---

## ✨ Features Implemented

✅ Token counting for every AI call  
✅ Cost calculation based on Gemini pricing  
✅ Database storage of token/cost data  
✅ UI display of consumption metrics  
✅ Historical tracking (stored with each response)  
✅ Automatic migration for existing databases  
✅ Both input and output token tracking  

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Total usage dashboard per project
- [ ] Cost analytics and reports
- [ ] Budget alerts and limits
- [ ] CSV export of usage data
- [ ] Monthly/weekly usage summaries
- [ ] Multi-model pricing support

---

## 🧪 Testing

To test the implementation:

1. Start the backend server
2. Start the frontend development server
3. Create/open a project
4. Upload an Excel file
5. Generate an AI response
6. Check the response header for token usage display

The token counts and cost should appear immediately after the AI response completes.

---

## 📋 Files Changed Summary

**Frontend:**
- `lib/db.ts` - Database schema & functions
- `lib/types.ts` - TypeScript interfaces
- `lib/api-client.ts` - API client types
- `app/api/generate/route.ts` - AI generation with usage tracking
- `app/api/entries/[id]/responses/route.ts` - Response creation API
- `components/prompt-dialog.tsx` - Usage capture & state management
- `components/response-viewer.tsx` - UI display

**Backend:**
- `backend/src/config/database.js` - Schema & migration
- `backend/src/models/response.model.js` - Model layer
- `backend/src/routes/response.routes.js` - API routes

**Documentation:**
- `docs/token-usage.md` - Feature documentation
- `scripts/migrate-add-token-usage.js` - Migration script

**Total:** 12 files modified, 2 new files created
