/**
 * createState DOM Binding Examples
 * 
 * Practical examples demonstrating all DOM binding features, especially
 * the new selectiveUpdate option for high-performance scenarios.
 */

import { createState } from './createState.js';

// ============================================================================
// EXAMPLE 1: Basic One-Way Binding
// ============================================================================

export function example1_basicOneWay() {
  const state = createState({
    message: "Hello, World!",
    count: 0
  });

  // Bind message to display
  state.bindToDOM('message', '#messageDisplay', { prop: 'textContent' });
  
  // Bind count to counter
  state.bindToDOM('count', '#counterDisplay', { prop: 'textContent' });

  // Simulate changes
  setTimeout(() => {
    state.message = "Updated message!";
    state.count = 42;
  }, 1000);
}

// ============================================================================
// EXAMPLE 2: Two-Way Form Binding
// ============================================================================

export function example2_twoWayForm() {
  const state = createState({
    username: "",
    email: "",
    isDarkMode: false
  });

  // Two-way text inputs
  state.bindToDOM('username', '#usernameInput', { twoWay: true });
  state.bindToDOM('email', '#emailInput', { twoWay: true });
  
  // Two-way checkbox
  state.bindToDOM('isDarkMode', '#darkModeToggle', { twoWay: true });

  // Display changes
  state.subscribe(change => {
    console.log(`Form field changed: ${change.path.join('.')} = ${change.newValue}`);
  });

  return state;
}

// ============================================================================
// EXAMPLE 3: Selective RAF Updates (Performance)
// ============================================================================

export function example3_selectiveRAFUpdates() {
  const state = createState({
    frameCount: 0,
    fps: 0,
    lastUpdate: Date.now()
  });

  // Use selectiveUpdate for high-frequency updates
  state.bindToDOM('frameCount', '#frameCounter', {
    prop: 'textContent',
    selectiveUpdate: true  // Don't update DOM immediately
  });

  state.bindToDOM('fps', '#fpsDisplay', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  // Simulate high-frequency animation loop
  let lastTime = Date.now();
  let frameCounter = 0;

  function animationLoop() {
    frameCounter++;
    state.frameCount = frameCounter;

    const now = Date.now();
    if (now - lastTime >= 1000) {
      state.fps = frameCounter;
      frameCounter = 0;
      lastTime = now;
    }

    requestAnimationFrame(animationLoop);
  }

  animationLoop();
}

// ============================================================================
// EXAMPLE 4: Real-Time Data Updates with Multiple Elements
// ============================================================================

export function example4_multiElementBatching() {
  const state = createState({
    temperature: 20,
    humidity: 50,
    pressure: 1013
  });

  // All elements bind to same state with selectiveUpdate
  // They'll all batch updates on the same RAF frame
  state.bindToDOM('temperature', '#tempLabel', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  state.bindToDOM('temperature', '#tempAttr', {
    attr: 'data-temp',
    selectiveUpdate: true
  });

  state.bindToDOM('humidity', '#humidityLabel', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  state.bindToDOM('pressure', '#pressureLabel', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  // Simulate sensor data arriving rapidly
  setInterval(() => {
    state.temperature = 20 + Math.random() * 5;
    state.humidity = 50 + Math.random() * 10;
    state.pressure = 1013 + Math.random() * 2;
  }, 100);

  return state;
}

// ============================================================================
// EXAMPLE 5: Nested Property Binding
// ============================================================================

export function example5_nestedProperties() {
  const state = createState({
    user: {
      name: "Alice",
      profile: {
        city: "Paris",
        country: "France",
        bio: "Travel enthusiast"
      }
    }
  });

  // Bind nested properties
  state.bindToDOM('user.name', '#userName', { prop: 'textContent' });
  state.bindToDOM('user.profile.city', '#userCity', { prop: 'textContent' });
  state.bindToDOM('user.profile.country', '#userCountry', { prop: 'textContent' });

  // Bind to attributes
  state.bindToDOM(['user', 'name'], '#userCard', { attr: 'data-user' });

  return state;
}

// ============================================================================
// EXAMPLE 6: Dynamic HTML with selectiveUpdate (Performance)
// ============================================================================

export function example6_dynamicHTML() {
  const state = createState({
    items: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" }
    ]
  });

  // Bind with selectiveUpdate to prevent layout thrashing
  state.bindToDOM('items', '#itemList', {
    prop: 'innerHTML',
    selectiveUpdate: true  // Critical for performance with HTML updates
  });

  // Subscribe to generate HTML when items change
  state.subscribe(() => {
    // Generate HTML from state.items
    state.items = state.items; // Trigger update
  }, { path: 'items', descendants: true });

  // Add items rapidly without DOM thrashing
  function addItems(count) {
    for (let i = 0; i < count; i++) {
      state.items.push({ id: state.items.length + 1, name: `Item ${state.items.length + 1}` });
    }
  }

  return state;
}

// ============================================================================
// EXAMPLE 7: Unbinding and Cleanup
// ============================================================================

export function example7_unbindingCleanup() {
  const state = createState({ value: 0 });

  // Create binding
  const unbind = state.bindToDOM('value', '#valueDisplay', {
    prop: 'textContent'
  });

  // Later: remove binding when no longer needed
  function cleanup() {
    unbind(); // Stop listening to state changes
  }

  return { state, cleanup };
}

// ============================================================================
// EXAMPLE 8: Combining Selective Updates with Two-Way Binding
// ============================================================================

export function example8_selectiveWithTwoWay() {
  const state = createState({
    searchQuery: "",
    results: []
  });

  // Two-way on input (immediate for responsiveness)
  state.bindToDOM('searchQuery', '#searchInput', { twoWay: true });

  // One-way update of results with selectiveUpdate (prevents DOM thrashing)
  state.bindToDOM('results', '#resultsList', {
    prop: 'innerHTML',
    selectiveUpdate: true
  });

  // Debounced search
  let searchTimeout;
  state.subscribe(() => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      // Simulate API search call
      const query = state.searchQuery;
      state.results = simulateSearch(query);
    }, 300);
  }, { path: 'searchQuery' });

  function simulateSearch(query) {
    if (!query) return [];
    return [
      { id: 1, text: `Result for "${query}" 1` },
      { id: 2, text: `Result for "${query}" 2` }
    ];
  }

  return state;
}

// ============================================================================
// EXAMPLE 9: Chart Data Updates (High-Frequency)
// ============================================================================

export function example9_chartDataUpdates() {
  const state = createState({
    chartData: [],
    lastUpdate: new Date().toLocaleTimeString()
  });

  // Use selectiveUpdate for chart rendering (expensive operation)
  state.bindToDOM('chartData', '#chart', {
    prop: 'innerHTML',
    selectiveUpdate: true
  });

  state.bindToDOM('lastUpdate', '#updateTime', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  // Simulate high-frequency data updates
  function updateChartData() {
    const newDataPoint = Math.random() * 100;
    state.chartData.push(newDataPoint);
    if (state.chartData.length > 100) state.chartData.shift();
    state.lastUpdate = new Date().toLocaleTimeString();
  }

  // Update every 50ms without DOM thrashing
  setInterval(updateChartData, 50);

  return state;
}

// ============================================================================
// EXAMPLE 10: Conditional Binding with Attributes
// ============================================================================

export function example10_conditionalAttributes() {
  const state = createState({
    isLoading: false,
    errorMessage: "",
    successMessage: ""
  });

  // Show/hide loading indicator with attribute
  state.bindToDOM('isLoading', '#loader', {
    attr: 'aria-hidden',
    selectiveUpdate: true
  });

  // Display error messages
  state.bindToDOM('errorMessage', '#errorBox', {
    prop: 'textContent',
    attr: 'class' // Could bind to class for styling
  });

  // Subscribe for complex conditional logic
  state.subscribe(() => {
    const errorBox = document.getElementById('errorBox');
    if (state.errorMessage) {
      errorBox.style.display = 'block';
      errorBox.className = 'error visible';
    } else {
      errorBox.style.display = 'none';
    }
  }, { path: 'errorMessage' });

  return state;
}

// ============================================================================
// PERFORMANCE COMPARISON UTILITY
// ============================================================================

export function comparePerformance() {
  console.log("🚀 Starting performance comparison...\n");

  // Test 1: Without selectiveUpdate
  console.log("Test 1: Without selectiveUpdate (Immediate Updates)");
  const state1 = createState({ value: 0 });
  state1.bindToDOM('value', '#perfTest1', { prop: 'textContent' });

  let updates1 = 0;
  const observer1 = new MutationObserver(() => updates1++);
  observer1.observe(document.getElementById('perfTest1'), { characterData: true, subtree: true });

  const start1 = performance.now();
  for (let i = 0; i < 1000; i++) {
    state1.value = i;
  }
  const end1 = performance.now();

  observer1.disconnect();
  console.log(`  Time: ${(end1 - start1).toFixed(2)}ms`);
  console.log(`  DOM Updates: ${updates1}`);
  console.log();

  // Test 2: With selectiveUpdate
  console.log("Test 2: With selectiveUpdate (RAF Batched)");
  const state2 = createState({ value: 0 });
  state2.bindToDOM('value', '#perfTest2', {
    prop: 'textContent',
    selectiveUpdate: true
  });

  let updates2 = 0;
  const observer2 = new MutationObserver(() => updates2++);
  observer2.observe(document.getElementById('perfTest2'), { characterData: true, subtree: true });

  const start2 = performance.now();
  for (let i = 0; i < 1000; i++) {
    state2.value = i;
  }

  // Wait for RAF to complete
  requestAnimationFrame(() => {
    const end2 = performance.now();
    observer2.disconnect();
    console.log(`  Time: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`  DOM Updates: ${updates2}`);
    console.log();
    console.log("✅ selectiveUpdate shows fewer DOM updates = better performance");
  });
}

// ============================================================================
// HTML TEMPLATES FOR EXAMPLES
// ============================================================================

export const HTML_TEMPLATES = {
  example1: `
    <div class="example">
      <p id="messageDisplay">Loading...</p>
      <p id="counterDisplay">0</p>
    </div>
  `,

  example2: `
    <div class="form-group">
      <input id="usernameInput" type="text" placeholder="Username">
    </div>
    <div class="form-group">
      <input id="emailInput" type="email" placeholder="Email">
    </div>
    <div class="form-group">
      <label>
        <input id="darkModeToggle" type="checkbox"> Dark Mode
      </label>
    </div>
  `,

  example3: `
    <div class="stats">
      <div>Frames: <span id="frameCounter">0</span></div>
      <div>FPS: <span id="fpsDisplay">0</span></div>
    </div>
  `,

  example4: `
    <div class="sensor-data">
      <p>Temp: <span id="tempLabel">--</span>°C (<span id="tempAttr" data-temp="">N/A</span>)</p>
      <p>Humidity: <span id="humidityLabel">--</span>%</p>
      <p>Pressure: <span id="pressureLabel">--</span> hPa</p>
    </div>
  `,

  example6: `
    <div id="itemList"></div>
  `,

  example8: `
    <input id="searchInput" type="text" placeholder="Search...">
    <ul id="resultsList"></ul>
  `,

  example9: `
    <div id="chart" style="height: 300px;"></div>
    <p>Last updated: <span id="updateTime">--</span></p>
  `
};

