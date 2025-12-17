# 📊 Linear Interpolation - Complete Explanation

## 🎯 What is linearInterpolate?

**Linear Interpolation** = Finding values between two known points by drawing a straight line.

---

## 📐 The Formula

```javascript
linearInterpolate(x1, y1, x2, y2, x)
= y1 + (x - x1) × (y2 - y1) / (x2 - x1)
```

### Breakdown:

```
x1, y1  = First known point
x2, y2  = Second known point
x       = Position where you want to find the value
Result  = The interpolated y value
```

---

## 🎨 Visual Example

### Test 3.1: Midpoint Interpolation

```javascript
linearInterpolate(0, 10, 4, 20, 2)
= 15
```

**Visual:**

```
Y-axis
  |
20|                    ● (x2=4, y2=20)
  |                  /
  |                /
15|              ●  ← We want this point (x=2, y=?)
  |            /
  |          /
10|  ● (x1=0, y1=10)
  |/
  |________________________ X-axis
  0       2       4
```

**Calculation:**

```
slope = (20 - 10) / (4 - 0) = 10 / 4 = 2.5

y = 10 + (2 - 0) × 2.5
y = 10 + 2 × 2.5
y = 10 + 5
y = 15  ✓
```

---

### Test 3.2: Quarter Point (1/4)

```javascript
linearInterpolate(0, 10, 4, 20, 1)
= 12.5
```

**Visual:**

```
Y-axis
  |
20|                    ● (4, 20)
  |                  /
  |                /
15|              /
  |            /
  |          /
12.5|    ●  ← At x=1, y=12.5 (1/4 of the way)
  |      /
  |    /
10|  ● (0, 10)
  |/
  |________________________ X-axis
  0   1       2       3   4
```

**Calculation:**

```
slope = 2.5 (same as before)

y = 10 + (1 - 0) × 2.5
y = 10 + 1 × 2.5
y = 10 + 2.5
y = 12.5  ✓
```

---

### Test 3.3: Three-Quarter Point (3/4)

```javascript
linearInterpolate(0, 10, 4, 20, 3)
= 17.5
```

**Visual:**

```
Y-axis
  |
20|                    ● (4, 20)
  |                  /
  |                /
17.5|            ●  ← At x=3, y=17.5 (3/4 of the way)
  |            /
  |          /
15|        /
  |      /
  |    /
10|  ● (0, 10)
  |/
  |________________________ X-axis
  0       1   2   3   4
```

**Calculation:**

```
slope = 2.5

y = 10 + (3 - 0) × 2.5
y = 10 + 3 × 2.5
y = 10 + 7.5
y = 17.5  ✓
```

---

### Test 3.4: Edge Case (x1 == x2)

```javascript
linearInterpolate(5, 10, 5, 20, 5)
= 10
```

**Problem:**

```
x1 = 5, x2 = 5  (Same x-coordinate!)

This would cause: (y2 - y1) / (5 - 5) = (20 - 10) / 0
                                        = 10 / 0
                                        = Division by Zero! ❌
```

**Solution:**

```javascript
if (x2 === x1) return y1; // Just return the first value
```

**Why?** If both points have same x-coordinate, there's no line to interpolate on. Return the first value to avoid crashing.

---

## 🔄 Real-World Examples

### Example 1: Temperature

```
8:00 AM: 20°C
10:00 AM: 26°C

What's the temperature at 9:00 AM?
→ linearInterpolate(8, 20, 10, 26, 9) = 23°C
```

### Example 2: Speed

```
At 0 seconds: Speed = 0 m/s
At 4 seconds: Speed = 20 m/s

What's the speed at 2 seconds?
→ linearInterpolate(0, 0, 4, 20, 2) = 10 m/s
```

### Example 3: Voltage (YOUR COMTRADE DATA!)

```
Sample 0 (time=0s): Voltage = 10V
Sample 4 (time=0.001s): Voltage = 20V

What's the voltage at time=0.0005s (Sample 2)?
→ linearInterpolate(0, 10, 0.001, 20, 0.0005) = 15V
```

---

## 💡 Why Do We Use It?

### Problem 1: Missing Data

```
Data points: [10, ?, ?, 20]
                ↑
            Midpoint missing!

Solution: Interpolate the missing value = 15
Result:   [10, 12.5, 15, 17.5, 20]  ← All filled!
```

### Problem 2: Finding Values at Specific Points

```
You have measurements at:
- t=0s: 10A
- t=1s: 20A

You want current at t=0.5s?
→ linearInterpolate(0, 10, 1, 20, 0.5) = 15A
```

### Problem 3: Resampling Data

```
Original sampling: Every 1 second (1 Hz)
New sampling: Every 0.5 seconds (2 Hz)

Use interpolation to generate new values!
```

---

## 📊 In Your COMTRADE Context

### Your DAT File Has:

```
Sample#  Time    IA_Value
0        0       10.0
1        1       12.0
2        2       14.0
3        6       18.0  ← Jump! Missing samples 3,4,5
4        7       20.0
5        8       22.0
6        10      25.0  ← Another jump! Missing sample 9
```

### What You Need:

```
Uniform times: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

Use interpolation to fill the gaps:
Sample 3 (time=3): linearInterpolate(2, 14, 6, 18, 3) = 15.33A
Sample 4 (time=4): linearInterpolate(2, 14, 6, 18, 4) = 16.67A
Sample 5 (time=5): linearInterpolate(2, 14, 6, 18, 5) = 17.33A
Sample 9 (time=9): linearInterpolate(8, 22, 10, 25, 9) = 23.5A
```

---

## 🎯 Test Summary

| Test    | What It Does                   | Why                      |
| ------- | ------------------------------ | ------------------------ |
| **3.1** | Find midpoint (y=15 at x=2)    | Common use case          |
| **3.2** | Find 1/4 point (y=12.5 at x=1) | Test different positions |
| **3.3** | Find 3/4 point (y=17.5 at x=3) | Verify formula accuracy  |
| **3.4** | Handle edge case (x1==x2)      | Prevent division by zero |

---

## 🔧 Code Implementation

### Simple Version:

```javascript
function linearInterpolate(x1, y1, x2, y2, x) {
  if (x2 === x1) return y1; // Prevent divide by zero

  const slope = (y2 - y1) / (x2 - x1);
  return y1 + (x - x1) * slope;
}
```

### Step by Step:

```javascript
// Step 1: Calculate slope (how steep the line is)
const slope = (y2 - y1) / (x2 - x1);

// Step 2: Calculate how far x is from x1
const dx = x - x1;

// Step 3: Multiply slope by distance
const dy = slope * dx;

// Step 4: Add to starting point
const result = y1 + dy;
```

---

## ✅ When to Use

| Scenario                            | Use It?                   |
| ----------------------------------- | ------------------------- |
| Fill missing data points            | ✅ YES                    |
| Find value between two known points | ✅ YES                    |
| Resample at different frequency     | ✅ YES                    |
| Create smooth transitions           | ✅ YES                    |
| x1 == x2 (same x-coordinate)        | ❌ NO (handle separately) |
| Curved data (not linear)            | ⚠️ MAYBE (use spline)     |

---

## 💬 Simple Answers

### Q: What is linearInterpolate?

**A:** Finding values between two known points using a straight line.

### Q: When do we use it?

**A:** When we have missing data or need values at specific points.

### Q: What does Test 3.4 do?

**A:** Handles the edge case where x1==x2 (prevents division by zero).

### Q: Why important for COMTRADE?

**A:** To fill gaps in non-uniform timestamps and create smooth charts.

---

## 🚀 In Your Project

**Your timeInterpolation module uses it to:**

1. Fill missing data points
2. Resample data at uniform intervals
3. Create smooth charts with no gaps
4. Handle non-uniform COMTRADE sampling

**Result:** Smooth, professional-looking charts! 📈
