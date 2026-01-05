# 📤 PostMessage Flow Diagnostic Guide

## What Changed

Added comprehensive diagnostic logging to trace the **postMessage communication** between:

- **Child window** (Tabulator popup) → ChannelList.js
- **Parent window** (main app) → main.js

---

## 🎯 Complete Message Flow Map

```
User clicks color cell in Tabulator
          ↓
ChannelList.js cellEdited event fires
          ↓
[NEW] 🔍 DIAGNOSTIC: Log before postMessage
          ↓
window.opener.postMessage() called
          ↓
[NEW] ✅ Log: "postMessage SENT successfully"
          ↓
Message travels to parent window
          ↓
[NEW] 🔍 main.js logs: "RAW MESSAGE RECEIVED"
          ↓
Check msg.source === "ChildWindow"
          ↓
[NEW] ✅ main.js logs: "Message ACCEPTED - Processing"
          ↓
Color subscriber fires in chartManager.js
          ↓
✅ Charts update on screen
```

---

## 📊 Diagnostic Logging Points

### Point 1: Child Window (ChannelList.js)

**Location:** Before `window.opener.postMessage()`

**Logs:**

```javascript
[ChannelList] 📤 POSTMESSAGE DIAGNOSTIC - Sending to parent
  Has window.opener: true
  Opener closed: false
  Opener URL: http://localhost:1234/
  Message type: callback_color
  Field: lineColors
  Channel ID: analog_0
  New value: #FF5500
```

**What to check:**

- ✅ `Has window.opener: true` → Popup correctly linked to parent
- ❌ `Has window.opener: false` → Popup not child of parent
- ❌ `Opener closed: true` → Parent window was closed
- ✅ `Message type: callback_color` → Correct event type
- ✅ `New value: #FF5500` → Color value correct

### Point 2: PostMessage Sent

**Location:** After `window.opener.postMessage()` call

**Log:**

```javascript
[ChannelList] ✅ postMessage SENT successfully
```

**What to check:**

- ✅ Appears → Message successfully sent to parent
- ❌ Missing → postMessage threw an error (check catch block logs)

### Point 3: Parent Window Receives Message (main.js)

**Location:** Start of message listener

**Logs:**

```javascript
[main.js] 📨 RAW MESSAGE RECEIVED
  Has data: true
  Message source: ChildWindow
  Message type: callback_color
  Origin: http://localhost:1234
  Full message: { source: "ChildWindow", type: "callback_color", payload: {...} }
```

**What to check:**

- ✅ `Has data: true` → Message arrived with data
- ❌ `Has data: false` → Message object empty
- ✅ `Message source: ChildWindow` → Correct source
- ❌ `Message source: undefined` → Message data malformed
- ✅ `Message type: callback_color` → Correct type

### Point 4: Message Filtering

**Location:** After source check

**Logs (Success):**

```javascript
[main.js] ✅ Message ACCEPTED - Processing type: "callback_color"
[Performance] 📨 Message received: callback_color
```

**Logs (Failure):**

```javascript
[main.js] ⚠️ Message IGNORED (wrong source): undefined
```

**What to check:**

- ✅ Shows "ACCEPTED" → Message passed filter
- ❌ Shows "IGNORED" → Message source didn't match (see Point 3)

---

## 🧪 Test Steps

### Step 1: Open Console

```
F12 → Console tab
Keep console open and visible
```

### Step 2: Load COMTRADE File

```
Load a file with analog channels
Wait for charts to render
```

### Step 3: Open Tabulator

```
Click "Show Channel List" button
Wait for popup to open and table to load
```

### Step 4: Change a Color

```
Click any color cell in Tabulator
Select a new color
Press Enter or Tab to confirm
```

### Step 5: Check Console Output

```
Look for diagnostic logs in console
Screenshot all logs
```

---

## 📋 Expected Console Output Sequence

### Perfect Scenario

```
✅ [ChannelList] 📤 POSTMESSAGE DIAGNOSTIC - Sending to parent
✅   Has window.opener: true
✅   Opener closed: false
✅   Message type: callback_color
✅ [ChannelList] ✅ postMessage SENT successfully

✅ [main.js] 📨 RAW MESSAGE RECEIVED
✅   Has data: true
✅   Message source: ChildWindow
✅   Message type: callback_color
✅ [main.js] ✅ Message ACCEPTED - Processing type: "callback_color"

✅ [Performance] 📨 Message received: callback_color

✅ [COLOR SUBSCRIBER] 📢 Fired!
✅ [DIAGNOSTIC] 🔍 Color Update Trace - analog[0] → #FF5500
```

→ **RESULT: Chart line color changes immediately! ✅**

---

## 🚨 Troubleshooting

### Problem 1: No ChannelList logs at all

```
❌ [ChannelList] logs missing
✅ [main.js] logs appear
```

**Cause:** Color change event in Tabulator not triggering callback

**Fix:**

1. Check if Tabulator is initialized properly
2. Check if `cellEdited` event handler is registered
3. Open dev tools → Network tab → Look for postMessage errors

---

### Problem 2: ChannelList logs appear but postMessage fails

```
✅ [ChannelList] 📤 POSTMESSAGE DIAGNOSTIC
✅   Has window.opener: false  ❌
❌ [ChannelList] ❌ Cannot post message
```

**Cause:** Popup window not properly linked to parent

**Fix:**

1. Verify popup opened with `window.open(url, 'ChannelListWindow')`
2. Check if same-origin (both should be http://localhost:1234)
3. Check if popup was blocked by browser

---

### Problem 3: ChannelList sends successfully but parent never receives

```
✅ [ChannelList] ✅ postMessage SENT successfully
❌ [main.js] 📨 RAW MESSAGE RECEIVED (missing)
```

**Cause:** Message listener not registered in parent

**Fix:**

1. Check if `window.addEventListener("message", ...)` is executed
2. Verify main.js is loaded before popup sends message
3. Check if message is filtered by origin (should be "\*")

---

### Problem 4: Parent receives message but wrong source

```
✅ [main.js] 📨 RAW MESSAGE RECEIVED
❌   Message source: undefined
❌ [main.js] ⚠️ Message IGNORED (wrong source): undefined
```

**Cause:** Message object missing `source` property

**Fix:**

1. Check ChannelList.js postMessage structure
2. Verify `source: "ChildWindow"` is set
3. Search for other postMessage calls that might override it

---

### Problem 5: Parent receives and accepts message but charts don't update

```
✅ [ChannelList] ✅ postMessage SENT successfully
✅ [main.js] ✅ Message ACCEPTED - Processing type: "callback_color"
❌ [COLOR SUBSCRIBER] 📢 Fired! (missing)
```

**Cause:** Message processing succeeded but color subscriber not triggered

**Fix:**

1. Check if `type: "callback_color"` handler exists in main.js
2. Verify `channelState.subscribeProperty("color")` is registered
3. Check if chartManager.js loaded before message received

---

## 🔍 Key Diagnostic Variables

| Variable               | Expected Value            | What It Means                        |
| ---------------------- | ------------------------- | ------------------------------------ |
| `window.opener`        | Object (parent window)    | ✅ Popup correctly created by parent |
| `window.opener.closed` | `false`                   | ✅ Parent window still open          |
| `msg.source`           | `"ChildWindow"`           | ✅ Message from Tabulator popup      |
| `msg.type`             | `"callback_color"`        | ✅ Color change event                |
| `msg.payload`          | Object with color data    | ✅ Color info included               |
| `ev.origin`            | `"http://localhost:1234"` | ✅ Same origin (safe)                |

---

## 💾 How to Collect Logs

### Method 1: Manual Copy

1. Open console (F12)
2. Right-click in console
3. Select "Save as..." to download .txt file
4. Share with me

### Method 2: Console.table Export

```javascript
// Paste in console to export all logs
copy(console.log.toString());
```

### Method 3: Screenshot

1. Change color in Tabulator
2. Take screenshot of entire console
3. Share image

---

## 📌 What I Need From You

When you run the diagnostic:

1. **Change a color in Tabulator**
2. **Screenshot the console** showing:

   - All `[ChannelList]` logs
   - All `[main.js]` logs
   - Any `❌ ERROR` messages

3. **Tell me:**
   - Does any log appear?
   - Which logs are MISSING?
   - Are there any red error messages?

---

## 🎯 Next Steps After Testing

Once you share the console output, I can:

1. ✅ Identify exactly which step is failing
2. ✅ Pinpoint the root cause
3. ✅ Provide targeted fix
4. ✅ Verify fix works

---

## 📞 Questions to Answer

Answer these to help me debug faster:

1. **Do you see `[ChannelList]` logs when changing color?**

   - Yes / No

2. **Do you see `[main.js]` logs in parent console?**

   - Yes / No

3. **Do you see any red ❌ ERROR messages?**

   - Yes / No
   - If yes, what does it say?

4. **Where is the first log you DON'T see?**
   - ChannelList postMessage diagnostic?
   - "postMessage SENT"?
   - main.js "RAW MESSAGE RECEIVED"?
   - Message "ACCEPTED"?

---

**Ready? Change a color and share the console output! 🚀**
