// File: src/services/computedChannels/workerManagement.js
// Single Responsibility: Create and manage worker lifecycle

/**
 * Create and configure worker
 */
export const createComputedChannelWorker = () => {
  return new Worker("./src/workers/computedChannelWorker.js");
};

/**
 * Build message handler for worker results
 */
export const buildWorkerMessageHandler = (
  worker,
  startTime,
  unit,
  expression,
  cfgData,
  onProgress,
  onSuccess,
  onError
) => {
  return function (e) {
    const {
      type,
      processed,
      total,
      percent,
      resultsBuffer,
      sampleCount: resultCount,
      message
    } = e.data;

    switch (type) {
      case "progress":
        onProgress?.(percent, processed, total);
        break;

      case "complete": {
        const endTime = performance.now();
        const elapsedMs = (endTime - startTime).toFixed(2);
        
        onSuccess?.(resultsBuffer, resultCount, elapsedMs, unit, expression, cfgData);
        
        worker.terminate();
        break;
      }

      case "error":
        onError?.(message);
        worker.terminate();
        break;
    }
  };
};

/**
 * Build error handler for worker
 */
export const buildWorkerErrorHandler = (worker, onError) => {
  return function (error) {
    console.error("[Worker] ❌ Worker error:", error);
    onError?.(error.message);
    worker.terminate();
  };
};

/**
 * Send task to worker with transferable objects
 */
export const sendTaskToWorker = (worker, workerTask, transferableObjects) => {
  worker.postMessage(workerTask, transferableObjects);
};
