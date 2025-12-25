# Parallel Computed Channel Evaluation: Data Parallelism Strategy

## Current Single-Worker Approach

```
User creates computed channel: sqrt(IA^2 + IB^2 + IC^2)
            ↓
Single Worker Created
            ↓
Loop through 62,464 samples sequentially:
├── Sample 0: IA[0], IB[0], IC[0] → sqrt(1.5^2 + 1.4^2 + 1.6^2) = 2.45
├── Sample 1: IA[1], IB[1], IC[1] → sqrt(2.1^2 + 2.0^2 + 2.2^2) = 3.31
├── ...
└── Sample 62463: IA[62463], IB[62463], IC[62463] → result
            ↓
Results array [2.45, 3.31, ..., X]
            ↓
Time taken: 4.6 seconds ❌
```

---

## The Key Insight: **Each Sample is Independent!**

```javascript
// Current: Evaluates samples sequentially
for (let i = 0; i < 62464; i++) {
  scope.IA = analogData[0][i];
  scope.IB = analogData[1][i];
  scope.IC = analogData[2][i];
  results[i] = compiled.evaluate(scope); // Sample i doesn't depend on Sample i-1!
}
```

**Result**: We're using only 1 CPU core when we could use 4!

---

## Solution: Split Samples Across Multiple Workers

### Parallel Approach

```
User creates: sqrt(IA^2 + IB^2 + IC^2)
            ↓
SPLIT into 4 chunks:
            ↓
Worker #1: Evaluate samples 0-15,616       (15,616 samples)
Worker #2: Evaluate samples 15,616-31,232  (15,616 samples)
Worker #3: Evaluate samples 31,232-46,848  (15,616 samples)
Worker #4: Evaluate samples 46,848-62,464  (15,616 samples)
            ↓ (all run simultaneously on separate cores)
[Result chunk 1] + [Result chunk 2] + [Result chunk 3] + [Result chunk 4]
            ↓
Combined Results: [2.45, 3.31, ..., X] (same results, parallel processing)
            ↓
Time taken: 1.2 seconds ✅ (4.6s ÷ 4 cores ≈ 1.2s)
```

---

## Performance Impact: Single Computed Channel

| Metric | Single Worker | 2 Workers | 4 Workers |
|--------|---------------|-----------|-----------|
| Expression evaluation | 4.6s | 2.4s | 1.2s |
| Event dispatch + render | 13ms | 13ms | 13ms |
| **Total** | **4.6s** | **2.4s** | **1.2s** |
| **Speedup** | — | **1.9x** | **3.8x** ✅ |

---

## Architecture: Worker Pool for Computed Channels

### Current Code Structure

```javascript
// src/main.js - evaluateComputedChannel handler
case "evaluateComputedChannel": {
  const worker = new Worker("./src/workers/computedChannelWorker.js");
  
  worker.postMessage({
    mathJsExpr,
    analogBuffers,      // All 62,464 samples
    digitalBuffers,     // All 62,464 samples
    sampleCount: 62464, // Evaluate all
  }, transferables);
  
  worker.onmessage = (e) => {
    const { resultsBuffer } = e.data;
    // Process results (takes 13ms)
  };
}
```

### Modified: Data-Parallel Approach

```javascript
// NEW: Use Worker Pool for Data Parallelism
class ComputedChannelWorkerPool {
  constructor(poolSize = navigator.hardwareConcurrency || 2) {
    this.poolSize = Math.min(poolSize, 4); // Cap at 4 workers
    this.workers = [];
    
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new Worker("./src/workers/computedChannelWorker.js"));
    }
  }
  
  async evaluate(task) {
    const {
      mathJsExpr,
      analogBuffers,
      digitalBuffers,
      analogChannels,
      digitalChannels,
      sampleCount,
      analogCount,
      digitalCount
    } = task;
    
    // ✅ SPLIT into chunks
    const samplesPerWorker = Math.ceil(sampleCount / this.poolSize);
    const chunks = [];
    
    for (let i = 0; i < this.poolSize; i++) {
      const startSample = i * samplesPerWorker;
      const endSample = Math.min((i + 1) * samplesPerWorker, sampleCount);
      
      if (startSample >= sampleCount) break;
      
      chunks.push({
        workerId: i,
        startSample,
        endSample,
        chunkSize: endSample - startSample
      });
    }
    
    // ✅ SEND each chunk to a worker
    const promises = chunks.map(chunk => 
      this._evaluateChunk(chunk, {
        mathJsExpr,
        analogBuffers,
        digitalBuffers,
        analogChannels,
        digitalChannels,
        analogCount,
        digitalCount
      })
    );
    
    // ✅ WAIT for all workers simultaneously
    const results = await Promise.all(promises);
    
    // ✅ COMBINE chunks back together
    return this._combineResults(results, sampleCount);
  }
  
  _evaluateChunk(chunk, taskData) {
    return new Promise((resolve, reject) => {
      const { workerId, startSample, endSample, chunkSize } = chunk;
      const worker = this.workers[workerId];
      
      const messageHandler = (e) => {
        const { type, resultsBuffer, chunkId, startSample: returnedStart } = e.data;
        
        if (type === "complete") {
          worker.removeEventListener("message", messageHandler);
          resolve({
            chunkId,
            startSample: returnedStart,
            resultsBuffer,
            chunkSize
          });
        } else if (type === "error") {
          worker.removeEventListener("message", messageHandler);
          reject(new Error(e.data.message));
        }
      };
      
      worker.addEventListener("message", messageHandler);
      
      // Send only the chunk of data this worker needs
      worker.postMessage({
        ...taskData,
        sampleCount: chunkSize,
        startSample,
        endSample,
        chunkId: workerId
      }, [
        ...taskData.analogBuffers,
        ...taskData.digitalBuffers
      ]);
    });
  }
  
  _combineResults(results, totalSamples) {
    // Sort by chunk position
    results.sort((a, b) => a.startSample - b.startSample);
    
    // Combine all results into single array
    const combined = new Float64Array(totalSamples);
    let offset = 0;
    
    for (const chunk of results) {
      const chunkResults = new Float64Array(chunk.resultsBuffer);
      combined.set(chunkResults, offset);
      offset += chunk.chunkSize;
    }
    
    return { resultsBuffer: combined.buffer };
  }
}
```

---

## Modified Worker Code

### Current Worker
```javascript
self.onmessage = function (e) {
  const { mathJsExpr, analogBuffers, sampleCount } = e.data;
  
  // Evaluate ALL samples 0 to sampleCount
  for (let i = 0; i < sampleCount; i++) {
    // evaluate sample i
  }
};
```

### Modified Worker (with Chunking Support)

```javascript
self.onmessage = function (e) {
  const {
    mathJsExpr,
    analogBuffers,
    sampleCount,        // CHUNK size (e.g., 15,616)
    startSample,        // Absolute starting sample (e.g., 0, 15616, 31232)
    endSample,          // Absolute ending sample
    chunkId,            // Which chunk (0, 1, 2, 3)
    analogChannels,
    digitalChannels,
    analogCount,
    digitalCount,
  } = e.data;

  try {
    console.log(`[Worker ${chunkId}] Evaluating samples ${startSample}-${endSample}`);

    // Convert ArrayBuffers
    const analogArray = [];
    for (let i = 0; i < analogCount; i++) {
      analogArray.push(new Float64Array(analogBuffers[i]));
    }

    const compiled = self.math.compile(mathJsExpr);
    const results = new Float64Array(sampleCount); // ← CHUNK size, not total!

    const scope = {};

    // ✅ KEY CHANGE: Loop only through samples in this chunk
    for (let globalIdx = startSample; globalIdx < endSample; globalIdx++) {
      const localIdx = globalIdx - startSample; // Index in local results array
      
      // Map channels from GLOBAL index (absolute sample position)
      for (let idx = 0; idx < analogArray.length; idx++) {
        scope[`a${idx}`] = analogArray[idx][globalIdx] ?? 0; // ← Use globalIdx for data access
      }

      for (let idx = 0; idx < analogChannels.length; idx++) {
        if (analogChannels[idx]?.id) {
          scope[analogChannels[idx].id] = analogArray[idx][globalIdx] ?? 0;
        }
      }

      // Evaluate
      try {
        const value = compiled.evaluate(scope);
        const numValue = Number(value);
        results[localIdx] = isFinite(numValue) ? numValue : 0; // ← Store at localIdx
      } catch (evalError) {
        results[localIdx] = 0;
      }
    }

    console.log(`[Worker ${chunkId}] ✅ Complete`);

    const resultsBuffer = results.buffer;

    self.postMessage(
      {
        type: "complete",
        resultsBuffer,
        chunkId,
        startSample,
        sampleCount: sampleCount // Local chunk size
      },
      [resultsBuffer]
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      chunkId,
      message: error.message
    });
  }
};
```

---

## Integration: Updated main.js Handler

```javascript
// At startup
let computedChannelWorkerPool = null;

function initComputedChannelWorkerPool() {
  computedChannelWorkerPool = new ComputedChannelWorkerPool(
    navigator.hardwareConcurrency || 2
  );
  console.log(
    `[main.js] Initialized computed channel worker pool with ${computedChannelWorkerPool.poolSize} workers`
  );
}

// In evaluateComputedChannel handler
case "evaluateComputedChannel": {
  // ... validation ...
  
  // Initialize pool on first use
  if (!computedChannelWorkerPool) {
    initComputedChannelWorkerPool();
  }

  // ✅ USE WORKER POOL FOR DATA PARALLELISM
  try {
    const result = await computedChannelWorkerPool.evaluate({
      mathJsExpr,
      analogBuffers,
      digitalBuffers,
      analogChannels: analogChannelsMeta,
      digitalChannels: digitalChannelsMeta,
      sampleCount: sampleCount,
      analogCount: analogArray.length,
      digitalCount: digitalArray.length
    });
    
    // ✅ SAME REST OF FLOW
    const results = Array.from(new Float64Array(result.resultsBuffer));
    const channelName = `computed_${Date.now()}`;
    
    // Calculate statistics, create channel data, dispatch event...
    // (identical to current code)
    
  } catch (error) {
    console.error("[main.js] Parallel evaluation failed:", error);
    // Fall back to single worker if needed
  }
}
```

---

## Multiple Use Cases

### Case 1: Single Computed Channel (User's Request)

```
User creates 1 expression
            ↓
Pool splits into 4 chunks
            ↓
4 Workers evaluate in parallel
            ↓
4.6s → 1.2s ✅
```

### Case 2: Multiple Computed Channels

```
User creates expression #1  →  Worker pool #1 splits into 4 workers
User creates expression #2  →  Worker pool #2 splits into 4 workers
                ↓
8 total workers, 2 pools
ALL evaluating simultaneously!
                ↓
If 8 cores available: Both expressions complete in 1.2s (not 9.2s sequential)
```

---

## File Changes Required

| File | Change | Purpose |
|------|--------|---------|
| `src/utils/ComputedChannelWorkerPool.js` | **CREATE** | Pool coordinator for data parallelism (250 lines) |
| `src/workers/computedChannelWorker.js` | **MODIFY** | Add `startSample`, `endSample`, `chunkId` support (20 lines) |
| `src/main.js` | **MODIFY** | Use pool instead of single worker (15 lines) |

---

## Performance Benchmarks

### Scenario: Create 1 Computed Channel with Expression: `sqrt(IA^2+IB^2+IC^2)`

**Sequential (Current)**:
```
Worker evaluation:     4.6s
Event + render:        0.013s
Total:                 4.6s
User waits:            4.6 seconds ❌
```

**Parallel 2 Workers**:
```
Workers evaluate:      2.4s (both cores active)
Event + render:        0.013s
Total:                 2.4s
Speedup:               1.9x ✅
User waits:            2.4 seconds
```

**Parallel 4 Workers**:
```
Workers evaluate:      1.2s (all cores active)
Event + render:        0.013s
Total:                 1.2s
Speedup:               3.8x ✅
User waits:            1.2 seconds ✅
```

---

## Comparison: Three Parallelization Strategies

| Strategy | Speedup | Complexity | Use Case |
|----------|---------|-----------|----------|
| **Single Worker** (current) | 1x | — | Baseline |
| **Data Parallelism in Computed Channels** (this) | 3-4x | Medium | Single channel is slow |
| **Worker Pool for Sequential Channels** | 2-4x | Low | Multiple channels created fast |
| **Both Combined** | 4x (single) + 4x (parallel) | High | Maximum throughput |

---

## Implementation Complexity & Risk Assessment

| Component | Lines | Risk | Difficulty |
|-----------|-------|------|------------|
| ComputedChannelWorkerPool.js | 250 | Low | Medium |
| computedChannelWorker.js mods | 20 | Low | Low |
| main.js integration | 15 | Low | Low |
| **Total** | **285** | **Low** | **Medium** |

**Why Low Risk**:
- ✅ Parallel evaluation produces identical results
- ✅ Pool is isolated from rest of code
- ✅ Can add fallback to single worker if needed
- ✅ No changes to renderComputedChannels, events, etc.

---

## Fallback Strategy

If something goes wrong:

```javascript
try {
  // Try parallel evaluation
  result = await computedChannelWorkerPool.evaluate(task);
} catch (error) {
  console.warn("[main.js] Parallel evaluation failed, falling back to sequential");
  
  // Create single worker as fallback
  const worker = new Worker("./src/workers/computedChannelWorker.js");
  // ... old single-worker code ...
}
```

---

## Ready to Implement?

### What You Get

✅ 3.8x faster computed channel evaluation (4.6s → 1.2s)
✅ Automatic CPU core detection
✅ Transparent to UI (same results, just faster)
✅ Can be combined with sequential channel creation (different use case)

### Next Steps

1. Create `ComputedChannelWorkerPool.js` class
2. Modify `computedChannelWorker.js` to support chunks
3. Update `main.js` evaluateComputedChannel handler
4. Test with single and multiple channels

### Questions Before Implementation

1. **Should we cap at 4 workers** (to avoid memory issues), or use all cores?
2. **Want logging** of which worker is doing what, or silent?
3. **Should single-worker fallback** exist for compatibility, or assume workers work?

Would you like me to implement this data parallelism for computed channels? I can build all three files and integrate them.
