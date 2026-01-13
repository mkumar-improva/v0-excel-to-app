# Token Usage & Cost Tracking - Quick Reference

## 🎯 What Was Fixed

**Issue:** Backend was not saving consumption details and sending them back to the UI.

**Solution:** Updated both frontend and backend to fully support token usage tracking.

---

## ✅ All Changes Applied

### Backend (Express Server)
- ✅ Database schema updated with token columns
- ✅ Response model accepts token parameters
- ✅ API routes validate and save token data
- ✅ Automatic migration on server startup

### Frontend (Next.js)
- ✅ Database schema updated
- ✅ API route captures usage from Gemini
- ✅ Calculates costs based on pricing
- ✅ Returns token data in headers
- ✅ UI extracts and displays usage
- ✅ Saves to database with each response

---

## 🚀 How to Use

### 1. Start the Application

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
npm run dev
```

### 2. Generate an AI Response

1. Open a project
2. Upload an Excel file
3. Select a row
4. Click "Generate Prompt"
5. Click "Send to AI"
6. **Token usage appears in the response header!**

### 3. View Token Usage

Look for the display in the **top-right corner** of the AI Response viewer:

```
Tokens: 1,234 (800 in / 434 out)
Cost: $0.002570
```

---

## 📊 What Gets Tracked

| Field | Description | Example |
|-------|-------------|---------|
| **input_tokens** | Tokens in the prompt | 800 |
| **output_tokens** | Tokens in AI response | 434 |
| **total_tokens** | Sum of input + output | 1,234 |
| **estimated_cost** | Cost in USD | 0.002570 |

---

## 💾 Where Data is Stored

### Database Tables
Both frontend and backend databases store token data in:
```
ai_responses table:
  - input_tokens (INTEGER)
  - output_tokens (INTEGER)
  - total_tokens (INTEGER)
  - estimated_cost (REAL)
```

### Database Locations
- **Frontend:** `data/app.sqlite`
- **Backend:** `backend/data/app.sqlite`

---

## 💰 Current Pricing

**Model:** Gemini 3 Pro Preview

| Type | Cost per 1M Tokens |
|------|-------------------|
| Input | $1.25 |
| Output | $5.00 |

**To update:** Edit `app/api/generate/route.ts` lines 6-12

---

## 🔍 Verification Checklist

After making changes, verify:

- [ ] Backend server starts without errors
- [ ] Frontend development server runs
- [ ] Can generate AI responses
- [ ] Token usage appears in UI header
- [ ] Data persists when reloading
- [ ] Costs are calculated correctly

---

## 🐛 Troubleshooting

### Issue: Token usage not showing in UI

**Check:**
1. Response headers present? (Check browser DevTools → Network tab)
2. Frontend extracting headers correctly?
3. tokenUsage state being set?

### Issue: Data not saving to database

**Check:**
1. Backend API receiving token fields?
2. Database columns exist? (Run migration)
3. No validation errors in backend logs?

### Issue: Migration errors

**Solution:**
- Delete existing database and restart (for dev only!)
- Or manually add columns:
```sql
ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL;
```

---

## 📁 Key Files Reference

### Backend
- `backend/src/config/database.js` - Schema & migration
- `backend/src/models/response.model.js` - Data model
- `backend/src/routes/response.routes.js` - API routes

### Frontend
- `app/api/generate/route.ts` - Token capture & pricing
- `components/prompt-dialog.tsx` - State management
- `components/response-viewer.tsx` - UI display
- `lib/db.ts` - Database functions

---

## 📖 Additional Documentation

- **Full Implementation:** `docs/IMPLEMENTATION_SUMMARY.md`
- **Data Flow Diagram:** `docs/TOKEN_USAGE_FLOW.md`
- **Feature Overview:** `docs/token-usage.md`

---

## 🎉 Summary

✅ **Backend now saves consumption details**  
✅ **Frontend receives and displays token usage**  
✅ **Cost is calculated for every AI call**  
✅ **Data persists in database**  
✅ **UI shows real-time consumption metrics**

Everything is connected end-to-end! 🚀
