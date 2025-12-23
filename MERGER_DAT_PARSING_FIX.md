# Merger DAT Parsing Fix - Explanation & Root Cause

## The Problem You Had

**Error Message**: `Invalid payload - missing cfg or datContent` with `datContent: ''` (empty string)

**Why**: The merger app's DAT file parser was **not actually parsing the DAT data**!

---

## Root Cause Analysis

### Your File Structure
- **HR_85429_ASCII.CFG**: 611 lines
  - 599 analog channels
  - 7 digital channels  
  - Format: ASCII
  - Sample rate: 50 Hz
  
- **HR_85429_ASCII.DAT**: 76 MB
  - Millions of sample records
  - Each line: `sample_number,ch1,ch2,...,ch599,dig1,dig2,...,dig7`
  - Example: `1,0,-1023923455,-323696831,...[597 more values]...4315,0,0,0,...[120 digital 0s/1s]`

### The Bug

**File**: `comtrade-combiner/src/utils/fileParser.js` line 173

Old code:
```javascript
static async parseDAT(datFile) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const buffer = e.target.result;
    resolve({
      fileName: datFile.name,
      fileSize: datFile.size,
      isBinary: true,
      byteLength: buffer.byteLength,  // ❌ Only metadata!
    });
  };
  reader.readAsArrayBuffer(datFile);  // ❌ Reading as binary, not parsing!
}
```

**Problem**: 
1. Reading DAT as `ArrayBuffer` instead of text
2. NOT extracting the data values at all
3. Just storing file metadata (size, name, etc.)
4. So `parsedData` had NO `.data` and NO `.times` properties
5. When `generateDAT()` tried to merge data, there was nothing to merge → empty output

### Data Flow Breakdown

❌ **BROKEN FLOW**:
```
Load Files
  ↓
parseDAT() reads as binary
  ↓
Returns: {fileName, fileSize, byteLength}  ← NO DATA ARRAYS!
  ↓
this.parsedData: [{cfg, /*...no data...*/}, {cfg, /*...no data...*/}]
  ↓
groupByTimeWindow() groups files
  ↓
groups[0].files = [{cfg, /*...STILL no data...*/}, ...]
  ↓
combineFiles() calls exportGroup()
  ↓
mergeGroupData() tries to access file.data
  ↓
file.data is UNDEFINED
  ↓
generateDAT() returns empty string ""
  ↓
datContent sent to main app: ""  ← ERROR!
```

---

## The Fix

**File**: `comtrade-combiner/src/utils/fileParser.js`

New code:
```javascript
static async parseDAT(datFile, cfgData) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Read as TEXT, not binary
        let text = typeof e.target.result === 'string' 
          ? e.target.result 
          : new TextDecoder().decode(e.target.result);
        
        // Parse ASCII format: sample_number,ch1,ch2,...,chN
        const lines = text.split('\n').filter(line => line.trim());
        const data = [];
        const times = [];
        
        const numAnalog = cfgData?.analogChannels?.length || 0;
        const sampleRate = cfgData?.sampleRate || 50;
        const timeDelta = 1 / sampleRate;
        
        // Extract data from each line
        lines.forEach((line, lineIdx) => {
          const values = line.split(',').map(v => Number(v.trim()));
          if (values.length > 0) {
            const sampleNum = values[0];
            const analogValues = values.slice(1, numAnalog + 1);
            const digitalValues = values.slice(numAnalog + 1);
            
            data.push([...analogValues, ...digitalValues]);
            times.push((sampleNum - 1) * timeDelta);
          }
        });
        
        resolve({
          data,              // ✅ Actual parsed data arrays!
          times,             // ✅ Calculated timestamps!
          analogData: data.map(row => row.slice(0, numAnalog)),
          digitalData: data.map(row => row.slice(numAnalog)),
          sampleCount: data.length,
          contentLength: text.length,
        });
      } catch (error) {
        reject(new Error(`Failed to parse DAT: ${error.message}`));
      }
    };
    reader.readAsText(datFile);  // ✅ Read as TEXT
  });
}
```

And updated the caller in `app.js`:
```javascript
const datData = await ComtradeFileParser.parseDAT(pair.dat, cfgData);  // Pass CFG for context
```

---

## ✅ FIXED DATA FLOW

```
Load Files
  ↓
parseDAT(datFile, cfgData) reads as TEXT ✅
  ↓
Parses each line: sample_number,ch1,ch2,...
  ↓
Returns: {data: [[...], [...], ...], times: [0, 0.02, 0.04, ...], ...} ✅
  ↓
this.parsedData: [{cfg, data, times}, {cfg, data, times}]
  ↓
groupByTimeWindow() groups files
  ↓
groups[0].files = [{cfg, data, times}, ...] ✅ HAS DATA!
  ↓
combineFiles() calls exportGroup()
  ↓
mergeGroupData() accesses file.data ✅
  ↓
generateDAT() merges data across files
  ↓
Returns: "1,123,456,789...\n2,124,457,790..." (thousands of lines) ✅
  ↓
datContent sent to main app ✅ COMPLETE!
```

---

## Performance Note

⚠️ **Large File Warning**: Your file is 76 MB with 600+ channels. 

Browser parsing may be:
- **Slower** (JavaScript parsing in browser, not native code)
- **Memory intensive** (all data loaded into arrays)
- **May timeout** on slower computers

**Solutions**:
1. Test with smaller COMTRADE files first (10-20 MB)
2. Add progress indicator during parsing (already in code)
3. Consider chunk-based parsing for production
4. Use Web Workers for background parsing (future optimization)

---

## Testing Your Fix

1. **Open merger app**
2. **Select multiple CFG/DAT pairs**
3. **Click "Analyze Files"** → Should now see actual data parsed
4. **Click "Combine & Export"** → Should see:
   ```
   [combineFiles] Group 1 file details:
     hasData: true        ← ✅ NOW TRUE!
     dataLength: 1000000  ← ✅ NOW > 0!
   ```
5. **Check main app console**:
   ```
   [mergerWindowLauncher] Payload structure:
   {datContentLength: 45000000, ...}  ← ✅ NOW HAS DATA!
   ```
6. **Charts should render** with merged data ✅

---

## Files Modified

1. **comtrade-combiner/src/utils/fileParser.js**
   - Rewrote `parseDAT()` to actually parse ASCII DAT format
   - Now extracts `data` and `times` arrays
   - Accepts `cfgData` parameter for context

2. **comtrade-combiner/src/app.js**
   - Updated `analyzeFiles()` to pass `cfgData` to `parseDAT()`
   - Now properly populates `this.parsedData` with parsed arrays

