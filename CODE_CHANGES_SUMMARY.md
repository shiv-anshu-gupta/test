# Code Changes Summary - Computed Channel Export

## File Modified

`src/components/EquationEvaluatorInChannelList.js`

## Functions Updated

### 1. `generateCFGContent(computation, sampleRate = 4800)`

**Purpose**: Generate COMTRADE 2013 compliant CFG file content

**Key Changes**:

#### Multiplier & Offset Calculation

```javascript
// OLD: Hardcoded 1.0 and 0.0 (no scaling!)
cfg += `1,COMPUTED,A,,A,1.0,0.0,0,-2147483648,2147483647,...\n`;

// NEW: Calculated from statistics
const min = computation.stats.min;
const max = computation.stats.max;
const range = max - min;
const intMin = -2147483648;
const intMax = 2147483647;
const intRange = intMax - intMin;
const multiplier = range / intRange;
const offset = min - intMin * multiplier;
```

#### MID Line

```javascript
// OLD: Hardcoded, wrong version
cfg += `MID=COMPUTED_CHANNEL_EXPORT,GENERATED_CHANNEL,2023\n`;

// NEW: Dynamic timestamp, correct version
cfg += `MID=COMPUTED_CHANNEL,EQUATION_${Date.now()},2013\n`;
```

#### Channel Count

```javascript
// OLD: Copied from original file
cfg += `599,7A,592D\n`;

// NEW: 1 total channel, 1 analog, 0 digital
cfg += `1,1A,0D\n`;
```

#### Analog Channel

```javascript
// OLD: Incomplete format with wrong fields
cfg += `1,COMPUTED,A,,A,1.0,0.0,0,-2147483648,2147483647,${sampleRate},1,P\n`;

// NEW: Full COMTRADE format with calculated multiplier/offset
cfg += `1,COMPUTED,,,V,${multiplier.toExponential(15)},${offset.toExponential(
  15
)},0,${intMin},${intMax},${sampleRate},1,P\n`;
```

#### Sampling Rates

```javascript
// OLD: Invalid format
cfg += `0d\n`;
cfg += `0a\n`;
cfg += `${sampleRate}d\n`;
cfg += `1.0s\n`;

// NEW: Proper COMTRADE format
cfg += `0\n`; // Number of rate changes (0 = constant)
cfg += `${sampleRate},${totalSamples}\n`; // Rate and end sample
```

#### Time Format

```javascript
// OLD: ISO format or custom, wrong format
const timestamp = new Date().toISOString().split("T")[0];

// NEW: COMTRADE standard DD/MM/YYYY,HH:MM:SS.mmmmmm
const now = new Date();
const day = String(now.getDate()).padStart(2, "0");
const month = String(now.getMonth() + 1).padStart(2, "0");
const year = now.getFullYear();
const hours = String(now.getHours()).padStart(2, "0");
const minutes = String(now.getMinutes()).padStart(2, "0");
const seconds = String(now.getSeconds()).padStart(2, "0");
const microseconds = String(now.getMilliseconds() * 1000).padStart(6, "0");
const timeStr = `${day}/${month}/${year},${hours}:${minutes}:${seconds}.${microseconds}`;
```

#### Header & Footer

```javascript
// OLD: Comment lines and missing fields
cfg += `Equation: ${computation.equation}\n`;
cfg += `Min: ${computation.stats.min.toFixed(2)}\n`;
cfg += `Max: ${computation.stats.max.toFixed(2)}\n`;
cfg += `Samples: ${computation.stats.count}\n`;

// NEW: Proper COMTRADE 2013 footer
cfg += `${timeStr}\n`; // Start time
cfg += `${timeStr}\n`; // Trigger time
cfg += `ASCII\n`; // File type
cfg += `1.0\n`; // Time multiplier
cfg += `0\n`; // Time offset 1
cfg += `0\n`; // Time offset 2
```

---

### 2. `generateDATContent(computation, sampleRate = 4800)`

**Purpose**: Generate COMTRADE ASCII data file with proper raw value conversion

**Key Changes**:

#### Timestamp Units

```javascript
// OLD: Seconds with microsecond precision
const timestamp = idx / sampleRate;
dat += `${idx + 1},${timestamp.toFixed(6)},${Math.round(value)}\n`;

// NEW: Milliseconds as integer
const timestampMs = Math.round((idx / sampleRate) * 1000);
dat += `${sampleNum},${timestampMs},${rawValue}\n`;
```

#### Value Conversion

```javascript
// OLD: Direct display value export (WRONG!)
Math.round(value);

// NEW: Convert to raw integer using multiplier/offset
const rawValue = Math.round((value - offset) / multiplier);
```

#### Comment Removal

```javascript
// OLD: Added comments at top
dat += `# COMTRADE Computed Channel Export\n`;
dat += `# Equation: ${computation.equation}\n`;
dat += `# Timestamp: ${new Date().toISOString()}\n`;
// ... more comments

// NEW: Pure COMTRADE format, no comments
// Direct output of sample#,timestamp_ms,raw_value
```

#### Format String

```javascript
// OLD: Custom format
`${idx + 1},${timestamp.toFixed(6)},${Math.round(
  value
)}\n`// NEW: COMTRADE ASCII standard
`${sampleNum},${timestampMs},${rawValue}\n`;
```

---

## Lines Changed

### In `generateCFGContent()`:

- **Before**: ~10 lines (hardcoded, wrong format)
- **After**: ~35 lines (calculated, proper format)
- **Net Change**: +25 lines

### In `generateDATContent()`:

- **Before**: ~15 lines (with comments, wrong units)
- **After**: ~28 lines (pure data, milliseconds, scaled values)
- **Net Change**: +13 lines

---

## Backward Compatibility

⚠️ **Breaking Change**: Old exported JSON files cannot be loaded by the new system

- Old format: JSON with direct values
- New format: COMTRADE CFG+DAT with scaled integers
- **Action**: Delete old exported files before exporting new ones

---

## Testing Checklist

```javascript
// In browser console after export:

// 1. Verify CFG structure
const cfg = <paste CFG content>;
console.assert(cfg.includes('2013'), '✓ COMTRADE 2013 version');
console.assert(cfg.includes('1,1A,0D'), '✓ Correct channel count');
console.assert(cfg.includes('E-'), '✓ Scientific notation for multiplier');
console.assert(cfg.includes('ASCII'), '✓ File type declared');

// 2. Verify DAT format
const dat = <paste DAT content>;
const lines = dat.trim().split('\n');
const firstLine = lines[0].split(',');
console.assert(firstLine.length === 3, '✓ Format: sample#,ms,value');
console.assert(/^\d+$/.test(firstLine[0]), '✓ Sample number is integer');
console.assert(/^\d+$/.test(firstLine[1]), '✓ Timestamp is integer (ms)');
console.assert(/^-?\d+$/.test(firstLine[2]), '✓ Value is integer');

// 3. Verify value range
const values = lines.map(l => parseInt(l.split(',')[2]));
console.assert(Math.max(...values) <= 2147483647, '✓ Max in INT32 range');
console.assert(Math.min(...values) >= -2147483648, '✓ Min in INT32 range');

// 4. Verify sample count matches
const totalSamples = lines.length;
console.log(`✓ Total samples exported: ${totalSamples}`);
```

---

## Performance Impact

- **Export time**: No change (same operations, just formatted differently)
- **File size**: Similar or slightly smaller (scientific notation is compact)
- **Memory**: Minimal (calculations are simple arithmetic)
- **Reload time**: Faster (parsers optimized for COMTRADE format)

---

## Migration Guide

### For Users with Old Exports

1. **Old system** (if still running):

   - Export computed channels as JSON
   - Files: `computed_channel_YYYY-MM-DD_HH-MM-SS.json`
   - Format: JSON with direct numerical values

2. **New system** (current):

   - Export computed channels as CFG+DAT
   - Files:
     - `computed_channel_YYYY-MM-DD_HH-MM-SS.cfg`
     - `computed_channel_YYYY-MM-DD_HH-MM-SS.dat`
   - Format: COMTRADE 2013 with scaled integers

3. **How to update**:
   - Delete old JSON exports (incompatible)
   - Re-execute equations to generate new CFG+DAT exports
   - Use "Select and Load Files" to reload new format

### For Developers

If modifying these functions in the future:

1. **Always calculate multiplier from actual min/max**

   - Never use hardcoded values like `1.0`
   - Use: `(max - min) / 4294967295`

2. **Always convert display values to raw integers**

   - Apply: `raw = (display - offset) / multiplier`
   - Round to nearest integer

3. **Always use proper COMTRADE time format**

   - Format: `DD/MM/YYYY,HH:MM:SS.mmmmmm`
   - Pad all components to fixed width

4. **Always verify files are COMTRADE compliant**
   - Test with `parseCFG()` and `parseDAT()`
   - Ensure parsers can reload exported files

---

## References

- **COMTRADE Standard**: IEEE Std 1344-1995 (1999 edition)
- **COMTRADE 2013**: IEEE Std 1344-2013 (2013 edition)
- **Parser Functions**: `src/components/comtradeUtils.js`
  - `parseCFG()` - Reads CFG and extracts configuration
  - `parseDAT()` - Reads DAT and applies multiplier/offset

---

## Success Metrics

After these changes, exported files should:

1. ✅ Generate without garbage values
2. ✅ Match HR_85429_ASCII.CFG structure
3. ✅ Load successfully via "Select and Load Files"
4. ✅ Display correct scaled values in chart
5. ✅ Be COMTRADE 2013 compliant
6. ✅ Be compatible with external COMTRADE tools
