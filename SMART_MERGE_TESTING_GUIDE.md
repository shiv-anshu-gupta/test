# Smart Chart Merge - Testing & Verification Guide

## Quick Test Cases

### Test 1: Single Channel Move (Primary Use Case)

**Setup:**

1. Load a COMTRADE file
2. Verify charts show: G0, G1, G2 groups (typical 3 charts)
3. Open browser DevTools Console

**Steps:**

1. Open Tabulator (Channel List)
2. Click on a channel in Group G0 (e.g., Channel 0)
3. Change GROUP dropdown from "G0" to "G2"
4. Click elsewhere to confirm
5. Watch Tabulator close automatically

**Expected Results:**

- ✅ Charts update instantly (100-200ms)
- ✅ Channel 0 appears in G2 chart
- ✅ G0 chart still visible (if has other channels)
- ✅ G1 chart unchanged
- ✅ Console shows: `[attemptSmartChartMerge] ✨ ULTRA-FAST PATH: Smart merge complete in Xms`
- ✅ Console shows: `Moved X channels, Kept X charts, Removed X empty charts`

**Console Output Expected:**

```
[group subscriber] 🔄 Processing group change...
[attemptSmartChartMerge] ⏳ Smart merge attempt...
[attemptSmartChartMerge] ✅ Success: Moved 1 channels, kept 3 charts, removed 0 empty charts
[group subscriber] ✨ ULTRA-FAST PATH: Smart merge complete in 145ms
```

---

### Test 2: Multiple Channels in One Move

**Setup:**

1. Load COMTRADE file with auto-grouped channels
2. Open Tabulator

**Steps:**

1. Select Group G0 (contains multiple channels)
2. In Tabulator, move one channel: G0 → G1
3. Observe instant merge without full rebuild

**Expected Results:**

- ✅ Fast update (150-200ms)
- ✅ Channel moved to G1 chart
- ✅ G0 chart updated to remove it
- ✅ Console: `Moved 1 channels`

---

### Test 3: Rapid Multiple Moves (Stress Test)

**Setup:**

1. Load COMTRADE file
2. Open Tabulator

**Steps:**

1. Rapidly change groups for multiple channels:
   - Channel 0: G0 → G1
   - Channel 1: G0 → G2
   - Channel 2: G1 → G0
2. Watch chart updates

**Expected Results:**

- ✅ Debounced after 200ms
- ✅ All moves applied in ONE merge operation
- ✅ Total time: ~200-300ms
- ✅ Console: `Moved 3 channels` (or similar count)

---

### Test 4: Empty Chart Removal

**Setup:**

1. Load COMTRADE with groups: G0 [Ch0], G1 [Ch1], G2 [Ch2]

**Steps:**

1. Move Ch0 from G0 → G1
2. Move Ch1 from G1 → G0
3. Observe G0 gets Ch1, G1 gets Ch0
4. G2 chart untouched

**Expected Results:**

- ✅ Charts still show 3 groups (no removal yet)
- ✅ Console: `Moved 2 channels`
- ✅ If entire group empties, chart destroyed:
  ```
  [attemptSmartChartMerge] 🗑️ Removed empty chart for G0
  ```

---

### Test 5: Verify Performance Improvement

**Setup:**

1. Load COMTRADE file
2. Open DevTools Performance/Timing tab

**Steps:**

1. **Measure OLD way** (if rebuild happened):
   - Full page rebuild: 3-5+ seconds
   - CPU spike visible
2. **Measure NEW way** (with smart merge):
   - Move channel between groups
   - Time from click to chart update: ~150ms
   - CPU spike minimal

**Expected Results:**

- ✅ Smart merge: <500ms
- ✅ No DOM flicker
- ✅ Smooth animation of chart changes
- ✅ No "janky" chart recreation visible

---

### Test 6: Fallback Behavior

**Setup:**

1. Load COMTRADE file

**Steps:**

1. Manually test fallback (in console):
   ```javascript
   // Force incompatible state
   channelState.analog.groups = [0, 0, 1, 1, 1];
   // Then change to:
   channelState.analog.groups = [0, 1, 2, 3, 4]; // 5 groups from 2
   ```

**Expected Results:**

- ✅ Smart merge detects incompatibility
- ✅ Falls back to Fast Path or Slow Path
- ✅ Console: `Group count differs too much, need full rebuild`
- ✅ Charts rebuild successfully

---

## Console Debugging Commands

### Check Current Chart Structure

```javascript
// In browser console:
charts.forEach((chart, idx) => {
  console.log(
    `Chart ${idx}: type=${chart._type}, channels=[${chart._channelIndices}]`
  );
});
```

### Monitor Next Group Change

```javascript
// Add this before changing groups:
console.log("=== GROUP CHANGE DEBUG ===");
console.time("group-change");
```

Then after it completes:

```javascript
console.timeEnd("group-change");
```

### Check Current Group State

```javascript
console.log("User Groups:", channelState.analog.groups);
console.log(
  "Config Groups:",
  cfg.analogChannels.map((ch) => ch.group || "undefined")
);
```

---

## Expected Console Patterns

### ✅ SUCCESS (Smart Merge Used)

```
[group subscriber] 🔄 Processing group change...
[group subscriber] Expected groups: 3, Current charts: 3
[attemptSmartChartMerge] Target structure: 3 groups
  [list of groups]
[attemptSmartChartMerge] ✅ Success: Moved 1 channels, kept 3 charts, removed 0 empty charts
[group subscriber] ✨ ULTRA-FAST PATH: Smart merge complete in 156ms
```

### ⚡ FALLBACK (Fast Path Used)

```
[attemptSmartChartMerge] ❌ Group count differs too much
[group subscriber] ℹ️ Smart merge not applicable
[group subscriber] ⚡ FAST PATH: Reusing 3 analog charts
[group subscriber] ✅ Fast path complete: 189ms
```

### 🔄 REBUILD (Slow Path Used)

```
[attemptSmartChartMerge] ❌ [reason]
[group subscriber] 🔄 Chart count changed, using SLOW PATH
[group subscriber] ✓ Charts rendered: 3
[group subscriber] ✅ Slow path complete: 2456ms
```

---

## Performance Benchmarks

### Expected Times

| Operation                       | Time      | Tier     |
| ------------------------------- | --------- | -------- |
| Move 1 channel (smart merge)    | 100-200ms | ✨ Ultra |
| Move 2-3 channels (smart merge) | 150-300ms | ✨ Ultra |
| Group reorder (fast path)       | 100-200ms | ⚡ Fast  |
| New group (slow path)           | 2-5s      | 🔄 Slow  |

### Success Criteria

- ✅ Smart merge: <500ms
- ✅ No perceptible UI lag
- ✅ No chart flicker
- ✅ Console shows correct merge operation
- ✅ Charts show correct data after merge

---

## Troubleshooting

### Problem: Still seeing slow updates (3-5s)

**Check:**

1. Console shows "Slow path" instead of "Ultra-fast"
2. Reason: Group count changed too much
3. This is expected for drastic changes

**Solution:**

- Smart merge only works for compatible group structures
- Slow path is correct fallback for major changes

### Problem: Channel appears in wrong chart

**Check:**

1. Verify `chart._channelIndices` in console
2. Check `cfg.analogChannels[].group` values
3. Verify `channelState.analog.groups[]` state

**Debug:**

```javascript
// Check chart contents
charts[0]._channelIndices; // Should show [0, 1, ...] for G0 chart

// Check state
channelState.analog.groups; // Should match chart assignments

// Check config
cfg.analogChannels[0].group; // Should be "G0", "G1", etc.
```

### Problem: Smart merge didn't activate

**Possible Reasons:**

1. Group count differs by >1 - fallback to fast path
2. New group structure incompatible with current
3. Chart structure partially corrupted

**Check Console for:**

```
[attemptSmartChartMerge] ❌ [specific reason]
```

---

## Summary

✅ Smart Chart Merge is working correctly when:

- Channel moves complete in 100-200ms
- Console shows "Ultra-fast path" and "Success"
- Charts update without recreation
- No chart flicker or jank

🎯 If you see different behavior, check the console output for the specific reason and report it!
