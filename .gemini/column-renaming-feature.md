# Column Renaming Feature for Excel Export

## Overview
Enhanced the "Export to Excel" feature to allow users to **rename columns** before exporting. This provides flexibility to customize column headers for better readability and professionalism in the exported Excel files.

## What Changed

### Previous Behavior
- Columns exported with their original database/code names
- Example: `business_name`, `phone_number`, `created_at`

### New Behavior
- Columns automatically converted to Title Case by default
- Users can edit column names before export
- Example defaults: `Business Name`, `Phone Number`, `Created At`
- Users can customize to: `Company`, `Contact Phone`, `Date Added`

## Features

### 1. **Auto-Formatting**
When the dialog opens, column names are automatically formatted:
- `snake_case` → Title Case
- `camelCase` → Title Case with spaces
- Example transformations:
  - `business_name` → `Business Name`
  - `phoneNumber` → `Phone Number`
  - `created_at` → `Created At`

### 2. **Editable Column Names**
Each column row now includes:
- **Checkbox**: Select/deselect column
- **Original Name Label**: Shows the database column name (small, muted text)
- **Editable Input**: Edit the display name for Excel
- **Disabled State**: Input disabled when column is not selected

### 3. **Smart Export**
- Excel file uses the renamed headers
- Column widths auto-adjust based on renamed headers
- Original data values remain unchanged

## User Interface

### Layout
```
┌─────────────────────────────────────────┐
│ [✓] Original: business_name             │
│     [Business Name____________]          │
├─────────────────────────────────────────┤
│ [✓] Original: phone                     │
│     [Contact Phone_____________]         │
├─────────────────────────────────────────┤
│ [ ] Original: internal_id                │
│     [Internal Id_______________] (disabled)│
└─────────────────────────────────────────┘
```

### Visual Improvements
- **Larger Dialog**: Increased from 500px to 600px width
- **Taller Scroll Area**: Increased from 300px to 350px height
- **Better Spacing**: Added padding and hover effects
- **Clear Labels**: Shows "Original: {name}" above each input
- **Disabled State**: Grayed out inputs for unselected columns

## Usage Example

### Before Export
1. Click "Export to Excel" button
2. Dialog shows columns with auto-formatted names:
   - `business_name` → "Business Name"
   - `phone_number` → "Phone Number"
   - `website_url` → "Website Url"

### Customize Names
3. Edit the names to your preference:
   - "Business Name" → "Company"
   - "Phone Number" → "Phone"
   - "Website Url" → "Website"

### Export
4. Click "Export Excel"
5. Excel file has headers: `Company`, `Phone`, `Website`

## Technical Implementation

### State Management

```typescript
// Map of original column name to display name
const [columnNames, setColumnNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    visibleColumns.forEach(col => {
        // Auto-format to Title Case
        initial[col] = col
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim()
    })
    return initial
})
```

### Export Logic

```typescript
// Use renamed column names as keys in exported data
const exportData = rows.map(row => {
    const filteredRow: any = {}
    selectedColumns.forEach(col => {
        const displayName = columnNames[col] || col
        filteredRow[displayName] = row[col]  // Key is renamed, value is original
    })
    return filteredRow
})
```

### Column Width Calculation

```typescript
// Auto-size based on renamed headers
const columnWidths = selectedColumns.map(col => {
    const displayName = columnNames[col] || col
    return {
        wch: Math.max(
            displayName.length,
            ...exportData.map(row => String(row[displayName] || '').length)
        ) + 2
    }
})
```

## Benefits

### For Users
1. **Professional Headers**: Clean, readable column names in Excel
2. **Customization**: Tailor headers for specific audiences
3. **Consistency**: Standardize naming across exports
4. **Clarity**: Replace technical names with business-friendly terms

### For Business Use Cases
- **Client Reports**: Use client-preferred terminology
- **Internal Reports**: Use department-specific naming
- **Data Sharing**: Make data self-explanatory
- **Compliance**: Meet naming requirements for regulatory exports

## Examples

### Marketing Export
```
Original          → Renamed
business_name     → Company Name
phone_number      → Contact
email_address     → Email
created_at        → Lead Date
```

### Financial Export
```
Original          → Renamed
business_name     → Vendor
total_amount      → Invoice Total
payment_status    → Status
due_date          → Payment Due
```

### Operations Export
```
Original          → Renamed
business_name     → Facility
address           → Location
phone             → Main Line
status            → Operational Status
```

## Future Enhancements

Potential improvements:
- [ ] **Save Templates**: Save column name mappings for reuse
- [ ] **Preset Mappings**: Quick-select common naming schemes
- [ ] **Bulk Rename**: Apply naming patterns to multiple columns
- [ ] **Preview**: Show sample Excel output before export
- [ ] **Column Reordering**: Drag & drop to reorder columns
- [ ] **Name Validation**: Warn about duplicate or empty names

## Testing Checklist

- [x] Auto-formatting works for snake_case
- [x] Auto-formatting works for camelCase
- [x] Input fields are editable
- [x] Input fields disabled when column unselected
- [x] Renamed headers appear in Excel file
- [x] Column widths adjust to renamed headers
- [x] Original data values unchanged
- [x] Empty/whitespace names handled gracefully
- [x] Special characters in names work correctly
- [x] Dialog width accommodates longer names

## Code Changes

**Modified Files**:
- `components/export-to-excel-dialog.tsx`
  - Added `Input` component import
  - Added `columnNames` state for name mappings
  - Added `handleColumnNameChange` function
  - Updated export logic to use renamed headers
  - Updated UI to show editable inputs
  - Increased dialog and scroll area sizes

**No Breaking Changes**: Existing functionality preserved, only enhanced.
