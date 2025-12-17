# Computed Channel Export Format - COMTRADE 2013 Compliance

## Issue Fixed

The exported CFG and DAT files were generating garbage values and not matching the COMTRADE standard format used in the original `HR_85429_ASCII.CFG` and `HR_85429_ASCII.DAT` files.

## Solution

Updated `generateCFGContent()` and `generateDATContent()` functions in `EquationEvaluatorInChannelList.js` to properly format files according to **COMTRADE 2013 standard**.

---

## CFG File Format (COMTRADE 2013)

### Structure

```
Line 1:   Station,Device,Version
Line 2:   TotalChannels,AnalogCount,DigitalCount
Lines 3+: Analog channel definitions (one line per channel)
Next:     Digital channel definitions (one line per channel)
Next:     Number of sampling rates
Next:     Sampling rate(s) and end sample
Next:     Start time (DD/MM/YYYY,HH:MM:SS.mmmmmm)
Next:     Trigger time (DD/MM/YYYY,HH:MM:SS.mmmmmm)
Next:     File type (ASCII/BINARY)
Next:     Time multiplier
Next:     Time offset (2013 specific)
```

### Example Generated CFG

```
MID=COMPUTED_CHANNEL,EQUATION_1702000000000,2013
1,1A,0D
1,COMPUTED,,,V,1.725423715818958E-07,0.54864501953125,0,-2147483648,2147483647,4800,1,P
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

### Key Changes

#### 1. **Multiplier & Offset Calculation**

Before: Simple `1.0` and `0.0`
After:

```javascript
const multiplier = (max - min) / (intMax - intMin);
const offset = min - intMin * multiplier;
```

This ensures values are properly scaled within the COMTRADE 32-bit signed integer range:

- **Raw value range**: -2,147,483,648 to 2,147,483,647
- **Display formula**: `display_value = raw_value * multiplier + offset`

#### 2. **Header Line (MID)**

Before: `MID=COMPUTED_CHANNEL_EXPORT,GENERATED_CHANNEL,2023`
After: `MID=COMPUTED_CHANNEL,EQUATION_${timestamp},2013`

- Uses proper COMTRADE version (2013, not 2023)
- Device ID includes equation timestamp for uniqueness

#### 3. **Channel Count**

Before: `599,7A,592D` (wrong - from original file copied)
After: `1,1A,0D`

- 1 total channel (computed channel)
- 1 Analog channel
- 0 Digital channels

#### 4. **Analog Channel Format**

```
Index,ID,Phase,Component,Unit,Multiplier,Offset,Skew,Min,Max,Primary,Secondary,PS
1,COMPUTED,,,V,1.725E-07,0.548E+00,0,-2147483648,2147483647,4800,1,P
```

#### 5. **Time Format**

Before: Custom format (not COMTRADE compliant)
After: `DD/MM/YYYY,HH:MM:SS.mmmmmm`

- Example: `09/12/2025,14:30:15.450000`
- Microseconds padding with zeros

#### 6. **Sampling Rates**

Before: Incorrect/incomplete format
After:

```
0                      # Number of rate changes (0 = constant rate)
4800,12000             # SampleRate,EndSample
```

---

## DAT File Format (COMTRADE ASCII)

### Structure

```
sample#,timestamp_ms,raw_value
sample#,timestamp_ms,raw_value
... (one line per sample)
```

### Example Generated DAT

```
1,0,0
2,0,1024
3,1,2048
4,1,3072
5,2,4096
...
```

### Key Changes

#### 1. **Timestamp Units**

Before: Timestamp in seconds with 6 decimal places
After: Timestamp in **milliseconds** (integer)

- Formula: `timestamp_ms = Math.round((sampleIndex / sampleRate) * 1000)`

#### 2. **Raw Value Conversion**

Before: Direct display value export
After: Convert display values to raw integers using multiplier/offset

```javascript
const rawValue = Math.round((value - offset) / multiplier);
```

#### 3. **Format Consistency**

Before: Comments and mixed format
After: Pure COMTRADE ASCII format

```
sample#,milliseconds,raw_value
```

---

## Value Scaling Example

### Original File (HR_85429_ASCII.CFG)

```
IA channel: multiplier=1.725423715818958E-07, offset=0.54864501953125
Raw value range: -2147483648 to 2147483647
Display formula: display = raw * 1.725E-07 + 0.548
```

### Computed Channel Export

```
If computation output: min=100, max=500 (range=400)
Multiplier = 400 / 4294967295 = 9.31E-08
Offset = 100 - (-2147483648 * 9.31E-08) = 100.2

To export value 300:
raw_value = (300 - 100.2) / 9.31E-08 = 2,145,862,150
```

---

## Loading Exported Files

1. **Click "Select and Load Files"** in the application
2. **Select both files**:
   - `computed_channel_YYYY-MM-DD_HH-MM-SS.cfg`
   - `computed_channel_YYYY-MM-DD_HH-MM-SS.dat`
3. **Application parses using** `parseCFG()` and `parseDAT()` functions
4. **Creates new channel group** with computed channel data
5. **Charts render** with proper scaling applied

---

## Verification Checklist

- ✅ CFG header matches `MID=...,...,2013`
- ✅ Channel count lines correctly formatted
- ✅ Analog channel has multiplier/offset in scientific notation
- ✅ Time format is `DD/MM/YYYY,HH:MM:SS.mmmmmm`
- ✅ Sampling rate line shows total samples
- ✅ File type is `ASCII`
- ✅ DAT format is `sample#,milliseconds,raw_value`
- ✅ Files are downloadable as separate .cfg and .dat
- ✅ Files can be loaded via existing file picker
- ✅ Scaling is properly applied on reload

---

## Files Modified

- `src/components/EquationEvaluatorInChannelList.js`
  - `generateCFGContent()` - Complete rewrite for COMTRADE 2013
  - `generateDATContent()` - Complete rewrite for proper ASCII format

## Test Case

1. Execute equation: `(IA + IB + IC) / 3`
2. Click "Export" button
3. Download both .cfg and .dat files
4. Verify file formats match examples above
5. Use "Select and Load Files" to reload
6. Verify chart displays correctly with scaled values
