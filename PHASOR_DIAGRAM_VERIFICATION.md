# Phasor Diagram - Visual Verification Guide

## Expected Visual Layout

After the fix, when you load a COMTRADE 2013 file with three-phase data, the phasor diagram should look like this:

```
                       North (0°)
                         ↑
                        IA

       West (270°)  ←    ●    →  East (90°)

                    IB ↙     ↖ IC
                         ↓
                     South (180°)
```

## Correct Channel Positioning

### Current Channels (IA, IB, IC)

| Channel | Angle | Direction              | Color           |
| ------- | ----- | ---------------------- | --------------- |
| **IA**  | 0°    | Right (East)           | Cyan (#00d9ff)  |
| **IB**  | 240°  | Lower-Left (Southwest) | Blue (#2196f3)  |
| **IC**  | 120°  | Upper-Left (Northwest) | Green (#10b981) |

### Voltage Channels (VA, VB, VC)

| Channel | Angle | Direction              | Color            |
| ------- | ----- | ---------------------- | ---------------- |
| **VA**  | 0°    | Right (East)           | Orange (#ff6b35) |
| **VB**  | 240°  | Lower-Left (Southwest) | Yellow (#fbbf24) |
| **VC**  | 120°  | Upper-Left (Northwest) | Red (#ef4444)    |

## Verification Checklist

- [ ] **Vectors at correct angles**

  - ✓ IA/VA point to right (0°)
  - ✓ IB/VB point to lower-left (240°)
  - ✓ IC/VC point to upper-left (120°)
  - ✓ 120° spacing between phases (balanced system)

- [ ] **Vector length appropriate**

  - ✓ No arrows exceed chart circle
  - ✓ Arrows are proportional to magnitude
  - ✓ Smaller magnitude = shorter arrow
  - ✓ Larger magnitude = longer arrow

- [ ] **Labels readable**

  - ✓ Channel names displayed (not "[object Object]")
  - ✓ Labels positioned outside arrows
  - ✓ Color-coded labels match arrow colors

- [ ] **Scale visible**

  - ✓ "Max: [value]" shown at bottom
  - ✓ Scale updates when timeline changes
  - ✓ Max value matches data

- [ ] **Grid visible**
  - ✓ Circular grid lines present
  - ✓ 0°, 90°, 180°, 270° labels visible
  - ✓ Center dot visible

## Real-Time Updates

When you drag the timeline slider:

1. All arrow lengths update smoothly
2. Magnitudes change but angles stay the same (0°, 120°, 240°)
3. "Max:" value updates to reflect new maximum
4. All arrows stay within boundaries

## Example Console Output

When you load data, check browser console for:

```
[PolarChart] Using analog channels for phasor plot
[PolarChart] Max magnitude: 450.25, Scale factor: 0.0015
[PolarChart] Successfully extracted 6 phasors
[PolarChart] IA: magnitude=450.25, angle=0.00°
[PolarChart] IB: magnitude=445.80, angle=240.00°
[PolarChart] IC: magnitude=448.90, angle=120.00°
[PolarChart] VA: magnitude=215.60, angle=0.00°
[PolarChart] VB: magnitude=214.30, angle=240.00°
[PolarChart] VC: magnitude=215.90, angle=120.00°
```

## Troubleshooting

### Arrows outside the circle?

- ✓ Fixed - automatic scaling prevents this
- Check console: "Max magnitude" should show actual data value
- Scale factor should be > 0

### Angles incorrect?

- Check channel names in CFG file (should contain A, B, or C)
- Verify data is loading (check console for channel list)
- Make sure channels named IA/VA, IB/VB, IC/VC

### No magnitude shown?

- ✓ Now shows "Max: [value]" at bottom
- Check that data is loaded (console shows extracted phasors)
- Ensure time slider is updating values

### "[object Object]" displayed?

- ✓ Fixed - all labels now string-converted
- Channel names should display correctly

## Physics Verification

For a balanced three-phase system:

- Phase angle between each phase should be exactly **120°**
- Magnitudes should be approximately equal (within 5-10%)
- Any two phases should form a 120° angle around the origin

Example valid phasor set:

```
IA: 100A @ 0°    → (100, 0)
IB: 98A @ 240°   → (-49, -85)  ← 120° from IA ✓
IC: 102A @ 120°  → (-51, 88)   ← 120° from IA, 120° from IB ✓
```
