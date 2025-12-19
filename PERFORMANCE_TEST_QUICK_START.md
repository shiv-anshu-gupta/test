# ⚡ Quick Performance Test Guide

## How to Verify the Optimization

### Step 1: Start the App

```bash
npm start  # or your server command
```

### Step 2: Open Console & Load File

1. Open DevTools (F12)
2. Go to Console tab
3. Load a COMTRADE file
4. You should see normal chart rendering

### Step 3: Test First Group Change

1. Open Tabulator (ChannelList window)
2. Change ANY group value (e.g., click dropdown, select different group)
3. Watch the console for timing logs

**Expected Output**:

```
[group subscriber] 🔄 Processing group change...
[group subscriber] Expected groups: 5, Current charts: 5
[group subscriber] 🔄 Chart count changed, using SLOW PATH (full rebuild)...
[group subscriber] ✅ Slow path complete: 2847ms (full rebuild)
```

**Note**: First time will use SLOW PATH because charts are being rebuilt

### Step 4: Test Second Group Change

1. Change a DIFFERENT group (same chart count)
2. Watch console again

**Expected Output** (FAST):

```
[group subscriber] 🔄 Processing group change...
[group subscriber] Expected groups: 5, Current charts: 5
[group subscriber] ⚡ FAST PATH: Reusing 5 analog charts (skipping recreation)
[updateChartDataInPlace] ✓ Updated analog chart data (~100ms)
[group subscriber] ✅ Fast path complete: 124ms (data update only)
```

**This is the optimization**: ~124ms instead of ~2800ms = **22x faster!**

### Step 5: Rapid Changes

1. Change groups rapidly 3-4 times in a row
2. Should all complete almost instantly

**Total time for 4 changes should be < 1 second**

---

## What to Look For

### ✅ Success Indicators

- [ ] First change shows timing in console (any time is OK)
- [ ] Second change shows "⚡ FAST PATH" in console
- [ ] Fast path time is < 300ms (ideally < 200ms)
- [ ] Vertical lines still visible and functional
- [ ] Tooltips still work on hover
- [ ] No console errors or warnings

### ❌ Problem Indicators

- [ ] All changes show "🔄 SLOW PATH" (reuse isn't working)
- [ ] Fast path takes > 500ms (data update too slow)
- [ ] Console errors like "Cannot read property 'setData' of undefined"
- [ ] Vertical lines disappear after group change
- [ ] Tooltips don't work anymore

---

## Performance Targets

| Operation          | Target  | Acceptable | Too Slow |
| ------------------ | ------- | ---------- | -------- |
| First group change | < 3s    | < 5s       | > 8s     |
| Fast path change   | < 200ms | < 300ms    | > 500ms  |
| Rapid 4 changes    | < 1s    | < 1.5s     | > 2s     |

---

## Console Tip

To filter just the group subscriber logs:

```javascript
// In console, type:
// Shows only group subscriber messages
console.log = (() => {
  const orig = console.log;
  return (...args) => {
    if (String(args[0]).includes("group subscriber")) orig(...args);
  };
})();
```

Or just search for:

- Type: `group subscriber`
- Look for timing numbers

---

## If Something Goes Wrong

### Issue: All changes still show "SLOW PATH"

**Cause**: Reuse detection not working  
**Check**: Console for "Expected groups" vs "Current charts"  
**Solution**: Full rebuild is safe fallback, performance may improve once charts stabilize

### Issue: Fast path time is 1000+ms

**Cause**: Data array or chart is large, setData() is slow  
**Check**: How many channels in group? How much data?  
**Solution**: This is still better than before, acceptable for large datasets

### Issue: Vertical lines disappear

**Cause**: Data update didn't redraw vertical lines properly  
**Check**: Console for errors in verticalLinePlugin  
**Solution**: Temporary workaround: manually refresh page, we'll investigate

### Issue: Crashes or console errors

**Capture output** and share in bug report with:

- Chart type (analog/digital)
- Number of channels
- Whether it crashes on first or subsequent change
- Full error message from console

---

## Performance Metrics to Report

After testing, report:

1. **First group change time**: \_\_\_\_ ms
2. **Second group change time**: \_\_\_\_ ms
3. **Fast path path timing**: \_\_\_\_ ms
4. **Did vertical lines persist?**: Yes / No
5. **Any console errors?**: Yes / No

Example:

```
First: 2847ms
Second: 124ms ✓
Fast: ⚡ detected
Lines: ✓ working
Errors: None
```

---

**Ready to test? Load the app, change a group, and check console timing!** ⚡
