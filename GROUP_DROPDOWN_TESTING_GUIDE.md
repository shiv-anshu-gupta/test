# Group Dropdown Testing Guide

## 🎬 Quick Test (2 minutes)

### Step 1: Load COMTRADE File
1. Click "Load COMTRADE File"
2. Select any `.cfg` and `.dat` files
3. Wait for charts to render

### Step 2: Open Channel List
1. Click "Analysis" (sidebar)
2. **Channel List** popup opens
3. Tabulator shows all channels

### Step 3: Test Group Dropdown
1. **Look at Group column** (4th column)
2. **Click on a group cell** (e.g., VA's group cell)
3. ✅ **Dropdown should appear** with options:
   - Currents
   - Voltages
   - Power
   - Frequency
   - Group 1
   - Group 2
   - Group 3

### Step 4: Change Group
1. Select **"Currents"** from dropdown
2. Press **Enter**
3. **postMessage sent** (check console)
4. ✅ **Charts update** (should take 1-2 seconds)

### Step 5: Verify Chart Update
1. Charts reload
2. **VA channel** should now appear in **Currents** chart
3. **Voltages** chart should only show remaining voltage channels
4. OR if all voltages moved, Voltages chart disappears

---

## 🔍 Console Debugging

### What to Look For in Browser Console

#### ✅ Good Signs
```javascript
[ChannelList] ✅ Updated group dropdown options: 
['Currents', 'Voltages', 'Power', 'Frequency', 'Group 1', 'Group 2', 'Group 3']

[chartManager] Starting subscription wiring
[subscribeChartUpdates] All subscriptions set up successfully

[chart.group.change] { path: [...], newValue: "Currents", ... }

[recreateChartSync] Direct call for analog-0
[recreateChart] type="analog", idx=0, dataLength=...
[recreateChart] ✅ Successfully recreated chart[0]
```

#### ❌ Warning Signs
```javascript
[ChannelList] Cell edited - Field: group, Value: undefined
    ↑ Group value not being captured

[recreateChart] channelState[analog] is undefined or not an object
    ↑ State not initialized

Cannot read property 'length' of undefined
    ↑ Chart data issue
```

---

## 📋 Full Test Workflow

### Test 1: Single Group Change
```
Before:
  Currents Chart: IA, IB
  Voltages Chart: VA, VB

Action:
  Change VA from "Voltages" to "Currents"

Expected After:
  Currents Chart: IA, IB, VA ← VA moved
  Voltages Chart: VB ← only VB remains
```

### Test 2: Multiple Changes
```
Before:
  Currents: IA, IB
  Voltages: VA, VB, VC

Action 1: Change VA → Currents
Action 2: Change VC → Power

Expected After:
  Currents: IA, IB, VA
  Voltages: VB
  Power: VC
```

### Test 3: Empty Chart Deletion
```
Before:
  Currents: IA
  Voltages: VA

Action:
  Change VA → Currents (now only one voltage group)

Expected:
  Currents: IA, VA
  Voltages: [DISAPPEARS] ← empty chart removed!
```

### Test 4: Dropdown Options Update
```
Initial: 
  Dropdown shows: Currents, Voltages, Power, ...

Action:
  1. Change IB group to "Custom Analysis"
  2. Click another group cell

Expected:
  Dropdown now includes: ... Custom Analysis ← New option!
```

### Test 5: Digital Channels
```
Before:
  Digital Type 1: D1, D2
  Digital Type 2: D3

Action:
  Change D1 → Type 2

Expected:
  Digital Type 1: D2 ← D1 moved
  Digital Type 2: D3, D1 ← D1 here now
```

---

## 🐛 Troubleshooting

### Issue 1: Dropdown Not Appearing
**Problem:** Click group cell but no dropdown
**Cause:** 
- Column might still be "input" editor
- CSS hiding the dropdown
- Tabulator not initialized

**Fix:**
1. Check console for errors
2. Verify ChannelList.js line 1627 has `editor: "list"`
3. Reload page and try again

### Issue 2: Group Change Not Reflecting in Charts
**Problem:** Select new group but charts don't update
**Cause:**
- postMessage not being sent
- Parent message handler not catching it
- renderComtradeCharts not being called

**Fix:**
1. Check console for `[ChannelList] Cell edited` message
2. Look for `window.opener.postMessage` call
3. Check main.js message handler (search for "callback_update")
4. Verify chartManager "group" subscriber exists

### Issue 3: Dropdown Empty
**Problem:** Click group cell and dropdown has no options
**Cause:**
- getAllAvailableGroups() returning empty object
- tableData not passed correctly

**Fix:**
1. Check console for `[getAllAvailableGroups] Available groups:`
2. Verify it shows options
3. Check ChannelList.js line 1655 for getAllAvailableGroups call

### Issue 4: Charts Disappear After Change
**Problem:** All charts gone after group change
**Cause:**
- Error in renderComtradeCharts
- Chart data corrupted

**Fix:**
1. Check browser console for JavaScript errors
2. Look for `[recreateChart] ❌ Failed to recreate`
3. Reload and try again

---

## ✅ Success Criteria

All of these should work:

- [ ] **Dropdown appears** when clicking group cell
- [ ] **All options visible** (Currents, Voltages, etc.)
- [ ] **Can select option** and press Enter
- [ ] **postMessage sent** (visible in console)
- [ ] **Charts update** within 2 seconds
- [ ] **Channel moves** to new group chart
- [ ] **Old charts rebuild** with remaining channels
- [ ] **Empty charts deleted** if no channels left
- [ ] **Dropdown refreshed** with custom groups if added
- [ ] **Works with analog** channels
- [ ] **Works with digital** channels
- [ ] **Console shows success** logs (✅ symbols)

---

## 📊 Expected Console Output (Full Flow)

```javascript
// User clicks group cell and selects "Currents"

[ChannelList] Cell edited - Field: group, Value: Currents
[ChannelList] ✅ Updated group dropdown options: ['Currents', 'Voltages', ...]

// postMessage sent to parent
// Parent receives and processes

[updateChannelFieldByIndex] Updating analog channel 2, field: group, value: Currents

// chartManager detects change
[chart.group.change] { path: ['analog', 'groups'], ... }

// renderComtradeCharts called
[renderComtradeCharts] type: "analog", found 2 groups
[renderComtradeCharts] Group "Currents": [IA, IB, VA]
[renderComtradeCharts] Group "Voltages": [VB]

// Old charts destroyed
[recreateChart] Destroying chart[0]

// New charts created
[recreateChart] type="analog", idx=0, dataLength=4, seriesCount=3
[recreateChart] ✅ Successfully recreated chart[0] for type "analog"

// Charts display!
✅ New grouping applied to uPlot
```

---

## 🎯 Next Steps After Successful Test

1. **Test with your actual COMTRADE files**
2. **Try different group combinations**
3. **Verify theme colors apply** (dark/light mode)
4. **Check performance** with many channels
5. **Report any edge cases**

