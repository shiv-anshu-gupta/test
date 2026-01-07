# Computed Channels Fix - Data Flow Diagram

## BEFORE: ❌ Broken Flow

```
Tabulator sends color update:
{
  type: "Analog",           ❌ WRONG TYPE
  originalIndex: 0,         ❌ Index in cfg.computedChannels, not cfg.analogChannels
  channelID: "computed-xyz"
}
         ↓
Color handler receives event
         ↓
Type check: t === "analog" || t === "digital"  ✅ Passes (because type = "Analog")
         ↓
updateChannelFieldByIndex("analog", 0, "lineColors", newColor)
         ↓
❌ Updates: channelState.analog.lineColors[0]
❌ Should have updated: channelState.computed.lineColors[0]
         ↓
RESULT: Computed channel color not updated!
```

## AFTER: ✅ Fixed Flow

```
Tabulator sends color update:
{
  type: "Computed",         ✅ CORRECT TYPE
  originalIndex: 0,         ✅ Index in cfg.computedChannels array
  channelID: "computed-xyz"
}
         ↓
Color handler receives event
         ↓
Option 1 - By channelID (preferred):
  findChannelByID("computed-xyz")
         ↓
  Returns: { type: "computed", idx: 0 }
         ↓
  updateChannelFieldByID("computed-xyz", "lineColors", newColor)
         ↓
  channelState.computed.lineColors[0] = newColor ✅
         ↓
Option 2 - By type & originalIndex (fallback):
  Type check: t === "analog" || t === "digital" || t === "computed" ✅
         ↓
  updateChannelFieldByIndex("computed", 0, "lineColors", newColor)
         ↓
  channelState.computed.lineColors[0] = newColor ✅
         ↓
RESULT: Computed channel color updated correctly!
```

## Channel State Structure

```
channelState = {
  analog: {
    yLabels: [...],
    lineColors: [...],
    channelIDs: [...],
    scales: [...],
    groups: [...],
    ...
  },
  digital: {
    yLabels: [...],
    lineColors: [...],
    channelIDs: [...],
    scales: [...],
    groups: [...],
    ...
  },
  computed: {
    yLabels: [...],
    lineColors: [...],
    channelIDs: [...],      ✅ Now properly populated
    scales: [...],
    groups: [...],
    equations: [...],
    ...
  }
}
```

## Channel ID Map (fast lookup)

```
channelIDMap.get("computed-xyz") →
  {
    type: "computed",
    idx: 0
  }

This enables:
updateChannelFieldByID("computed-xyz", "lineColors", color)
  → findChannelByID("computed-xyz") → { type: "computed", idx: 0 }
  → channelState.computed.lineColors[0] = color
```

## Support Matrix

| Handler  | Analog | Digital | Computed |
| -------- | ------ | ------- | -------- |
| COLOR    | ✅     | ✅      | ✅       |
| SCALE    | ✅     | ✅      | ✅       |
| START    | ✅     | ✅      | ✅       |
| DURATION | ✅     | ✅      | ✅       |
| INVERT   | ✅     | ✅      | ✅       |
| GROUP    | ✅     | ✅      | ✅       |
