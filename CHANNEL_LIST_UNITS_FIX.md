# Channel List Units Column Fix

## Issue

The **Unit** column in the channel list tabulator was not displaying properly - it appeared empty or had no visible width.

## Root Causes

1. **Missing Column Width**: The Unit column definition had no `width` specification, causing Tabulator's `fitColumns` layout to render it as 0px or minimal width.

2. **No Header Filter**: The column wasn't filterable like other columns, making it less discoverable.

## Solution Applied

### Changes to [src/components/ChannelList.js](src/components/ChannelList.js)

**1. Added Width and Header Filter** (Line 1606):

```javascript
// BEFORE:
{ title: "Unit", field: "unit", editor: "input" },

// AFTER:
{ title: "Unit", field: "unit", editor: "input", width: 100, headerFilter: "input" },
```

**2. Added Debug Logging** (Lines 1577-1579):

```javascript
console.log(
  "[ChannelList] Table data - Analog channels:",
  cfg.analogChannels.slice(0, 2).map((ch) => ({ id: ch.id, unit: ch.unit }))
);
console.log(
  "[ChannelList] Table data - Digital channels:",
  cfg.digitalChannels.slice(0, 2).map((ch) => ({ id: ch.id, unit: ch.unit }))
);
console.log(
  "[ChannelList] Prepared tableData units:",
  tableData.slice(0, 3).map((row) => ({ name: row.name, unit: row.unit }))
);
```

## Data Flow Verification

✅ **CFG Parser**: Units are correctly extracted from CFG files in [src/components/comtradeUtils.js](src/components/comtradeUtils.js) Line 188:

```javascript
unit: row[4],  // Field index 4 in analog channel definition
```

✅ **Table Data**: Units are properly mapped in ChannelList.js (Lines 1541-1543):

```javascript
unit: ch.unit || "",  // For analog channels
unit: ch.unit || "",  // For digital channels
unit: ch.unit || "",  // For computed channels
```

✅ **Column Definition**: Unit column now has proper width and is filterable

## Testing

After refresh, check:

1. ✅ Unit column is visible with ~100px width
2. ✅ Each channel shows its unit (V, A, Hz, etc.)
3. ✅ Can filter by unit using the header filter
4. ✅ Browser console shows logged units (check developer tools):
   - `[ChannelList] Table data - Analog channels: [{id: "VA", unit: "V"}, ...]`
   - `[ChannelList] Prepared tableData units: [{name: "VA", unit: "V"}, ...]`

## Column Properties Now Configured

| Property       | Value   | Purpose                      |
| -------------- | ------- | ---------------------------- |
| `title`        | "Unit"  | Column header display        |
| `field`        | "unit"  | Data field mapping           |
| `editor`       | "input" | Allow inline editing         |
| `width`        | 100     | Fixed column width in pixels |
| `headerFilter` | "input" | Enable search/filter by unit |

## Files Modified

- [src/components/ChannelList.js](src/components/ChannelList.js) - Lines 1577-1579, 1606
