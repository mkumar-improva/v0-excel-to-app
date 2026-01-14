# Token Consumption Tracking - Fix Summary

## Problem
Token consumption details (input_tokens, output_tokens, total_tokens, estimated_cost) were not being saved to the database.

## Root Cause
The issue was in `/app/api/generate/route.ts`. The code was trying to set HTTP headers with token usage data **after** the streaming response was already created. With streaming responses, headers must be set before the stream starts, but token usage data from the AI SDK is only available **after** the stream completes. This created a timing conflict.

## Solution
Changed the approach from using HTTP headers to embedding token data directly in the stream:

### Backend Changes (`/app/api/generate/route.ts`)
1. **Custom TransformStream**: Created a custom `TransformStream` that waits for the AI response to complete
2. **Token Data Marker**: Appends token usage data as a special marker at the end of the stream: `__TOKEN_USAGE__:{json}`
3. **Proper Timing**: The `flush()` method of the TransformStream waits for `result.usage` to be available before appending the data

### Frontend Changes (`/components/prompt-dialog.tsx`)
1. **Stream Parsing**: After receiving the complete stream, parse and extract the token usage marker
2. **Data Extraction**: Split the response on the `__TOKEN_USAGE__:` marker to separate content from metadata
3. **Clean Display**: Remove the token marker from the displayed response
4. **Database Save**: Pass the extracted token usage to `saveResponse()` which sends it to the backend API

### Backend API (Already Correct)
- `/backend/src/routes/response.routes.js` - Already accepts token fields
- `/backend/src/models/response.model.js` - Already saves token fields to database
- Database schema - Already has the required columns

## How It Works Now

1. **User sends prompt** → Frontend calls `/api/generate`
2. **AI generates response** → Backend streams the response text
3. **Stream completes** → Backend appends `__TOKEN_USAGE__:{...}` to the stream
4. **Frontend receives stream** → Extracts token data from the marker
5. **Frontend saves to DB** → Calls backend API with token usage included
6. **Backend persists** → Saves response + token data to `ai_responses` table

## Testing
To verify the fix works:
1. Generate a new AI response
2. Check browser console for: `✅ Frontend: Token usage extracted from stream:`
3. Check backend logs for: `📊 ResponseModel.create received:`
4. Query database: `SELECT input_tokens, output_tokens, total_tokens, estimated_cost FROM ai_responses ORDER BY created_at DESC LIMIT 1`

## Files Modified
- `/app/api/generate/route.ts` - Changed from headers to stream-embedded token data
- `/components/prompt-dialog.tsx` - Added token extraction from stream marker
