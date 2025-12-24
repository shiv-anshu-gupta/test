# 🔄 Cache Troubleshooting Guide

If you're seeing old console logs or old behavior after code updates, **browser cache is likely the culprit**.

## ⚡ Quick Fixes

### Fix #1: Hard Refresh (Recommended)

Press the keyboard shortcut based on your OS:

- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

This **clears the cache for the current page only** and reloads with fresh files.

---

### Fix #2: Disable Cache in DevTools (Best for Development)

1. Press `F12` to open Developer Tools
2. Click the **Settings gear icon** ⚙️ (top right of DevTools)
3. Check: **"Disable cache (while DevTools is open)"**
4. Close and reopen DevTools, then reload the page

This **automatically clears cache while you're developing**, so you always get fresh files.

---

### Fix #3: Clear All Browser Cache

1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Under **"Time range,"** select **"All time"**
3. Check:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click **"Clear data"**
5. Reload the COMTRADE Viewer tab

---

## 🎯 Symptoms of Cache Issues

You have a cache problem if you see:

| Symptom                             | Indicator                                  |
| ----------------------------------- | ------------------------------------------ |
| Old console logs still appearing    | e.g., `Series 532 "TSLDP7": maxYAxes=1...` |
| Code changes not taking effect      | New code not visible in behavior           |
| Charts loading slower than expected | Old inefficient code still running         |
| Errors from old API calls           | Functions that should be removed           |

---

## ✅ How to Verify the Fix Worked

After clearing cache:

1. **Open DevTools** (`F12`)
2. **Go to Console tab**
3. **Load a COMTRADE file**
4. Look for this message:
   ```
   💡 Tip: Use window.toggleDebugMode() to enable/disable chart debug logging
   ```

**If you see this message:**

- ✅ Cache was cleared successfully
- ✅ You have the latest code
- ✅ Charts should load much faster now

**If you DON'T see this message:**

- ❌ Cache still has old code
- Try a different fix method above

---

## 🐛 What to Look For

### Before Fix (Old Cache)

```
Series 532 "TSLDP7": maxYAxes=1, forcing to axis 0
seriesMapper.js:160     → Series 532 will use scale: "y"
[100+ similar lines - SLOW]
```

### After Fix (Fresh Files)

```
💡 Tip: Use window.toggleDebugMode() to enable/disable chart debug logging
[No spam - FAST]
```

---

## 🔧 Advanced: Enable Debug Mode

To see detailed logs when troubleshooting:

```javascript
// In browser console (F12):
window.enableDebugMode();
// or
window.toggleDebugMode();
```

To disable debug logs again:

```javascript
window.disableDebugMode();
```

---

## 📱 Browser-Specific Tips

### Chrome/Edge

- **Cache location:** Settings → Privacy → Clear browsing data
- **Keyboard shortcut:** `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### Firefox

- **Cache location:** Settings → Privacy & Security → Clear data
- **Keyboard shortcut:** `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)

### Safari

- **Cache location:** Safari → Settings → Privacy → Manage Website Data
- **Keyboard shortcut:** No direct shortcut; use Settings

---

## 🚀 Automatic Cache Busting

The COMTRADE Viewer now includes **automatic cache busting** with a timestamp parameter on every load:

```javascript
src/main.js?v=1703424000000
```

This ensures you get fresh files most of the time, but your browser cache settings may override this. That's why manual cache clearing is still sometimes needed.

---

## ⚠️ If Problems Persist

1. ✅ Hard refresh (`Ctrl+Shift+R`)
2. ✅ Clear all browsing data
3. ✅ Close browser completely (not just tab)
4. ✅ Reopen browser and reload COMTRADE Viewer
5. ✅ Check DevTools Console for the tip message

If you **still** see old logs after these steps:

- The server might be caching files (less common)
- Check with your system administrator
- Or open an issue with details

---

## 📚 Resources

- [Mozilla: Cache and Storage](https://developer.mozilla.org/en-US/docs/Tools/Storage)
- [Chrome DevTools: Disable Cache](https://developer.chrome.com/docs/devtools/settings/)
- [Web Cache Best Practices](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)

---

**💡 Remember:** When in doubt, **hard refresh (`Ctrl+Shift+R`) is your best friend!**
