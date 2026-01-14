# Project Analytics Dashboard - Documentation

## Overview
Created a comprehensive **Analytics Dashboard** for each project that provides detailed insights into AI consumption, costs, token usage, and activity metrics with beautiful time-series charts and visualizations.

## Features

### 1. **Dashboard/Data View Toggle**
- **Dashboard Tab**: View analytics and metrics
- **Data Tab**: Work with data tables and entries
- Easy toggle in the header navigation

### 2. **Key Metrics Cards**
Four prominent metric cards showing:
- **Total Responses**: Count of all AI-generated responses
- **Approval Rate**: Percentage of approved vs total responses
- **Total Tokens**: Cumulative token consumption (in millions)
- **Total Cost**: Cumulative AI usage cost in dollars

### 3. **Time-Series Charts**

#### **Token Consumption Over Time**
- Area chart showing daily token usage
- Gradient fill for visual appeal
- Hover to see exact token counts
- Adjustable time range (7d, 30d, all time)

#### **Cost Trends**
- Line chart tracking daily AI costs
- Dollar-formatted Y-axis
- Detailed tooltips with exact costs
- Helps track spending patterns

#### **Daily Activity**
- Bar chart comparing generated vs approved responses
- Side-by-side bars for easy comparison
- Shows workflow efficiency

#### **Status Distribution**
- Pie chart showing approval status breakdown
- Color-coded segments (green for approved, orange for pending)
- Percentage labels on each segment

### 4. **Time Range Selector**
- **7 Days**: Last week's activity
- **30 Days**: Last month's trends
- **All Time**: Complete project history

## Visual Design

### Color Scheme
```typescript
COLORS = {
    approved: '#10b981',  // Green
    pending: '#f59e0b',   // Orange
    rejected: '#ef4444',  // Red
    primary: '#3b82f6'    // Blue
}
```

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Project Name Analytics          [7d][30d][All]     │
├─────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│ │Total │ │Appr. │ │Token │ │Cost  │  ← Metrics   │
│ │ 156  │ │57.1% │ │2.45M │ │$24.50│              │
│ └──────┘ └──────┘ └──────┘ └──────┘              │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ Token Consumption Over Time                 │   │
│ │ [Area Chart]                                │   │
│ └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐                 │
│ │ Daily        │ │ Status       │                 │
│ │ Activity     │ │ Distribution │                 │
│ │ [Bar Chart]  │ │ [Pie Chart]  │                 │
│ └──────────────┘ └──────────────┘                 │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐   │
│ │ Cost Trends                                 │   │
│ │ [Line Chart]                                │   │
│ └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Metrics Explained

### Total Responses
- **What**: Count of all AI-generated responses in the project
- **Includes**: Both approved and pending responses
- **Subtext**: Shows approved count for quick reference

### Approval Rate
- **What**: Percentage of responses that have been approved
- **Formula**: `(Approved / Total) × 100`
- **Indicator**: Higher is better (shows data quality)

### Total Tokens
- **What**: Cumulative tokens consumed across all responses
- **Display**: Shown in millions (M) for readability
- **Subtext**: Average tokens per response (in thousands)

### Total Cost
- **What**: Total AI API costs for the project
- **Display**: Dollar amount with 2 decimal places
- **Subtext**: Average cost per response

## Chart Details

### Token Consumption (Area Chart)
- **X-Axis**: Date
- **Y-Axis**: Token count (in thousands)
- **Gradient**: Blue gradient fill
- **Tooltip**: Shows exact date and token count
- **Use Case**: Track usage patterns, identify spikes

### Cost Trends (Line Chart)
- **X-Axis**: Date
- **Y-Axis**: Cost in dollars
- **Line**: Blue line with dots at data points
- **Tooltip**: Shows exact date and cost
- **Use Case**: Monitor spending, budget planning

### Daily Activity (Bar Chart)
- **X-Axis**: Date
- **Y-Axis**: Response count
- **Bars**: 
  - Blue = Generated responses
  - Green = Approved responses
- **Use Case**: Track workflow efficiency

### Status Distribution (Pie Chart)
- **Segments**: 
  - Green = Approved
  - Orange = Pending
- **Labels**: Shows percentage for each status
- **Use Case**: Quick status overview

## Technical Implementation

### Dependencies
```json
{
  "recharts": "^2.x",      // Charting library
  "date-fns": "^2.x"       // Date formatting
}
```

### Component Structure
```typescript
<ProjectDashboard>
  ├── Header (Title + Time Range Selector)
  ├── Metrics Cards (4 cards)
  ├── Token Consumption Chart (Area)
  ├── Daily Activity Chart (Bar)
  ├── Status Distribution Chart (Pie)
  └── Cost Trends Chart (Line)
</ProjectDashboard>
```

### Data Flow
```
Project Page
  ↓
activeView === 'dashboard'
  ↓
<ProjectDashboard projectId={id} />
  ↓
loadAnalytics(projectId, timeRange)
  ↓
API: GET /api/projects/:id/analytics?range=7d
  ↓
Process & Display Charts
```

### Mock Data (Current)
Currently using mock data generators:
- `generateMockTimeSeries()` - Creates daily data points
- `generateMockDailyActivity()` - Creates activity data

**TODO**: Replace with actual API calls:
```typescript
const data = await api.projects.getAnalytics(projectId, timeRange)
```

## Backend API Requirements

### Endpoint
```
GET /api/projects/:id/analytics?range=7d|30d|all
```

### Response Schema
```typescript
{
  totalResponses: number
  approvedResponses: number
  pendingResponses: number
  totalTokens: number
  totalCost: number
  avgTokensPerResponse: number
  avgCostPerResponse: number
  timeSeriesData: Array<{
    date: string          // ISO date
    responses: number
    tokens: number
    cost: number
  }>
  statusDistribution: Array<{
    name: string
    value: number
    color: string
  }>
  dailyActivity: Array<{
    date: string
    generated: number
    approved: number
  }>
}
```

### SQL Queries Needed

#### Total Metrics
```sql
SELECT 
  COUNT(*) as total_responses,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_responses,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_responses,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  AVG(total_tokens) as avg_tokens,
  AVG(estimated_cost) as avg_cost
FROM ai_responses
WHERE entry_id IN (
  SELECT id FROM entries WHERE file_id IN (
    SELECT id FROM excel_files WHERE project_id = ?
  )
)
AND created_at >= ?  -- Based on time range
```

#### Time Series
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as responses,
  SUM(total_tokens) as tokens,
  SUM(estimated_cost) as cost
FROM ai_responses
WHERE entry_id IN (...)
AND created_at >= ?
GROUP BY DATE(created_at)
ORDER BY date ASC
```

#### Daily Activity
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as generated,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
FROM ai_responses
WHERE entry_id IN (...)
AND created_at >= ?
GROUP BY DATE(created_at)
ORDER BY date ASC
```

## Usage

### Accessing Dashboard
1. Open any project
2. Click **"Dashboard"** tab in the header
3. View analytics and charts
4. Use time range selector to adjust period

### Interpreting Metrics

**High Approval Rate (>80%)**:
- ✅ Good data quality
- ✅ Effective prompts
- ✅ Reliable sources

**Low Approval Rate (<50%)**:
- ⚠️ Review prompts
- ⚠️ Check data sources
- ⚠️ Verify AI model settings

**Token Spikes**:
- 📊 Identify when bulk processing occurred
- 📊 Correlate with cost spikes
- 📊 Plan for future usage

**Cost Trends**:
- 💰 Monitor daily spending
- 💰 Project future costs
- 💰 Optimize for budget

## Benefits

### For Project Managers
1. **Budget Tracking**: Monitor AI costs in real-time
2. **Performance Metrics**: Track approval rates
3. **Resource Planning**: Forecast token usage
4. **ROI Analysis**: Cost per approved response

### For Data Teams
1. **Usage Patterns**: Identify peak usage times
2. **Quality Metrics**: Approval rate trends
3. **Efficiency**: Generated vs approved ratio
4. **Optimization**: Find cost-saving opportunities

### For Stakeholders
1. **Visual Reports**: Easy-to-understand charts
2. **Key Metrics**: At-a-glance performance
3. **Trend Analysis**: Historical data visualization
4. **Transparency**: Clear cost breakdown

## Future Enhancements

Potential improvements:
- [ ] **Export Reports**: Download charts as PDF/PNG
- [ ] **Custom Date Ranges**: Select specific date ranges
- [ ] **Comparison View**: Compare multiple projects
- [ ] **Alerts**: Set budget/usage alerts
- [ ] **Detailed Breakdowns**: Per-file analytics
- [ ] **Model Comparison**: Compare different AI models
- [ ] **Cost Projections**: Forecast future costs
- [ ] **Real-time Updates**: Live dashboard updates
- [ ] **Custom Metrics**: User-defined KPIs
- [ ] **Scheduled Reports**: Email weekly summaries

## Testing Checklist

- [x] Dashboard tab appears in navigation
- [x] Switches between Dashboard and Data views
- [x] Metric cards display correctly
- [x] Charts render without errors
- [x] Time range selector works
- [x] Tooltips show on hover
- [x] Responsive layout (mobile/desktop)
- [x] Loading state displays
- [ ] Real API integration (TODO)
- [ ] Error handling for failed loads
- [ ] Empty state for new projects

## Files Modified/Created

**Created**:
- `components/project-dashboard.tsx` - Main dashboard component

**Modified**:
- `app/projects/[id]/page.tsx` - Added dashboard tab toggle

**Dependencies Added**:
- `recharts` - Charting library
- `date-fns` - Date formatting utilities

## Performance Considerations

- **Lazy Loading**: Charts only render when dashboard is active
- **Memoization**: Consider memoizing chart data
- **Debouncing**: Debounce time range changes
- **Pagination**: Limit data points for large date ranges
- **Caching**: Cache analytics data for faster loads
