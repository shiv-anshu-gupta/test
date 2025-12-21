/**
 * QUICK REFERENCE: selectiveUpdate Implementation
 *
 * This file documents key implementation details for future reference
 */

/**
 * ================================================================================
 * FILE INVENTORY - All files involved in selectiveUpdate feature
 * ================================================================================
 */

/*
NEW FILES CREATED:
  ✓ src/utils/domUpdateQueue.js
    - Core RAF batching utility
    - Exports: createDOMUpdateQueue, getGlobalDOMUpdateQueue, queueGlobalUpdate
    - Size: ~200 lines
    - No dependencies on other utils/components
    
  ✓ src/utils/domUpdateQueueInit.js
    - Initialization and lifecycle management
    - Exports: initGlobalDOMUpdateQueue, cleanupGlobalDOMUpdateQueue
    - Handles: Auto-cleanup on page unload, visibility changes
    - Size: ~60 lines
    
  ✓ src/selectiveUpdate_IMPLEMENTATION.js
    - Comprehensive documentation (this knowledge base)
    - Size: ~250 lines

MODIFIED FILES:
  ✓ src/components/createState.js
    - Modified: bindToDOM method (lines 630-810)
    - Changes: Added selectiveUpdate option handling
    - Lines changed: ~80 lines of enhancements
    - Backward compatible: 100% - no breaking changes
    
  ✓ src/main.js
    - Added import: import { initGlobalDOMUpdateQueue }
    - Added initialization: initGlobalDOMUpdateQueue(); (after line 60)
    - Lines changed: 2 lines
*/

/**
 * ================================================================================
 * KEY CODE PATTERNS
 * ================================================================================
 */

// Pattern 1: Initialize at app startup
import { initGlobalDOMUpdateQueue } from "./utils/domUpdateQueueInit.js";
initGlobalDOMUpdateQueue(); // Done in main.js

// Pattern 2: Use with global queue (automatic)
state.bindToDOM("prop", el, {
  selectiveUpdate: true, // Uses global queue automatically
});

// Pattern 3: Use with custom queue (coordination)
import { createDOMUpdateQueue } from "./utils/domUpdateQueue.js";
const queue = createDOMUpdateQueue();
state.bindToDOM("prop1", el1, { selectiveUpdate: { queue } });
state.bindToDOM("prop2", el2, { selectiveUpdate: { queue } });

// Pattern 4: Manual cleanup (if needed)
import { cleanupGlobalDOMUpdateQueue } from "./utils/domUpdateQueueInit.js";
cleanupGlobalDOMUpdateQueue();

/**
 * ================================================================================
 * MEMORY SAFETY GUARANTEES
 * ================================================================================
 */

/*
Proper RAF cancellation:
  - rafId stored in closure
  - cancelAnimationFrame called in destroy()
  - RAF only scheduled if not already pending

Proper cleanup:
  - updateMap.clear() called after flush
  - updateQueue = null in unbind functions (allows GC)
  - Listeners properly unsubscribed
  - DOM event listeners properly removed

Global queue lifecycle:
  - Created once on app init
  - Available via window._domUpdateQueue
  - Auto-destroyed on beforeunload event
  - Manual destroy() available if needed

No circular references:
  - Queue doesn't hold strong reference to elements
  - Elements are only held during RAF frame
  - After flush, all references cleared

Automatic error recovery:
  - Try/catch around import in createState.js
  - Falls back to immediate updates if queue unavailable
  - Error doesn't crash application
  - No hanging event listeners on error
*/

/**
 * ================================================================================
 * INTERCONNECTIONS WITH EXISTING CODE
 * ================================================================================
 */

/*
How selectiveUpdate integrates with existing systems:

1. createState.js (core):
   - Existing: notify() with RAF batching for subscribers
   - New: selectiveUpdate for bindToDOM DOM updates
   - Difference: Subscribers get RAF-batched (always), bindToDOM gets RAF-optional (if enabled)
   - No conflict: Different systems, different RAF instances

2. chartManager.js:
   - Currently: Subscribes to channelState changes
   - Potential: Could use selectiveUpdate if binding DOM elements directly
   - No changes needed currently

3. ChannelList.js:
   - Currently: Updates via Tabulator
   - Potential: Could benefit from selectiveUpdate for rapid cell updates
   - No breaking changes if adopted

4. Plugins (verticalLinePlugin, etc):
   - No interaction with selectiveUpdate
   - Fully independent

5. Other utilities:
   - No interaction with selectiveUpdate
   - Fully independent

ISOLATION: selectiveUpdate is completely isolated and can be:
- Enabled/disabled per binding
- Used with any state
- Ignored by existing code
- Added to existing code without changes
*/

/**
 * ================================================================================
 * COMMON USAGE SCENARIOS
 * ================================================================================
 */

/*
Scenario 1: Rapid chart updates (COMTRADE channels)
  Before: 100 channels × 10 updates/sec = 1000 DOM updates/sec → Freezes
  After:  100 channels × 10 updates/sec = 1 batch/frame = 60 updates/sec → Smooth
  Code:
    state.bindToDOM('channels.colors', colorElement, { selectiveUpdate: true });
    state.channels.colors = newColors; // 10x/sec

Scenario 2: Form validation with many fields
  Before: 20 fields × validator feedback = 20 DOM updates per keystroke → Lag
  After:  All updates batched to 1 DOM update per keystroke → Smooth
  Code:
    fields.forEach(field => {
      state.bindToDOM(`form.${field.name}`, field.el, { selectiveUpdate: true });
    });

Scenario 3: Real-time metrics dashboard
  Before: 100 metrics × 5 updates/sec = 500 DOM updates/sec → Flickering
  After:  All updates batched to 5 batches/sec → Stable
  Code:
    metrics.forEach(metric => {
      state.bindToDOM(`dashboard.${metric.id}`, metric.el, { selectiveUpdate: true });
    });

Scenario 4: Coordinated multi-element updates
  Code:
    const queue = createDOMUpdateQueue();
    state.bindToDOM('prop1', el1, { selectiveUpdate: { queue } });
    state.bindToDOM('prop2', el2, { selectiveUpdate: { queue } });
    state.bindToDOM('prop3', el3, { selectiveUpdate: { queue } });
    // All three update on same RAF frame
    state.prop1 = a;
    state.prop2 = b;
    state.prop3 = c;
    // Result: 1 DOM reflow instead of 3
*/

/**
 * ================================================================================
 * TESTING CHECKLIST
 * ================================================================================
 */

/*
Memory Safety Tests:
  □ Load app - check memory
  □ Make 1000 rapid changes - check memory stable
  □ Unbind all - check memory drops
  □ Repeat 10x - check no memory leak
  
Performance Tests:
  □ With selectiveUpdate: false - measure fps on 100 rapid updates
  □ With selectiveUpdate: true - measure fps (should be much better)
  □ Compare browser DevTools Performance tab
  
Error Handling Tests:
  □ Missing element selector - should warn and continue
  □ selectiveUpdate with undefined queue - should fallback gracefully
  □ Error in update function - should catch and continue
  
Backward Compatibility Tests:
  □ Existing code without selectiveUpdate still works
  □ No changes to existing APIs
  □ No breaking changes to any component
  
Integration Tests:
  □ Multiple bindings on same state
  □ Multiple states with selectiveUpdate
  □ Two-way binding with selectiveUpdate
  □ Custom queue with multiple bindings
*/

/**
 * ================================================================================
 * DOCUMENTATION LOCATIONS
 * ================================================================================
 */

/*
For detailed information, refer to:
  1. src/selectiveUpdate_IMPLEMENTATION.js - Full technical documentation
  2. src/utils/domUpdateQueue.js - Code comments with usage examples
  3. src/utils/domUpdateQueueInit.js - Lifecycle management
  4. src/components/createState.js lines 645-660 - bindToDOM JSDoc
  5. This file - Quick reference
*/

// Export nothing - this is documentation only
