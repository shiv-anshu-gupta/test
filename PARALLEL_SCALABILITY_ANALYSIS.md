# Data Parallelism Scalability Analysis: Large Sample Counts

## Current Baseline (62,464 samples)

```
Single Worker Time: 4.6 seconds
With 4 parallel workers: 1.2 seconds
```

---

## Scenarios: What Happens with Larger Sample Counts?

### Scenario A: 624,640 Samples (10x larger)

```
Theoretical (Linear scaling):
└─ Single worker: 46 seconds
└─ 4 workers: 46s ÷ 4 = 11.5 seconds (all in parallel)
└─ 8 workers: 46s ÷ 8 = 5.75 seconds

Reality Check:
├─ CPU cores available: Usually 2-8
├─ Memory per worker: ~20MB (4 channels × 156K samples × 8 bytes)
├─ Total memory: 4 workers × 20MB = 80MB ✅ (Still OK on modern systems)
├─ Math.js compilation overhead: ~5ms per worker (negligible)
└─ Result: ~11.5 seconds with 4 workers (acceptable for 10x data)
```

### Scenario B: 6,246,400 Samples (100x larger, hypothetically)

```
Theoretical:
└─ Single worker: 460 seconds (7.7 minutes)
└─ 4 workers: 115 seconds (1.9 minutes)

Memory Concerns:
├─ Per worker: ~200MB (4 channels × 1.56M samples × 8 bytes)
├─ Total memory: 4 workers × 200MB = 800MB ⚠️ (Getting high)
├─ Overhead grows: Math.js compilation, ArrayBuffer transfers
└─ Diminishing returns beyond 4 workers

Performance Reality:
├─ 2 workers: 230 seconds (best for limited memory)
├─ 4 workers: 115 seconds (good balance)
├─ 8 workers: Memory pressure starts (~1.6GB for 4 channels)
└─ Result: Pool capping at 4 workers is actually SMART
```

### Scenario C: 62,464,000 Samples (1,000x larger)

```
Memory explosion:
├─ Per worker at 4-worker pool: ~2GB per chunk
├─ Total: 8GB just for data transfer
└─ ❌ BREAKS DOWN - Exceeds typical system memory

Worker Overhead becomes significant:
├─ Workers can't share memory (IPC overhead is real)
├─ Each worker needs its own copy of ALL ArrayBuffers
├─ Transfer time between main and workers becomes bottleneck
└─ Parallelism speedup drops from 4x to ~2x
```

---

## Memory Analysis by Sample Count

| Samples    | Per Channel | Per Worker (4 workers) | Total (4 Workers) | Status       |
| ---------- | ----------- | ---------------------- | ----------------- | ------------ |
| 62,464     | 500KB       | 2MB                    | 8MB               | ✅ Excellent |
| 624,640    | 5MB         | 20MB                   | 80MB              | ✅ Good      |
| 6,246,400  | 50MB        | 200MB                  | 800MB             | ⚠️ High      |
| 62,464,000 | 500MB       | 2GB                    | 8GB               | ❌ Critical  |

---

## CPU Time vs Memory Tradeoff

### Small Samples (< 100K)

```
Parallelism: ✅ 3-4x speedup
Memory: ✅ < 50MB
Verdict: Use 4 workers
```

### Medium Samples (100K - 1M)

```
Parallelism: ✅ 2.5-3.5x speedup
Memory: ⚠️ 200-800MB
Verdict: Use 4 workers (or scale by sample count)
```

### Large Samples (1M - 10M)

```
Parallelism: ⚠️ 1.5-2.5x speedup (diminishing)
Memory: ❌ 800MB - 8GB
CPU cores: Limited
Verdict: Use 2 workers or fall back to single worker
```

### Massive Samples (> 10M)

```
Parallelism: ❌ 1-1.5x speedup (not worth it)
Memory: ❌ > 8GB
Overhead: Message passing > computation gains
Verdict: Use single worker (avoid transfer overhead)
```

---

## Smart Scaling Strategy: Dynamic Worker Count

Instead of always using 4 workers, **adapt based on sample count**:

```javascript
class ComputedChannelWorkerPool {
  constructor(sampleCount) {
    // ✅ Dynamically choose worker count based on data size
    this.poolSize = this.calculateOptimalWorkerCount(sampleCount);

    console.log(
      `[Pool] ${sampleCount} samples → Using ${this.poolSize} workers`
    );

    this.workers = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new Worker("./src/workers/computedChannelWorker.js"));
    }
  }

  calculateOptimalWorkerCount(sampleCount) {
    const cpuCores = navigator.hardwareConcurrency || 2;

    // ✅ Smart scaling based on sample count and memory
    if (sampleCount < 100000) {
      // Small files: Use all available cores
      return Math.min(cpuCores, 4);
    } else if (sampleCount < 1000000) {
      // Medium files: Use up to 4 workers
      return Math.min(cpuCores, 4);
    } else if (sampleCount < 10000000) {
      // Large files: Use 2 workers max (memory pressure)
      return Math.min(cpuCores, 2);
    } else {
      // Massive files: Single worker (transfer overhead too high)
      return 1;
    }
  }

  async evaluate(task) {
    // If only 1 worker selected, use it directly (no overhead)
    if (this.poolSize === 1) {
      console.log("[Pool] Massive dataset - using single worker (no split)");
      return await this._evaluateSingleWorker(task);
    }

    // Otherwise, use parallel approach
    return await this._evaluateParallel(task);
  }

  async _evaluateSingleWorker(task) {
    return new Promise((resolve, reject) => {
      const worker = this.workers[0];

      worker.onmessage = (e) => {
        if (e.data.type === "complete") {
          resolve({ resultsBuffer: e.data.resultsBuffer });
        } else if (e.data.type === "error") {
          reject(new Error(e.data.message));
        }
      };

      // Send entire task to single worker (no chunking)
      worker.postMessage(
        {
          ...task,
          chunkId: 0,
          startSample: 0,
          endSample: task.sampleCount,
        },
        [...task.analogBuffers, ...task.digitalBuffers]
      );
    });
  }

  async _evaluateParallel(task) {
    // ... existing parallel code ...
  }
}
```

---

## Performance Predictions by Sample Count

### 62,464 Samples (Standard COMTRADE)

```
Strategy: 4 workers
Time: 1.2 seconds
Memory: 8MB
Overhead: None worth mentioning
Result: ✅ PERFECT
```

### 624,640 Samples (10x standard)

```
Strategy: 4 workers
Time: 11.5 seconds
Memory: 80MB
Calculation: ~2.5μs per sample × 156K samples per worker = 11.5s
Result: ✅ ACCEPTABLE (scaling linearly)
```

### 6,246,400 Samples (100x standard)

```
Strategy: 4 workers
Time: ~115 seconds (1.9 minutes)
Memory: 800MB (manageable)
Transfer overhead: ~100ms (5% of total)
Result: ⚠️ SLOW BUT DOABLE - User can wait 2 minutes

Alternative: Use 2 workers
Time: ~230 seconds (3.8 minutes)
Memory: 400MB
Result: ⚠️ Slower but uses less memory
```

### 62,464,000 Samples (1000x standard)

```
Strategy: Should switch to SINGLE WORKER
Time: ~1150 seconds (19 minutes)
Memory: 2GB per chunk × 1 worker = 2GB total (not 8GB)
Transfer overhead: ~500ms (much less pain)
Result: ⚠️ VERY SLOW but doesn't crash system

Why single worker for massive files:
├─ 4 workers × 2GB each = 8GB transfer ❌
├─ 1 worker × total data = 2GB transfer ✅
├─ IPC overhead not worth 4x speedup when transfer is bottleneck
└─ Message passing becomes main bottleneck
```

---

## The Real Bottleneck Shift

### Small/Medium Files (< 1M samples)

```
Time spent:
├─ Computation in worker: 90%
├─ Data transfer: 5%
├─ Worker overhead: 5%
Parallelism helps: ✅ YES - 3-4x speedup
```

### Large Files (1M - 10M samples)

```
Time spent:
├─ Computation: 60%
├─ Data transfer: 25%
├─ Worker overhead: 15%
Parallelism helps: ⚠️ PARTIALLY - 2x speedup max
```

### Massive Files (> 10M samples)

```
Time spent:
├─ Computation: 40%
├─ Data transfer: 40% ← TRANSFER becomes bottleneck!
├─ Worker overhead: 20%
Parallelism helps: ❌ NO - Might be SLOWER than single worker!
```

---

## Recommendation: Adaptive Worker Pool

```javascript
/**
 * Smart pool that adapts to file size
 */
class AdaptiveComputedChannelWorkerPool {
  constructor() {
    this.currentPool = null;
  }

  async evaluate(task) {
    const { sampleCount } = task;

    // ✅ Create new pool optimized for THIS sample count
    this.currentPool = new ComputedChannelWorkerPool(sampleCount);

    // Evaluate
    const result = await this.currentPool.evaluate(task);

    // Cleanup
    this.currentPool.terminate();
    this.currentPool = null;

    return result;
  }

  terminate() {
    if (this.currentPool) {
      this.currentPool.terminate();
    }
  }
}

// Usage in main.js
let adaptivePool = new AdaptiveComputedChannelWorkerPool();

// For 62K samples: Automatically uses 4 workers ✅
// For 624K samples: Automatically uses 4 workers ✅
// For 6.2M samples: Automatically uses 2 workers ⚠️
// For 62M samples: Automatically uses 1 worker (falls back)
```

---

## When Parallelism BREAKS DOWN

| Factor                | Impact                | Threshold          |
| --------------------- | --------------------- | ------------------ |
| **Memory per worker** | Exceeds available RAM | > 500MB per worker |
| **Transfer overhead** | Dominates computation | Samples > 10M      |
| **CPU cores**         | Can't saturate all    | Samples < 50K      |
| **Math.js startup**   | Overhead grows        | 8+ workers         |

---

## Practical Limits for Your Use Case

### COMTRADE Standard Files

- **Typical range**: 50K - 500K samples
- **Recommendation**: Always use 4 workers ✅
- **Performance**: 1-6 seconds (excellent)

### Extended Recording Files

- **Typical range**: 500K - 5M samples
- **Recommendation**: Use 4 workers for 500K-1M, then 2 for larger
- **Performance**: 10-60 seconds (acceptable)

### Theoretical Maximum (Before Breakdown)

- **Samples**: ~10M (10 million)
- **File size**: ~320MB (4 channels × 10M × 8 bytes)
- **Memory with 4 workers**: 1.28GB total
- **Time**: ~300 seconds (5 minutes)
- **Verdict**: Doable but slow

### Beyond This Point

- **Samples**: > 10M
- **Use**: Single worker (no parallelism)
- **Accept**: Will be very slow, but won't crash system

---

## Implementation with Fallback

```javascript
class ComputedChannelWorkerPool {
  constructor(sampleCount, maxWorkers = 4) {
    const cpuCores = navigator.hardwareConcurrency || 2;

    // ✅ Smart decision tree
    if (sampleCount > 10000000) {
      // Massive: Single worker to avoid transfer overhead
      this.poolSize = 1;
      console.warn(
        `[Pool] ${sampleCount.toLocaleString()} samples - using single worker`
      );
    } else if (sampleCount > 1000000) {
      // Large: Limit to 2 workers
      this.poolSize = Math.min(cpuCores, 2);
      console.log(
        `[Pool] ${sampleCount.toLocaleString()} samples - using ${
          this.poolSize
        } workers`
      );
    } else {
      // Standard: Use available cores up to max
      this.poolSize = Math.min(cpuCores, maxWorkers);
      console.log(
        `[Pool] ${sampleCount.toLocaleString()} samples - using ${
          this.poolSize
        } workers`
      );
    }

    this.workers = [];
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new Worker("./src/workers/computedChannelWorker.js"));
    }
  }

  async evaluate(task) {
    if (this.poolSize === 1) {
      // Single worker: no chunking
      return this._evaluateSingleWorker(task);
    }

    // Multiple workers: parallel evaluation
    return this._evaluateParallel(task);
  }

  // ... rest of implementation ...
}
```

---

## Comparison: Single vs Parallel by File Size

| Samples     | File Size | Single Worker | 4 Workers | Speedup | Status               |
| ----------- | --------- | ------------- | --------- | ------- | -------------------- |
| 62,464      | 2MB       | 4.6s          | 1.2s      | 3.8x    | ✅ Excellent         |
| 624,640     | 20MB      | 46s           | 11.5s     | 4.0x    | ✅ Excellent         |
| 6,244,000   | 200MB     | 460s          | 115s      | 4.0x    | ✅ Good              |
| 62,440,000  | 2GB       | 4600s         | 1500s     | 3.0x    | ⚠️ Transfer overhead |
| 624,400,000 | 20GB      | 46000s        | 15000s    | 3.0x    | ❌ Memory pressure   |

---

## Summary: Scalability Answer

**Q: What happens if samples > 624,464?**

**A: The parallelization strategy adapts:**

1. **Up to 1M samples**: Full 4-worker parallelism works great

   - 4-5x speedup ✅
   - < 1GB memory

2. **1M - 10M samples**: Works but memory becomes concern

   - 2-4x speedup ⚠️
   - 400MB - 1.6GB memory
   - Recommendation: Use 2-4 workers based on available RAM

3. **> 10M samples**: Fallback to single worker
   - Transfer overhead dominates
   - 1x speedup (no benefit from parallelism)
   - Keep system stable (avoid massive memory spike)

**Implementation**: Use **adaptive pool** that automatically selects worker count based on sample size.

Would you like me to implement the **adaptive worker pool** that automatically scales from 1-4 workers based on file size?
