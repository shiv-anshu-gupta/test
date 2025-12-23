# Debugging DAT Content Issue

## Problem
The `datContent` is coming back empty (`''`) when merging files.

## Root Cause Analysis

The issue is likely in the `generateDAT()` function in the merger app. It needs:
1. The `group` object with proper file data structure
2. Files to have `.data` and `.times` properties
3. Merged channel definitions

### Fixed Code
✅ Changed line 362 in `comtrade-combiner/src/app.js`:
```javascript
// BEFORE: Was only passing partial file data
const exported = ComtradeDataExporter.exportGroup(
  {
    files: this.report.groups[data.groupNumber - 1].files.map(f => ({
      fileName: f.name  // ❌ Missing .data and .times!
    }))
  },
  data.mergedChannels
);

// AFTER: Now passing complete group with all data
const exported = ComtradeDataExporter.exportGroup(
  this.report.groups[data.groupNumber - 1],  // ✅ Full group object
  data.mergedChannels
);
```

## How to Debug

### Step 1: Open Browser Console
Press **F12** and go to **Console** tab

### Step 2: Watch for These Logs (in Merger Window)

**GOOD OUTPUT:**
```
[combineFiles] Processing group 1: Files: 3 Merged channels: 15
[combineFiles] Exported group 1: {filename: "merged_1", cfgLength: 1250, datLength: 45000}
[combineFiles] Payload created: {hasCfg: true, datContentLength: 45000, filenames: 3}
[combineFiles] Merged files sent to main app successfully
```

**BAD OUTPUT (to avoid):**
```
[combineFiles] Processing group 1: Files: 3 Merged channels: 15
[combineFiles] Exported group 1: {filename: "merged_1", cfgLength: 1250, datLength: 0}
                                                                                    ❌ Empty!
```

### Step 3: Check Main App Console

**GOOD OUTPUT:**
```
[mergerWindowLauncher] 📨 Message from merger app: merged_files_ready
[mergerWindowLauncher] 📦 Processing merged files: {cfg: {...}, datContent: "1,1234,5678,...", ...}
[main.js] 📊 PHASE 1: Parsing merged data
[main.js] 📊 PHASE 2: Initializing data state
... (continues through all 8 phases)
```

**BAD OUTPUT (what we're seeing now):**
```
[mergerWindowLauncher] 📨 Message from merger app: merged_files_ready
[mergerWindowLauncher] 📦 Processing merged files: {cfg: {...}, datContent: '', ...}
                                                                        ❌ Empty string!
[mergerWindowLauncher] Invalid payload - missing cfg or datContent
```

## How generateDAT Works

The `generateDAT()` function in `dataExporter.js`:

```javascript
static generateDAT({ group, mergedChannels, baseFile }) {
  const lines = [];
  
  // Get merged data from all files in the group
  const mergedData = this.mergeGroupData(group, mergedChannels);
  
  // For each sample, create a line with: sampleNum, ch1, ch2, ch3, ...
  for (let i = 0; i < mergedData.length; i++) {
    const sample = mergedData[i];
    let line = `${i + 1}`;  // Sample number
    
    // Add channel values
    sample.values.forEach((value) => {
      line += `,${Math.round(value)}`;
    });
    
    lines.push(line);
  }
  
  return lines.join("\n");  // Returns string like: "1,123,456,789\n2,124,457,790\n..."
}
```

### What group.files Needs

```javascript
group.files = [
  {
    name: "file1.cfg",
    data: [      // ← This is what mergeGroupData needs
      [123, 456, 789, ...],  // Sample 1 values for each channel
      [124, 457, 790, ...],  // Sample 2 values
      ...
    ],
    times: [0, 0.02, 0.04, ...],  // Time for each sample
    cfg: { ... }  // Parsed config
  },
  {
    name: "file2.cfg",
    data: [...],
    times: [...],
    cfg: { ... }
  }
]
```

## What to Check

### 1. Are group.files properly structured?
In browser console (merger window), after selecting files and clicking "Analyze Files":

```javascript
// Check the analyzed data structure
console.log(app.report.groups[0].files[0])

// Should show:
{
  name: "ABC123456.cfg",
  cfg: { /* parsed config */ },
  data: Array(1000),      // ← Should have data!
  times: Array(1000),     // ← Should have times!
  // ... other properties
}
```

### 2. Does mergeGroupData produce output?
The function should combine data from all files. If files have no `.data` property, it produces nothing.

### 3. Is generateDAT being called with correct params?
Should receive:
- `group` - Object with `files` array (each with `.data` and `.times`)
- `mergedChannels` - Array of merged channel definitions
- `baseFile` - First file from group

## Quick Fix Tests

### Test 1: Check if files are loaded correctly
After "Analyze Files" in merger:
```javascript
// In merger window console:
const app = window.app || window.ComtradeComberApp  // or however it's exposed
console.log("Groups:", app.groups.length)
console.log("First group files:", app.groups[0].files.length)
console.log("First file data length:", app.groups[0].files[0].data?.length)
```

### Test 2: Check exported data
Before sending:
```javascript
// In merger window console, during/after combine:
// You should see logs like:
// [combineFiles] Exported group 1: {filename: "...", cfgLength: 1250, datLength: 45000}
```

### Test 3: Verify data flows to main app
After "Combine & Export":
```javascript
// In main app console:
// Should see datContent with actual values, not empty string
```

## Next Steps

1. **Run a test merge** with actual COMTRADE files
2. **Open browser console** (F12)
3. **Watch for the logs** mentioned above
4. **Check the datLength** - should be > 0
5. **If datLength = 0**, the issue is in how group.files is structured or populated

## Expected Data Flow

```
Merger Window:
├─ User selects files
├─ Files read and parsed
├─ group.files populated with .data and .times
├─ "Combine & Export" clicked
├─ generateDAT() called with proper group object
├─ Returns DAT string (1000+ lines)
├─ Sends via postMessage
│
Main App:
├─ Receives postMessage
├─ Validates datContent (not empty)
├─ Parses DAT via parseDAT()
├─ Processes through 8 phases
└─ Charts render with merged data
```

## Status
✅ **Code fixed** - Now passing full group object to exportGroup()
⏳ **Awaiting test** - Need to run merge and check console logs

**Next: Test with actual files and check console for the debug logs!**

