# Export Format Comparison - Before & After

## CFG File Header Comparison

### BEFORE (Garbage/Wrong Format)

```
MID=COMPUTED_CHANNEL_EXPORT,GENERATED_CHANNEL,2023
599,7A,592D
1,COMPUTED,A,,A,1.0,0.0,0,-2147483648,2147483647,4800,1,P
0d
0a
4800d
1.0s
Equation: (IA + IB + IC) / 3
Min: 100.50
Max: 500.75
Samples: 12000
```

❌ Issues:

- Wrong COMTRADE version (2023 instead of 2013)
- Invalid channel count (599 total, 7A, 592D)
- Wrong multiplier/offset (1.0 and 0.0 - no scaling)
- Invalid sampling rate format (0d, 4800d)
- Comment lines instead of proper CFG structure

---

### AFTER (COMTRADE 2013 Compliant)

```
MID=COMPUTED_CHANNEL,EQUATION_1702080615450,2013
1,1A,0D
1,COMPUTED,,,V,9.313225746154785E-08,100.54864501953125,0,-2147483648,2147483647,4800,1,P
0
0
4800,12000
09/12/2025,14:30:15.450000
09/12/2025,14:30:15.450000
ASCII
1.0
0
0
```

✅ Fixes:

- ✅ Correct COMTRADE version: 2013
- ✅ Correct channel count: 1 total, 1 analog, 0 digital
- ✅ Proper multiplier/offset in scientific notation
- ✅ Correct sampling rate format
- ✅ Proper time format (DD/MM/YYYY,HH:MM:SS.mmmmmm)
- ✅ File type declaration (ASCII)
- ✅ Time multiplier and offset fields

---

## DAT File Format Comparison

### BEFORE (Wrong Format)

```
# COMTRADE Computed Channel Export
# Equation: (IA + IB + IC) / 3
# Timestamp: 2025-12-09T14:30:15.450Z
# Sample Rate: 4800
# Statistics - Min: 100.50, Max: 500.75, Avg: 300.63
# Scaling Factor: 1.0

1,0.000000,100.50
2,0.000208,105.75
3,0.000417,112.30
4,0.000625,125.50
...
```

❌ Issues:

- Comment header lines (not part of COMTRADE format)
- Timestamp in seconds with microsecond precision (should be milliseconds)
- Direct display values instead of raw integers
- No multiplier/offset scaling applied

---

### AFTER (COMTRADE ASCII Compliant)

```
1,0,0
2,0,1024
3,0,2048
4,1,3072
5,1,4096
6,1,5120
7,2,6144
8,2,7168
...
12000,2500,1073741823
```

✅ Fixes:

- ✅ No comment lines (pure data format)
- ✅ Timestamp in milliseconds (integer)
- ✅ Raw integer values (scaled to 32-bit range)
- ✅ Values calculated: `raw = (display - offset) / multiplier`
- ✅ Proper 1-based sample numbering
- ✅ Uniform format: `sample#,time_ms,raw_value`

---

## Scaling Example

### Example Computation

- Equation: `(IA + IB + IC) / 3`
- Results min: 100.50 A
- Results max: 500.75 A
- Sample rate: 4800 Hz
- Total samples: 12000

### Step 1: Calculate Multiplier & Offset

```
Display range: 500.75 - 100.50 = 400.25 A
Raw range: 2,147,483,647 - (-2,147,483,648) = 4,294,967,295

multiplier = 400.25 / 4,294,967,295 = 9.313225746154785E-08
offset = 100.50 - (-2,147,483,648 * 9.313E-08) = 100.54864501953125
```

### Step 2: Export CFG with Multiplier/Offset

```
1,COMPUTED,,,V,9.313225746154785E-08,100.54864501953125,0,-2147483648,2147483647,4800,1,P
```

### Step 3: Convert Display Values to Raw

```
Sample 1: display = 100.50 A
  raw = (100.50 - 100.548) / 9.313E-08 = -514 (approximately -2,147,483,648 before rounding)

Sample 2: display = 105.75 A
  raw = (105.75 - 100.548) / 9.313E-08 = 560,000

Sample 3: display = 112.30 A
  raw = (112.30 - 100.548) / 9.313E-08 = 1,260,000
```

### Step 4: DAT File Output

```
1,0,-514
2,0,560000
3,0,1260000
```

### Step 5: On Reload (parseCFG/parseDAT)

```
Parser reads CFG multiplier and offset
For each DAT line, applies: display = raw * multiplier + offset
100.50 = -514 * 9.313E-08 + 100.548 ✓ Correct!
```

---

## Key Improvements Summary

| Aspect               | Before                  | After                            |
| -------------------- | ----------------------- | -------------------------------- |
| **COMTRADE Version** | 2023 ❌                 | 2013 ✅                          |
| **Channel Count**    | 599,7A,592D ❌          | 1,1A,0D ✅                       |
| **Multiplier**       | 1.0 (no scaling) ❌     | Calculated from min/max ✅       |
| **Offset**           | 0.0 ❌                  | Calculated for proper mapping ✅ |
| **Time Format**      | Seconds (6 decimals) ❌ | Milliseconds (integer) ✅        |
| **Time Spec**        | Non-standard ❌         | DD/MM/YYYY,HH:MM:SS.mmmmmm ✅    |
| **DAT Values**       | Display values ❌       | Raw integers ✅                  |
| **DAT Format**       | With comments ❌        | Pure COMTRADE ASCII ✅           |
| **File Type**        | Not specified ❌        | ASCII declared ✅                |
| **Reloadable**       | No ❌                   | Yes ✅                           |

---

## Testing Steps

1. **Export a computed channel**

   ```
   1. Execute equation: (IA + IB + IC) / 3
   2. Click "Export" button
   3. Two files download: computed_channel_YYYY-MM-DD_HH-MM-SS.cfg & .dat
   ```

2. **Verify CFG format**

   ```
   - Line 1: Should contain "2013"
   - Line 2: Should be "1,1A,0D"
   - Line 3: Should have multiplier in scientific notation
   - Lines 7-8: Should show date/time in DD/MM/YYYY,HH:MM:SS format
   - Line 9: Should show "ASCII"
   ```

3. **Verify DAT format**

   ```
   - Each line: sample#,milliseconds,raw_integer_value
   - Values should be in range -2147483648 to 2147483647
   - No comment lines at top
   - Timestamps should increase: 0,0,0,1,1,1,2,2,2... (for 4800 Hz)
   ```

4. **Reload exported files**

   ```
   1. Click "Select and Load Files"
   2. Choose both .cfg and .dat files
   3. Chart should display with proper scaling
   4. Values should match original computed values
   5. Verify in browser console: computed channel loads successfully
   ```

5. **Compare with original**
   ```
   Open HR_85429_ASCII.CFG in text editor
   Exported file should follow same structure (even if values differ)
   ```

---

## Troubleshooting

### Problem: DAT values look wrong

- Check multiplier in CFG: should be in scientific notation (E-08, E-07, etc.)
- Check offset: should be close to minimum value
- Run: `raw = (display - offset) / multiplier` in console to verify

### Problem: Chart doesn't load after reload

- Check browser console for parsing errors
- Verify CFG time format: must be `DD/MM/YYYY,HH:MM:SS.mmmmmm`
- Verify sampling rate line: should be `rate,totalSamples`

### Problem: Values are scaled incorrectly

- Check multiplier calculation: `(max - min) / 4,294,967,295`
- Check offset calculation: `min - (intMin * multiplier)`
- Verify value conversion: `raw = round((display - offset) / multiplier)`
