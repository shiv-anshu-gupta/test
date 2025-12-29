// Quick test for Sidebar Resize - Run in browser console

// Test 1: Open Delta (left sidebar)
console.log("TEST 1: Opening Delta drawer...");
adjustMainContent("left", 400);
// Expected: Charts shift right, margin-left appears

// Test 2: Open Analysis (right sidebar)
console.log("TEST 2: Opening Analysis sidebar...");
adjustMainContent("right", 500);
// Expected: Charts shrink in center, margin-right appears

// Test 3: Close Delta
console.log("TEST 3: Closing Delta drawer...");
adjustMainContent("left", 0);
// Expected: Charts expand left, margin-left removed

// Test 4: Close Analysis
console.log("TEST 4: Closing Analysis sidebar...");
adjustMainContent("right", 0);
// Expected: Charts expand right, full width again

// Verify margins applied to #charts
function verifyMargins() {
  const charts = document.getElementById("charts");
  if (charts) {
    const ml = window.getComputedStyle(charts).marginLeft;
    const mr = window.getComputedStyle(charts).marginRight;
    console.log(`Margins: left=${ml}, right=${mr}`);
    return { left: ml, right: mr };
  }
  console.warn("#charts element not found");
  return null;
}

// Check current state
verifyMargins();

// Advanced: Watch for state changes
function watchChartMargins() {
  const charts = document.getElementById("charts");
  let lastLeft = "";
  let lastRight = "";

  setInterval(() => {
    const style = window.getComputedStyle(charts);
    const ml = style.marginLeft;
    const mr = style.marginRight;

    if (ml !== lastLeft || mr !== lastRight) {
      console.log(`📊 Margin changed: left=${ml}, right=${mr}`);
      lastLeft = ml;
      lastRight = mr;
    }
  }, 100);

  console.log("✅ Watching chart margins (check console for changes)");
}

// Start watching: watchChartMargins()
