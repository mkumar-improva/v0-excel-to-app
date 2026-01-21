# Batch Processing Feature

## Overview
This document describes the new batch processing feature that allows users to select multiple rows in the queue and process them with AI in one go.

## Features Implemented

### 1. Multi-Select Functionality in Queue Tab
- **Checkbox Selection**: Each row in the "In Queue" tab now has a checkbox for selection
- **Select All**: A checkbox in the header allows selecting/deselecting all visible rows
- **Visual Feedback**: Selected rows are highlighted with a subtle background color
- **Selection Counter**: The table info bar shows how many rows are currently selected

### 2. Process Batch Button
- **Location**: Appears in the header when one or more rows are selected in the queue tab
- **Display**: Shows the count of selected items (e.g., "Process Batch (5)")
- **Progress Indicator**: During processing, displays current progress (e.g., "Processing 3/5")
- **Stop Option**: A "Stop" button appears during processing to cancel the remaining items
- **Loading State**: Main process button is disabled/replaced by status during batch processing

### 3. Batch Processing Logic
The batch processing feature:
1. Processes selected rows **one by one** (sequential processing)
2. For each row:
   - Generates a prompt using the project's prompt template
   - Replaces template variables (e.g., `{{Name}}`, `{{Address}}`) with actual row data
   - Sends the prompt to the AI API with web search enabled
   - Streams the AI response
   - Extracts token usage information from the response
   - Saves the response to the database with token metrics
3. Shows progress in real-time
4. Displays a summary toast notification when complete (success/failure counts)
5. Automatically refreshes the data to show updated status
6. Clears the selection after completion

### 4. Enhanced Dashboard with Usage Analytics
The Dashboard tab now includes:

#### Key Metrics Cards
- **Total Responses**: Number of AI generations with approval count
- **Approval Rate**: Percentage of approved responses
- **Total Tokens**: Token consumption in millions with average per response
- **Total Cost**: Cumulative cost with average per response
- **Entry Coverage**: Total entries with generation and approval stats

#### Visualizations
- **Token Consumption Over Time**: Area chart showing daily token usage trends
- **Daily Activity**: Bar chart comparing generated vs approved responses
- **Status Distribution**: Pie chart showing approval status breakdown
- **Cost Trends**: Line chart displaying daily AI consumption costs
- **Recent Activity**: List of recent AI generations with token usage details

## User Workflow

### Batch Processing Workflow
1. Navigate to a project and select a file
2. Switch to the "In Queue" tab
3. Select rows to process using checkboxes:
   - Click individual checkboxes to select specific rows
   - Click the header checkbox to select all visible rows
4. Click the "Process Batch" button in the header
5. Monitor progress as items are processed
6. Review the completion summary
7. Check the "Generated" tab to see the results

### Viewing Analytics
1. Navigate to a project
2. Click the "Dashboard" tab in the header
3. Select time range (7 Days, 30 Days, or All Time)
4. Review:
   - Key metrics at the top
   - Token consumption and cost trends
   - Daily activity patterns
   - Recent processing activity

## Technical Implementation

### Components Modified
1. **`data-table.tsx`**
   - Added multi-select props and state
   - Implemented checkbox column
   - Added selection handlers

2. **`project-viewer.tsx`**
   - Added batch processing state and logic
   - Implemented `handleBatchProcess` function
   - Added "Process Batch" button
   - Integrated progress tracking

3. **`project-dashboard.tsx`**
   - Enhanced with Recent Activity section
   - Displays detailed token usage per activity

4. **`app/projects/[id]/page.tsx`**
   - Simplified to two tabs: Dashboard and Data
   - Removed separate Usage tab (merged into Dashboard)

### API Integration
- **Frontend API**: `/api/generate` - Streams AI responses with token usage
- **Backend API**: 
  - `api.entries.createResponse()` - Saves AI responses with metrics
  - `api.projects.getAnalytics()` - Fetches usage analytics

### Data Flow
```
User Selection → Batch Process Button → Sequential Processing Loop
    ↓
For Each Row:
    Generate Prompt → Call AI API → Stream Response → Extract Tokens → Save to DB
    ↓
Update Progress → Show Completion Toast → Refresh Data
```

## Token Usage Tracking
Each AI generation captures:
- **Input Tokens**: Tokens in the prompt
- **Output Tokens**: Tokens in the AI response
- **Total Tokens**: Sum of input and output
- **Estimated Cost**: Calculated at $2.00 per 200K tokens ($10.00 per 1M tokens)

## Benefits
1. **Efficiency**: Process multiple items without manual intervention
2. **Transparency**: Real-time progress tracking
3. **Cost Awareness**: Detailed token usage and cost analytics
4. **Flexibility**: Select specific rows or all rows
5. **Reliability**: Sequential processing ensures stability
6. **Visibility**: Comprehensive dashboard for monitoring usage

## Future Enhancements (Potential)
- Parallel processing option for faster execution
- Batch size limits and rate limiting
- Pause/Resume functionality
- Export usage reports
- Cost budgeting and alerts
- Retry failed items
- Custom batch processing schedules
