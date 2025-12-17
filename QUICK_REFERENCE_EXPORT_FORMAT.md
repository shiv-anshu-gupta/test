# Quick Reference - Exported File Format

## File Naming

```
computed_channel_YYYY-MM-DD_HH-MM-SS.cfg
computed_channel_YYYY-MM-DD_HH-MM-SS.dat
```

## CFG Structure (Line by Line)

| Line | Format                             | Example                                                              |
| ---- | ---------------------------------- | -------------------------------------------------------------------- |
| 1    | `MID=NAME,DEVICE,VERSION`          | `MID=COMPUTED_CHANNEL,EQUATION_1702080615,2013`                      |
| 2    | `TOTAL,ANALOG_COUNT,DIGITAL_COUNT` | `1,1A,0D`                                                            |
| 3    | Analog channel definition          | `1,COMPUTED,,,V,9.313E-08,100.548,0,-2147483648,2147483647,4800,1,P` |
| 4    | Digital count                      | `0`                                                                  |
| 5    | Sampling rate changes              | `0`                                                                  |
| 6    | Rate & end sample                  | `4800,12000`                                                         |
| 7    | Start time                         | `09/12/2025,14:30:15.450000`                                         |
| 8    | Trigger time                       | `09/12/2025,14:30:15.450000`                                         |
| 9    | File type                          | `ASCII`                                                              |
| 10   | Time multiplier                    | `1.0`                                                                |
| 11   | Time offset 1                      | `0`                                                                  |
| 12   | Time offset 2                      | `0`                                                                  |

## Analog Channel Fields

```
Index,ID,Phase,Component,Unit,Multiplier,Offset,Skew,Min,Max,Primary,Secondary,PS
1,COMPUTED,,,V,9.313E-08,100.548,0,-2147483648,2147483647,4800,1,P
├─ Index: 1
├─ ID: COMPUTED
├─ Phase: (empty)
├─ Component: (empty)
├─ Unit: V (volts) or A (amperes)
├─ Multiplier: Scientific notation (range / 4294967295)
├─ Offset: Minimum value - (intMin * multiplier)
├─ Skew: 0
├─ Min: -2147483648 (INT32_MIN)
├─ Max: 2147483647 (INT32_MAX)
├─ Primary: Sample rate (4800)
├─ Secondary: 1
└─ PS: P (Phase Shift)
```

## DAT Format

```
sample_number,timestamp_milliseconds,raw_value
1,0,-514
2,0,560000
3,0,1260000
...
12000,2500,1073741823
```

### Calculation

- **Sample Number**: 1-based index (1, 2, 3, ...)
- **Timestamp (ms)**: `(index / sampleRate) * 1000` rounded
- **Raw Value**: `round((display_value - offset) / multiplier)`

## Time Format

```
DD/MM/YYYY,HH:MM:SS.mmmmmm
09/12/2025,14:30:15.450000
├─ DD: 2 digits (01-31)
├─ MM: 2 digits (01-12)
├─ YYYY: 4 digits
├─ HH: 2 digits (00-23)
├─ MM: 2 digits (00-59)
├─ SS: 2 digits (00-59)
└─ mmmmmm: 6 digits microseconds (000000-999999)
```

## Multiplier/Offset Formulas

### Generation (Export)

```javascript
// Calculate from computed values
const min = computation.stats.min; // e.g., 100.50
const max = computation.stats.max; // e.g., 500.75
const range = max - min; // e.g., 400.25

const intMin = -2147483648;
const intMax = 2147483647;
const intRange = intMax - intMin; // 4,294,967,295

multiplier = range / intRange; // 9.313E-08
offset = min - intMin * multiplier; // 100.548
```

### Export (To RAW)

```javascript
// Convert display value to raw integer
raw_value = round((display_value - offset) / multiplier);
```

### Import (To Display)

```javascript
// Parser uses CFG multiplier/offset to convert back
display_value = raw_value * multiplier + offset;
```

## Example: Full Export

### Input

```
Equation: (IA + IB + IC) / 3
Sample Rate: 4800 Hz
Total Samples: 12000
Min Value: 100.50 A
Max Value: 500.75 A
```

### Generated CFG

```
MID=COMPUTED_CHANNEL,EQUATION_1702080615450,2013
1,1A,0D
1,COMPUTED,,,A,9.313225746154785E-08,100.54864501953125,0,-2147483648,2147483647,4800,1,P
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

### Generated DAT (First 10 lines)

```
1,0,0
2,0,1024
3,0,2048
4,1,3072
5,1,4096
6,1,5120
7,2,6144
8,2,7168
9,2,8192
10,2,9216
```

### Verification (Sample 2)

```
DAT: 2,0,1024
Parse: display = 1024 * 9.313E-08 + 100.548
Result: 100.6473 ✓
```

## File Size Estimate

```
CFG: ~200-500 bytes (mostly header, fixed size)
DAT: ~20 bytes per sample
     For 12000 samples: ~240 KB
     For 160000 samples: ~3.2 MB
```

## Common Issues & Fixes

| Issue                   | Cause                          | Fix                                     |
| ----------------------- | ------------------------------ | --------------------------------------- |
| "garbage values" in DAT | Multiplier/offset wrong        | Recalculate: `(max-min) / INT32_RANGE`  |
| File won't load         | Wrong time format              | Use `DD/MM/YYYY,HH:MM:SS.mmmmmm`        |
| Chart shows zeros       | Raw values too small           | Check multiplier in scientific notation |
| NaN in chart            | Division by zero in multiplier | Check min ≠ max                         |
| Samples don't reload    | DAT format wrong               | Format must be `sample,ms,value`        |

## Tools to Verify

### Text Editor

- Open .cfg and .dat in VS Code
- Check line endings (should be Unix LF)
- Verify time format matches `DD/MM/YYYY,HH:MM:SS.mmmmmm`

### Browser Console

```javascript
// After export, check:
console.log(cfgContent); // View CFG structure
console.log(datContent.split("\n")[0]); // First DAT line
console.log(datContent.split("\n").length); // Total samples
```

### Comparison

```bash
# Compare with original (in terminal)
diff -u HR_85429_ASCII.CFG computed_channel_YYYY-MM-DD.CFG
# Focus on structure, not values
```

## Success Indicators ✓

- [x] CFG Line 1 contains "2013"
- [x] CFG Line 2 is "1,1A,0D"
- [x] CFG multiplier/offset in scientific notation (E-08, E-07, etc.)
- [x] DAT lines are `number,milliseconds,integer`
- [x] DAT integers in range [-2147483648, 2147483647]
- [x] Files download as separate .cfg and .dat
- [x] "Select and Load Files" accepts both files
- [x] Chart displays after reload
- [x] Values match original equation output (within rounding)
