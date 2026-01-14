# Export to Excel Feature - Documentation

## Overview
Added an "Export to Excel" feature in the **Approved** tab that allows users to export approved data with customizable column selection.

## Features

### 1. **Export Button**
- **Location**: Header section, next to the tabs
- **Visibility**: Only visible when:
  - The "Approved" tab is active
  - There are filtered rows to export (count > 0)
- **Icon**: FileSpreadsheet icon with "Export to Excel" label

### 2. **Column Selection Dialog**
Opens when the Export button is clicked, providing:
- **Column List**: Scrollable list of all available columns
- **Checkboxes**: Select/deselect individual columns
- **Bulk Actions**:
  - "Select All" - Selects all visible columns
  - "Deselect All" - Clears all selections
- **Counter**: Shows "X of Y columns selected"
- **Row Count**: Displays how many rows will be exported
- **Validation**: Requires at least one column to be selected

### 3. **Excel Export**
- **Library**: Uses `xlsx` (SheetJS) for Excel generation
- **Format**: `.xlsx` (Excel 2007+)
- **File Naming**: `{filename}_approved_{timestamp}.xlsx`
  - Example: `business_data_approved_2026-01-14T15-30-45.xlsx`
- **Features**:
  - Auto-sized columns based on content
  - Preserves column order
  - Includes only selected columns
  - Exports filtered data (respects current filters)

## Usage

### For End Users

1. **Navigate to Approved Tab**
   - Click on the "Approved" tab in the project viewer
   - Ensure you have approved responses to export

2. **Click Export Button**
   - Click "Export to Excel" button in the header
   - Export dialog will open

3. **Select Columns**
   - Check/uncheck columns you want to include
   - Use "Select All" or "Deselect All" for bulk operations
   - At least one column must be selected

4. **Export**
   - Click "Export Excel" button
   - File will download automatically
   - Success toast notification will appear

### Example Workflow

```
User approves 50 business listings
  ↓
Switches to "Approved" tab
  ↓
Clicks "Export to Excel" button
  ↓
Selects columns: business_name, address, phone, website
  ↓
Clicks "Export Excel"
  ↓
Downloads: business_data_approved_2026-01-14T15-30-45.xlsx
```

## Technical Implementation

### Components

#### `export-to-excel-dialog.tsx`
**Props**:
- `open: boolean` - Dialog visibility state
- `onOpenChange: (open: boolean) => void` - Callback for dialog state changes
- `rows: any[]` - Data rows to export
- `columns: string[]` - Available column names
- `fileName?: string` - Base name for the exported file

**State**:
- `selectedColumns: string[]` - Currently selected columns for export

**Key Functions**:
- `handleToggleColumn()` - Toggle individual column selection
- `handleSelectAll()` - Select all visible columns
- `handleDeselectAll()` - Clear all selections
- `handleExport()` - Generate and download Excel file

#### `project-viewer.tsx` Updates
**Added**:
- Import for `ExportToExcelDialog` component
- Import for `FileSpreadsheet` icon
- State: `exportDialogOpen` to control dialog visibility
- Conditional Export button in header (approved tab only)
- `ExportToExcelDialog` component at end of JSX

### Data Flow

```
User clicks "Export to Excel"
  ↓
setExportDialogOpen(true)
  ↓
Dialog opens with filteredRows and columns
  ↓
User selects columns
  ↓
User clicks "Export Excel"
  ↓
Filter rows to selected columns
  ↓
Create Excel worksheet with XLSX.utils.json_to_sheet()
  ↓
Auto-size columns
  ↓
Create workbook and append sheet
  ↓
Generate filename with timestamp
  ↓
Download file with XLSX.writeFile()
  ↓
Show success toast
  ↓
Close dialog
```

### Dependencies

**New Package**:
```json
{
  "xlsx": "^0.18.5"
}
```

**Installation**:
```bash
npm install xlsx
```

**Existing UI Components Used**:
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `Button`
- `Checkbox`
- `Label`
- `ScrollArea`
- Icons: `Download`, `FileSpreadsheet`
- `toast` from sonner

## File Structure

```
components/
├── export-to-excel-dialog.tsx    (NEW - Export dialog component)
├── project-viewer.tsx             (MODIFIED - Added export button & dialog)
└── ui/
    ├── checkbox.tsx               (EXISTING)
    ├── label.tsx                  (EXISTING)
    └── ...
```

## Features & Benefits

### For Users
1. **Flexible Export**: Choose exactly which columns to export
2. **Clean Data**: Only approved, verified data is exported
3. **Filtered Export**: Respects current filters (e.g., by location, status)
4. **Professional Format**: Standard Excel format compatible with all tools
5. **Timestamped Files**: Easy to track different exports

### For Developers
1. **Reusable Component**: Can be used in other parts of the app
2. **Type-Safe**: Full TypeScript support
3. **Performant**: Efficient Excel generation with xlsx library
4. **Extensible**: Easy to add more export options (CSV, PDF, etc.)

## Future Enhancements

Potential improvements:
- [ ] Export to CSV option
- [ ] Custom column ordering (drag & drop)
- [ ] Export with AI response data (validated_data fields)
- [ ] Multiple sheet export (one per category)
- [ ] Export templates (save column selections)
- [ ] Batch export (multiple files at once)
- [ ] Export scheduling/automation

## Testing Checklist

- [x] Export button appears only in Approved tab
- [x] Export button hidden when no approved rows
- [x] Dialog opens when button clicked
- [x] All columns listed (except internal `_` prefixed ones)
- [x] Select All / Deselect All work correctly
- [x] Individual column toggle works
- [x] Export disabled when no columns selected
- [x] Excel file downloads with correct name
- [x] Excel file contains only selected columns
- [x] Excel file contains correct row count
- [x] Column widths auto-sized
- [x] Success toast appears
- [x] Dialog closes after export
- [x] Filtered data exports correctly

## Error Handling

The component handles:
- **No columns selected**: Shows error toast, prevents export
- **Export failure**: Catches errors, shows error toast
- **Invalid data**: Gracefully handles null/undefined values
- **Large datasets**: xlsx library handles large files efficiently

## Browser Compatibility

Works in all modern browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

**Note**: File download uses browser's native download mechanism.
