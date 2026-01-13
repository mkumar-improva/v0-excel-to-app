# Token Usage and Cost Tracking

This document describes the token usage and cost tracking feature that has been added to the application.

## Overview

Every AI call now tracks:
- **Input Tokens**: Number of tokens in the prompt
- **Output Tokens**: Number of tokens in the AI response
- **Total Tokens**: Sum of input and output tokens
- **Estimated Cost**: Calculated cost based on current Gemini pricing

## Database Schema

The `ai_responses` table now includes these additional fields:

```sql
input_tokens INTEGER
output_tokens INTEGER
total_tokens INTEGER
estimated_cost REAL
```

## Pricing

Current pricing for Gemini 3 Pro Preview (as configured in `/app/api/generate/route.ts`):

- **Input**: $1.25 per 1M tokens
- **Output**: $5.00 per 1M output tokens

To update pricing, modify the `PRICING` object in `/app/api/generate/route.ts`.

## UI Display

Token usage and cost are displayed in the ResponseViewer component when viewing AI responses:

- **Tokens**: Shows total tokens with breakdown (input/output)
- **Cost**: Shows estimated cost in USD

Example display:
```
Tokens: 1,234 (800 in / 434 out)
Cost: $0.002570
```

## How It Works

1. **API Call**: When `/api/generate` is called, it:
   - Processes the AI request
   - Captures usage statistics from the AI SDK
   - Calculates the estimated cost
   - Returns usage data in response headers:
     - `X-Input-Tokens`
     - `X-Output-Tokens`
     - `X-Total-Tokens`
     - `X-Estimated-Cost`

2. **Frontend**: The `PromptDialog` component:
   - Extracts usage data from response headers
   - Saves it along with the AI response to the database
   - Displays it in the UI via `ResponseViewer`

3. **Database**: Token usage is stored with each AI response for:
   - Historical tracking
   - Cost analysis
   - Usage reporting

## Migration

For existing databases, run the migration script:

```bash
node scripts/migrate-add-token-usage.js
```

This will add the new columns to the `ai_responses` table without affecting existing data.

## Future Enhancements

Potential improvements:
- Aggregate usage statistics per project
- Cost reports and analytics dashboard
- Budget alerts and limits
- Export usage data for billing
