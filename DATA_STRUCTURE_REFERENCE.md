# File Data Structure Reference - How It Should Work

## Understanding the Data Flow

### From Merger App Perspective

When files are loaded in the merger app, `this.report.groups` should look like:

```javascript
this.report.groups = [
  {
    // Group 1 - Files loaded between same time windows
    files: [
      {
        name: "SUBSTATION_20250101_120000.cfg",
        cfg: {
          stationName: "SUBSTATION",
          analogChannels: [...],
          digitalChannels: [...],
          frequency: 50,
          // ... etc
        },
        data: [
          [  // Sample 1
            12345, // Channel 1 (Voltage)
            6789,  // Channel 2 (Current)
            1,     // Channel 3 (Digital)
            0      // Channel 4 (Digital)
          ],
          [  // Sample 2
            12346,
            6790,
            1,
            0
          ],
          // ... 1000s more samples
        ],
        times: [0, 0.02, 0.04, 0.06, ...],  // Time for each sample
      },
      {
        name: "SUBSTATION_20250101_120500.cfg",
        cfg: { ... },
        data: [ ... ],  // More channel values
        times: [ ... ],
      },
      {
        name: "SUBSTATION_20250101_121000.cfg",
        cfg: { ... },
        data: [ ... ],
        times: [ ... ],
      }
    ],
    timeSpan: {
      startTime: "2025-01-01T12:00:00Z",
      endTime: "2025-01-01T12:20:00Z"
    }
  }
]
```

### What Gets Passed to exportGroup()

**BEFORE (❌ WRONG):**
```javascript
{
  files: [
    { fileName: "file1.cfg" },  // ❌ Only filename!
    { fileName: "file2.cfg" },
    { fileName: "file3.cfg" }
  ],
  startTime: new Date(...),
  groupNumber: 1
}
```
This is **INCOMPLETE** - missing `.data` and `.times` properties!

**AFTER (✅ CORRECT):**
```javascript
{
  files: [
    {
      name: "file1.cfg",
      cfg: { ... },
      data: [ [...], [...], ... ],     // ✅ ESSENTIAL!
      times: [0, 0.02, 0.04, ...],     // ✅ ESSENTIAL!
    },
    {
      name: "file2.cfg",
      cfg: { ... },
      data: [ [...], [...], ... ],
      times: [0.5, 0.52, 0.54, ...],
    },
    {
      name: "file3.cfg",
      cfg: { ... },
      data: [ [...], [...], ... ],
      times: [1.0, 1.02, 1.04, ...],
    }
  ],
  timeSpan: { startTime: "...", endTime: "..." }
}
```
This is **COMPLETE** - has all data needed!

---

## How mergeGroupData() Works

```javascript
static mergeGroupData(group, mergedChannels) {
  const mergedData = [];
  
  // For each file in the group
  group.files.forEach((file, fileIdx) => {
    // For each sample in this file
    for (let sampleIdx = 0; sampleIdx < file.data.length; sampleIdx++) {
      
      // Create a merged sample with time and values
      mergedData.push({
        time: file.times[sampleIdx],
        values: [
          file.data[sampleIdx][0],   // Channel 1 from file
          file.data[sampleIdx][1],   // Channel 2 from file
          // ... more channels
        ]
      });
    }
  });
  
  return mergedData;
  // Returns: [
  //   { time: 0, values: [12345, 6789, 1, 0] },
  //   { time: 0.02, values: [12346, 6790, 1, 0] },
  //   ... thousands more
  // ]
}
```

Then `generateDAT()` converts this to a string:

```javascript
static generateDAT({ group, mergedChannels, baseFile }) {
  const mergedData = this.mergeGroupData(group, mergedChannels);
  const lines = [];
  
  for (let i = 0; i < mergedData.length; i++) {
    const sample = mergedData[i];
    let line = `${i + 1}`;  // Sample number (1, 2, 3, ...)
    
    // Add channel values
    sample.values.forEach((value) => {
      line += `,${Math.round(value)}`;
    });
    
    lines.push(line);
  }
  
  return lines.join("\n");
}

// Returns:
// "1,12345,6789,1,0\n2,12346,6790,1,0\n3,12347,6791,1,0\n..."
```

---

## The Fix Applied

**File:** `comtrade-combiner/src/app.js` line 362

**What Changed:**
```javascript
// OLD CODE (❌ Wrong):
const exported = ComtradeDataExporter.exportGroup(
  {
    files: this.report.groups[data.groupNumber - 1].files.map(f => ({
      fileName: f.name,  // ❌ Only keeping the name!
    })),
    startTime: new Date(...),
    groupNumber: data.groupNumber,
  },
  data.mergedChannels
);

// NEW CODE (✅ Correct):
const fullGroup = this.report.groups[data.groupNumber - 1];
const exported = ComtradeDataExporter.exportGroup(
  fullGroup,  // ✅ Passing entire group with all .data and .times!
  data.mergedChannels
);
```

---

## Verification Checklist

Before the fix is working, check:

- [ ] `this.report.groups[0].files[0].data` exists and has values
- [ ] `this.report.groups[0].files[0].times` exists and matches data length
- [ ] `ComtradeDataExporter.exportGroup()` receives full group object
- [ ] `generateDAT()` produces non-empty string output
- [ ] DAT content sent back has thousands of lines
- [ ] Main app parses DAT successfully

---

## Testing Steps

### 1. In Merger Window Console
```javascript
// After clicking "Analyze Files":
console.log('Files loaded:', app.report.groups[0].files.length);
console.log('First file has data:', !!app.report.groups[0].files[0].data);
console.log('Data length:', app.report.groups[0].files[0].data?.length);
```

Expected output:
```
Files loaded: 3
First file has data: true
Data length: 1000
```

### 2. Watch Console During "Combine & Export"
Look for:
```
[combineFiles] Processing group 1: Files: 3 Merged channels: 15
[combineFiles] Exported group 1: {filename: "merged_1", cfgLength: 1250, datLength: 45000}
[combineFiles] Payload created: {hasCfg: true, datContentLength: 45000, filenames: 3}
[combineFiles] Merged files sent to main app successfully
```

### 3. In Main App Console
After merge, should see:
```
[main.js] 📊 PHASE 1: Parsing merged data
[main.js] 📊 PHASE 2: Initializing data state
[main.js] 🎨 PHASE 3: Channel state initialization
[main.js] 📈 PHASE 4: Chart rendering (single batch)
... (continues through phases 5-8)
```

---

## Summary

The issue was that when sending data back to the main app, the merger app was only passing file **names** instead of the complete file **objects** with all their data.

**Now Fixed:** ✅ Passing entire group object with all data intact

**Status:** Ready to test with real COMTRADE files!

