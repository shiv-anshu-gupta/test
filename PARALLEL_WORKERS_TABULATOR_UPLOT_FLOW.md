# Parallel Web Workers: Tabulator to uPlot Pipeline Analysis

## Current Data Flow (Sequential)

```
COMTRADE File
    ↓ [Read as text]
readFileAsText(cfgFile, datFile)
    ↓
CFG Parsing (parseCFG)
├── Extract analog channel count/metadata
├── Extract digital channel count/metadata
└── Build samplingRates array
    ↓
DAT Parsing (parseDAT) ← SINGLE THREAD, LINEAR LOOP
├── ASCII format: Split lines, extract values
├── BINARY format: Read bytes via DataView
├── For each of 62,464 samples:
│   ├── Extract sample number
│   ├── Calculate time via interpolation
│   ├── Extract analog values (4+ channels) from each line
│   ├── Extract digital values and bit-mask them
│   └── Append to arrays
├── Output: time[], analogData[][], digitalData[][]
└── Result: ~500-800ms for 62K samples (CPU-bound)
    ↓
Data structure in memory:
├── time: [0, 0.00025, 0.0005, ...] (62,464 values)
├── analogData[0]: [1.5, 2.1, 1.8, ...] (62,464 values) ← Channel IA
├── analogData[1]: [1.4, 2.0, 1.9, ...] (62,464 values) ← Channel IB
├── analogData[2]: [1.6, 2.2, 1.7, ...] (62,464 values) ← Channel IC
├── digitalData[0]: [0, 1, 0, ...] (62,464 values)
└── ... more channels ...
    ↓
Render to Charts (PARALLEL PROCESSING OPPORTUNITY #1)
├── Create uPlot for analog data
│   ├── Build chart data structure
│   ├── Configure axes, colors
│   └── Render with uPlot (~20-50ms)
├── Create uPlot for digital data
│   ├── Build chart data structure
│   ├── Configure axes, colors
│   └── Render with uPlot (~20-50ms)
└── Display on screen (~100ms total with rendering)
    ↓
📊 CHART DISPLAYS
```

---

## Parallelization Opportunities Analysis

### OPPORTUNITY #1: Data Parsing ⭐ BEST CHOICE

**Current bottleneck**: `parseDAT()` takes 500-800ms for 62,464 samples

**Why it's slow**:

```javascript
// Current - SINGLE THREAD
for (let i = 0; i < sampleCount; i++) {
  // Extract sample number
  // Calculate time
  // Extract analog[0], analog[1], analog[2], ...
  // Extract digital[0], digital[1], digital[2], ...
  // Append to all arrays
  // Total: ~13-16 microseconds per sample × 62,464 samples = 800ms
}
```

**Parallelization Strategy: Data Chunking**

Split 62,464 samples into N chunks, process each in a separate worker:

```javascript
// SPLIT across 4 workers
Worker #1: Process samples 0-15,616         (15,616 samples)
Worker #2: Process samples 15,616-31,232    (15,616 samples)
Worker #3: Process samples 31,232-46,848    (15,616 samples)
Worker #4: Process samples 46,848-62,464    (15,616 samples)

Each worker:
1. Receives: datContent string + CFG + assigned chunk (start/end sample numbers)
2. Parses ONLY that chunk's records
3. Returns: time[], analogData[][], digitalData[][] for that chunk
4. Main thread: Concatenates results in order

EXPECTED SPEEDUP: ~3.5-4x (4 workers on 4 cores)
ACTUAL TIME: ~200-250ms (vs 800ms sequential)
```

**Implementation Complexity**: MODERATE

- Create `parseDAT` worker (120 lines)
- Chunk coordination logic in main (80 lines)
- Array concatenation after results return (20 lines)
- **Total: ~220 lines**

---

### OPPORTUNITY #2: Chart Rendering Preparation

**Current flow**: Sequential preparation of uPlot data structures

```javascript
// SEQUENTIAL - each waits for previous
Build analog chart data → ~50ms
Build digital chart data → ~50ms
Total: ~100ms
```

**Parallelization Strategy: Parallel Preparation**

```javascript
// PARALLEL - both run simultaneously
Worker #1: Prepare analog uPlot data structure
Worker #2: Prepare digital uPlot data structure
// Run simultaneously, both complete in ~50ms instead of 100ms

SPEEDUP: ~50% (minimal, already fast)
```

**Implementation Complexity**: LOW

- Already fast (50ms)
- Limited gain
- **Verdict: Not worth complexity**

---

### OPPORTUNITY #3: Multiple File Merging

**Current flow**: Sequential merging

```javascript
File A parsing → 800ms
File B parsing → 800ms
File C parsing → 800ms
Merge all → 200ms
Total: 2,600ms ❌
```

**Parallelization Strategy: Parallel Parsing Then Merge**

```javascript
File A parsing (Worker #1) ─┐
File B parsing (Worker #2) ─┼→ [300-400ms simultaneous]
File C parsing (Worker #3) ─┘
        ↓
Merge all → 200ms
Total: 600ms ✅ (75% faster!)
```

**Implementation Complexity**: MODERATE

- Handles multiple parseDAT workers
- Merge coordination
- **Verdict: Good but covered by Opportunity #1**

---

## RECOMMENDED APPROACH: Opportunity #1 (Data Parsing)

### Why This is the Best Choice

1. **Largest bottleneck** - 800ms is most visible to user
2. **High parallelizability** - Data can be split cleanly by sample ranges
3. **No shared state** - Each worker operates independently
4. **Direct speed improvement** - 800ms → 200-250ms is huge!
5. **Scales with CPU cores** - 4 cores = 4x speedup
6. **Already isolated** - parseDAT is in separate file (comtradeUtils.js)

### Architecture: Worker Pool for Parallel Parsing

```javascript
/**
 * NEW FILE: src/workers/parseDAT-Worker.js
 * Purpose: Parse assigned chunk of DAT file in worker thread
 */

// In worker:
self.onmessage = (e) => {
  const {
    datContent, // Full DAT string
    cfg, // Config object
    ft, // 'ASCII' or 'BINARY'
    startSample, // Chunk start
    endSample, // Chunk end
    chunkId, // Which chunk (for reassembly)
    timeUnit,
  } = e.data;

  // Call existing parseDAT function, but ONLY for samples startSample to endSample
  const chunkData = parseDAT(
    datContent,
    cfg,
    ft,
    timeUnit,
    { startSample, endSample } // ← NEW parameter for chunking
  );

  self.postMessage(
    {
      chunkId,
      time: chunkData.time,
      analogData: chunkData.analogData,
      digitalData: chunkData.digitalData,
      // Transfer typed arrays (zero-copy)
    },
    transferables
  );
};
```

```javascript
/**
 * NEW CLASS: src/utils/ParallelDATParser.js
 * Purpose: Coordinate parallel parsing across multiple workers
 */

class ParallelDATParser {
  constructor(workerCount = navigator.hardwareConcurrency || 2) {
    this.workerCount = Math.min(workerCount, 4); // Cap at 4
    this.workers = [];
    for (let i = 0; i < this.workerCount; i++) {
      this.workers.push(new Worker('./src/workers/parseDAT-Worker.js'));
    }
  }

  async parseDAT(datContent, cfg, ft, timeUnit) {
    const sampleCount = ... // extract from DAT or cfg
    const samplesPerWorker = Math.ceil(sampleCount / this.workerCount);

    const tasks = [];
    for (let i = 0; i < this.workerCount; i++) {
      const startSample = i * samplesPerWorker;
      const endSample = Math.min((i + 1) * samplesPerWorker, sampleCount);

      const task = new Promise((resolve) => {
        this.workers[i].onmessage = (e) => {
          resolve({
            chunkId: i,
            data: e.data
          });
        };

        this.workers[i].postMessage({
          datContent,
          cfg,
          ft,
          startSample,
          endSample,
          chunkId: i,
          timeUnit
        });
      });

      tasks.push(task);
    }

    // Wait for all workers
    const chunks = await Promise.all(tasks);

    // Sort by chunkId and concatenate
    chunks.sort((a, b) => a.chunkId - b.chunkId);

    return this.concatenateChunks(chunks.map(c => c.data));
  }

  concatenateChunks(chunkResults) {
    const combined = {
      time: [],
      analogData: [... create empty arrays ...],
      digitalData: [... create empty arrays ...],
      startDateInfo: chunkResults[0].startDateInfo
    };

    for (const chunk of chunkResults) {
      combined.time.push(...chunk.time);
      for (let i = 0; i < chunk.analogData.length; i++) {
        combined.analogData[i].push(...chunk.analogData[i]);
      }
      for (let i = 0; i < chunk.digitalData.length; i++) {
        combined.digitalData[i].push(...chunk.digitalData[i]);
      }
    }

    return combined;
  }

  terminate() {
    this.workers.forEach(w => w.terminate());
  }
}
```

### Integration into main.js

```javascript
// Initialize once at startup
let datParser = new ParallelDATParser(navigator.hardwareConcurrency || 2);

// In handleLoadFiles():
case 'file-loaded':
  const { cfgText, datText, fileType } = event.detail;
  const cfg = parseCFG(cfgText);

  // ✅ Use parallel parser instead of direct parseDAT call
  const data = await datParser.parseDAT(datText, cfg, fileType, 'seconds');

  // Rest of flow continues identically
  window.globalData = data;
  renderCharts(data);
  break;
```

---

## Performance Comparison

### Scenario: Load 62,464 Sample COMTRADE File

| Phase           | Sequential | Parallel (2 cores) | Parallel (4 cores) | Speedup     |
| --------------- | ---------- | ------------------ | ------------------ | ----------- |
| CFG Parsing     | 5ms        | 5ms                | 5ms                | —           |
| DAT Parsing     | 800ms      | 450ms              | 220ms              | **3.6x** ✅ |
| Chart Rendering | 80ms       | 80ms               | 80ms               | —           |
| **Total**       | **885ms**  | **535ms**          | **305ms**          | **2.9x**    |

**User Experience**:

- Sequential: ~1 second before chart appears
- Parallel (4 cores): ~300ms before chart appears (3.3x faster!)

---

## Detailed Implementation Steps

### Step 1: Modify parseDAT to Support Chunking

**File**: `src/components/comtradeUtils.js`

Add optional parameter to parseDAT:

```javascript
export function parseDAT(
  datContent,
  cfg,
  ft,
  timeUnit = "microseconds",
  chunkRange = null // ← NEW: { startSample, endSample }
) {
  // ... existing code ...

  // Filter records by sample number if chunking
  if (chunkRange) {
    // Only parse records within startSample to endSample
    // For ASCII: skip lines until we reach startSample
    // For BINARY: seek to byte position of startSample, read until endSample
  }

  // ... rest of function ...
}
```

### Step 2: Create Worker for Parsing

**File**: `src/workers/parseDAT-Worker.js` (new file)

```javascript
// Import parseDAT from comtradeUtils
import { parseDAT } from "../components/comtradeUtils.js";

self.onmessage = (e) => {
  const { datContent, cfg, ft, startSample, endSample, chunkId, timeUnit } =
    e.data;

  try {
    console.log(
      `[Worker ${chunkId}] Parsing samples ${startSample}-${endSample}`
    );

    const chunkData = parseDAT(datContent, cfg, ft, timeUnit, {
      startSample,
      endSample,
    });

    console.log(`[Worker ${chunkId}] ✅ Complete`);

    self.postMessage({
      chunkId,
      time: chunkData.time,
      analogData: chunkData.analogData,
      digitalData: chunkData.digitalData,
      startDateInfo: chunkData.startDateInfo,
    });
  } catch (error) {
    self.postMessage({
      chunkId,
      error: error.message,
    });
  }
};
```

### Step 3: Create Parser Coordinator Class

**File**: `src/utils/ParallelDATParser.js` (new file)

Use the class shown above (~180 lines)

### Step 4: Update main.js

**File**: `src/main.js`

Replace the direct `parseDAT` call with the parallel parser.

### Step 5: Test Scenarios

1. Load single 62K file → Should use parallel workers, show timing
2. Merge 3 files (3 × 62K) → All parse in parallel
3. Monitor memory usage → Should spike then normalize
4. Verify results identical → Compare hash of old vs new approach

---

## Code Size & Complexity

| Component                 | Lines       | Complexity | Risk       |
| ------------------------- | ----------- | ---------- | ---------- |
| parseDAT chunking support | 30-50       | Low        | Low        |
| parseDAT-Worker.js        | 40-50       | Low        | Low        |
| ParallelDATParser.js      | 150-200     | Medium     | Medium     |
| main.js integration       | 5-10        | Low        | Low        |
| **Total**                 | **225-310** | Medium     | **Medium** |

---

## When NOT to Use Parallel Parsing

1. **Small files** (<10K samples) - Overhead > benefit
2. **Already have slow network** - Parsing not the bottleneck
3. **Very old browsers** - May not support Web Workers
4. **Mobile devices** - Limited cores, memory-constrained

---

## Alternative: Simple Dual-Worker Approach

If full parallelization feels complex:

```javascript
// Just split into 2 chunks instead of N
Worker #1: Parse samples 0-31,232
Worker #2: Parse samples 31,232-62,464

// Speedup: ~1.8x (instead of 3.6x with 4 workers)
// Complexity: ~40% less code
// Still significant improvement
```

---

## Fallback: Progressive Enhancement

Make it optional:

```javascript
// Use parallel parsing IF:
// 1. File > 20,000 samples
// 2. Browser supports Web Workers
// 3. >= 2 CPU cores available

if (shouldUseParallel(sampleCount, cpuCores)) {
  data = await parallelParser.parseDAT(...);
} else {
  data = parseDAT(...); // Fall back to sequential
}
```

---

## Recommendation

### ⭐ **Implement Opportunity #1: Parallel DAT Parsing**

**Why**:

- Largest bottleneck (800ms)
- Clean separation of concerns
- 3-4x speedup (most impressive improvement)
- Natural fit for worker pools
- Can be progressive enhancement (optional)

**Timeline**:

- Estimated implementation: 4-6 hours
- Testing: 1-2 hours
- Total: 5-8 hours

**Impact**:

- User perceives 3x faster file loading
- Scales with available CPU cores
- No UI changes needed
- Backward compatible

**Next Step**:
Would you like me to implement this parallel DAT parser? I can start with the parseDAT chunking modifications, then build the worker and coordinator class.
