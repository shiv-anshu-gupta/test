# createState DOM Binding Guide

## Overview

`createState` is a lightweight, deep-reactive state management system for vanilla JavaScript with powerful DOM binding capabilities. This guide covers the enhanced DOM binding features, including the new **Selective RAF Updates** option for high-performance applications.

---

## JSDoc API Reference

### `createState(initialState, options?)`

Creates a reactive state object with deep reactivity support.

**Parameters:**
- `initialState` (any): Initial state value (object, array, or primitive)
- `options` (Object, optional):
  - `batch` (boolean, default: `true`): Enable state change batching on RAF

**Returns:** Reactive proxy with state API methods

**Example:**
```javascript
const state = createState({
  user: { name: "Alice", age: 30 },
  items: [],
  isDark: false
});
```

---

### `state.bindToDOM(propertyPath, selectorOrElement, options?)`

Binds a state property to a DOM element with optional one-way or two-way sync.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `propertyPath` | string \| string[] | State path: `'user.name'` or `['user','name']` |
| `selectorOrElement` | string \| Element | CSS selector or DOM element reference |
| `options` | Object | Configuration object (see below) |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `twoWay` | boolean | `false` | Enable two-way sync (DOM ↔ state) |
| `prop` | string | - | DOM property to bind: `'textContent'`, `'innerHTML'`, `'value'` |
| `attr` | string | - | DOM attribute to bind: `'data-user'`, `'title'`, `'aria-label'` |
| `eventType` | string | - | Custom event: `'input'`, `'change'`, `'blur'` (auto-detected if not set) |
| `selectiveUpdate` | boolean | `false` | **NEW**: Queue DOM updates on RAF instead of immediate (performance optimization) |
| `rafInterval` | number | `0` | Reserved for future batch interval support |

**Returns:** Unbind function to remove listeners

---

## Core Features

### 1. Basic One-Way Binding

State updates automatically refresh the DOM element.

```javascript
const state = createState({ title: "Hello World" });

// Bind to textContent
state.bindToDOM('title', '#titleElement', { prop: 'textContent' });

state.title = "Updated Title"; // DOM updates automatically
```

### 2. Two-Way Binding

DOM changes update state; state changes update DOM.

```javascript
const state = createState({ name: "Alice" });

// Input sync
state.bindToDOM('name', '#nameInput', { twoWay: true });

// User types → state updates
// state.name = value → input.value updates
```

**Supported Elements:**
- `<input type="text">` → `value` property
- `<input type="checkbox">` → `checked` property
- `<textarea>` → `value` property
- `<select>` → `value` property

### 3. Attribute Binding

Bind to HTML attributes instead of properties.

```javascript
const state = createState({ username: "alice" });

state.bindToDOM('username', '#userBox', { attr: 'data-user' });
// <div id="userBox" data-user="alice"></div>

state.username = "bob";
// <div id="userBox" data-user="bob"></div>
```

### 4. innerHTML Binding (with selectiveUpdate)

For dynamic HTML content, combine `innerHTML` with `selectiveUpdate` for performance.

```javascript
const state = createState({ 
  html: '<h2>Loading...</h2>' 
});

state.bindToDOM('html', '#container', { 
  prop: 'innerHTML',
  selectiveUpdate: true  // Prevents layout thrashing on rapid updates
});

// Rapid updates won't cause multiple reflows
state.html = '<h2>Item 1</h2>';
state.html = '<h2>Item 2</h2>';
state.html = '<h2>Item 3</h2>';
// DOM only updates once per animation frame with final value
```

### 5. Nested Property Binding

Bind deep nested state using dot notation or array paths.

```javascript
const state = createState({
  user: {
    profile: {
      address: {
        city: "Paris"
      }
    }
  }
});

// Both syntaxes work
state.bindToDOM('user.profile.address.city', '#city', { prop: 'textContent' });
state.bindToDOM(['user', 'profile', 'address', 'city'], '#city', { prop: 'textContent' });

state.user.profile.address.city = "London"; // DOM updates
```

---

## Performance Optimization: Selective RAF Updates

### What is `selectiveUpdate`?

When `selectiveUpdate: true`, DOM updates are deferred to the next `requestAnimationFrame` instead of updating immediately. This prevents **layout thrashing** and improves performance for:

- Rapid state changes (event handlers, loops)
- Multiple dependent bindings
- Heavy DOM operations (innerHTML, style changes)
- High-frequency updates (animation, data streaming)

### Without selectiveUpdate (Immediate Update)

```javascript
const state = createState({ count: 0 });
state.bindToDOM('count', '#counter', { prop: 'textContent' });

state.count = 1;  // DOM updates immediately
state.count = 2;  // DOM updates immediately
state.count = 3;  // DOM updates immediately
// Result: 3 DOM updates (inefficient)
```

### With selectiveUpdate (RAF Batched)

```javascript
const state = createState({ count: 0 });
state.bindToDOM('count', '#counter', { 
  prop: 'textContent',
  selectiveUpdate: true  // Queue updates on RAF
});

state.count = 1;  // Queued
state.count = 2;  // Queued (overwrites previous)
state.count = 3;  // Queued (overwrites previous)
// Next RAF frame: DOM updates once with value 3
// Result: 1 DOM update (optimized)
```

### Use Case: Performance-Critical Updates

```javascript
// Example: Real-time chart updates with many data points
const chartState = createState({
  data: [],
  xAxis: [],
  yAxis: [],
  title: "Live Data"
});

// Use selectiveUpdate for DOM-heavy operations
chartState.bindToDOM('data', '#chart', {
  prop: 'innerHTML',
  selectiveUpdate: true
});

chartState.bindToDOM('title', '#chartTitle', {
  prop: 'textContent',
  selectiveUpdate: true
});

// Rapidly update data without blocking UI
setInterval(() => {
  chartState.data = generateNewData();
  chartState.title = `Updated at ${new Date().toLocaleTimeString()}`;
  // DOM updates batch on next RAF, preventing layout jank
}, 10);
```

---

## Examples

### Example 1: Simple Form Sync

```html
<input id="nameInput" type="text" placeholder="Enter name">
<span id="greeting"></span>
```

```javascript
const state = createState({ name: "" });

state.bindToDOM('name', '#nameInput', { twoWay: true });
state.bindToDOM('name', '#greeting', { prop: 'textContent' });

// Update display when subscription occurs
state.subscribe(() => {
  document.getElementById('greeting').textContent = `Hello, ${state.name}!`;
});
```

### Example 2: Multi-Element Selective Updates

```html
<div id="label1"></div>
<div id="label2"></div>
<div id="label3"></div>
```

```javascript
const state = createState({ counter: 0 });

// All three elements batch updates on same RAF frame
state.bindToDOM('counter', '#label1', { prop: 'textContent', selectiveUpdate: true });
state.bindToDOM('counter', '#label2', { prop: 'textContent', selectiveUpdate: true });
state.bindToDOM('counter', '#label3', { prop: 'textContent', selectiveUpdate: true });

// Rapid updates
for (let i = 0; i < 1000; i++) {
  state.counter = i;
}
// All 3 elements update once on next RAF with counter = 999
```

### Example 3: Dynamic Chart with HTML Binding

```html
<div id="chartContainer"></div>
```

```javascript
const state = createState({
  chartHTML: '<canvas id="chart"></canvas>'
});

state.bindToDOM('chartHTML', '#chartContainer', {
  prop: 'innerHTML',
  selectiveUpdate: true  // Prevent thrashing during updates
});

// Update chart hundreds of times per second
function updateChart(data) {
  state.chartHTML = renderChartHTML(data);
}

// selectiveUpdate ensures DOM only updates once per frame
requestAnimationFrame(updateChart);
```

### Example 4: Unbinding

```javascript
const state = createState({ count: 0 });

const unbind = state.bindToDOM('count', '#counter', { prop: 'textContent' });

state.count = 5; // DOM updates

unbind(); // Remove binding

state.count = 10; // DOM does NOT update
```

### Example 5: Checkbox with selectiveUpdate

```html
<input id="darkMode" type="checkbox">
<div id="app" style="background: white;"></div>
```

```javascript
const state = createState({ isDark: false });

state.bindToDOM('isDark', '#darkMode', { twoWay: true });

state.subscribe(() => {
  const app = document.getElementById('app');
  if (state.isDark) {
    app.style.background = 'black';
    app.style.color = 'white';
  } else {
    app.style.background = 'white';
    app.style.color = 'black';
  }
});
```

---

## Advanced Usage

### Combining with Subscriptions

```javascript
const state = createState({ items: [] });

// DOM binding (one-way)
state.bindToDOM('items', '#itemList', { 
  prop: 'innerHTML',
  selectiveUpdate: true 
});

// Also subscribe for side effects
state.subscribe(change => {
  if (change.path[0] === 'items') {
    console.log('Items updated:', change.newValue.length);
    // Trigger analytics, API calls, etc.
  }
}, { path: 'items' });
```

### Computed Properties with Binding

```javascript
const state = createState({
  firstName: "John",
  lastName: "Doe"
});

// Define computed property
state.computed('fullName', 
  ['firstName', 'lastName'],
  (s) => `${s.firstName} ${s.lastName}`
);

// Bind computed property
state.bindToDOM('fullName', '#fullNameDisplay', { prop: 'textContent' });

state.firstName = "Jane"; // fullName updates automatically → DOM updates
```

---

## Performance Tips

1. **Use `selectiveUpdate: true` for:**
   - High-frequency updates (>60 per second)
   - Multiple element bindings to same property
   - innerHTML or style changes
   - Real-time data (charts, live feeds)

2. **Use default (immediate) updates for:**
   - Form inputs (user expects instant feedback)
   - One-off updates
   - Low-frequency changes (<1 per second)

3. **Combine with `twoWay` carefully:**
   - Two-way + selectiveUpdate = state updates immediately, DOM updates on RAF
   - Good for performance-critical forms

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Element not found | Check CSS selector; ensure element exists before binding |
| Two-way not working | Ensure `twoWay: true`; check event type (use correct event) |
| DOM not updating | Verify property path matches state structure; check subscriptions |
| Performance issues | Try `selectiveUpdate: true` to batch updates on RAF |
| Memory leaks | Always call unbind function when removing bindings |

---

## API Method Signatures

```javascript
// Create state
const state = createState(initialValue, { batch: true });

// Bind to DOM (returns unbind function)
const unbind = state.bindToDOM(propertyPath, selectorOrElement, {
  twoWay: false,
  prop: 'textContent',
  attr: 'data-value',
  eventType: 'input',
  selectiveUpdate: false,
  rafInterval: 0
});

// Unbind
unbind();

// Subscribe to changes
state.subscribe(change => { }, { path: 'prop.name' });

// Unsubscribe
state.unsubscribe(callbackFn);

// Computed properties
state.computed('propName', ['dep1', 'dep2'], (state) => value);
state.derived('propName', ['dep1', 'dep2'], (state) => value); // alias
```

---

## Browser Compatibility

- ✅ Modern browsers (Chrome 70+, Firefox 63+, Safari 12+, Edge 79+)
- ✅ Proxy support required
- ✅ requestAnimationFrame support required
- ✅ Map support required (for advanced features)

---

## See Also

- [createState Full Documentation](./createState.js)
- [Test Suite](./createState.test.js)
- [Integration Examples](../examples/)

