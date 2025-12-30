/**
 * Quick Diagnostics Script for Delta Drawer Issues
 * Paste this into browser DevTools Console to diagnose problems
 */

console.log("========== DELTA DRAWER DIAGNOSTICS ==========\n");

// 1. Check Tabulator library
console.log("1️⃣ TABULATOR LIBRARY:");
console.log("   window.Tabulator:", typeof window.Tabulator !== 'undefined' ? "✅ LOADED" : "❌ NOT LOADED");
if (typeof window.Tabulator !== 'undefined') {
  console.log("   Tabulator version:", window.Tabulator.version || "unknown");
}

// 2. Check Delta Drawer
console.log("\n2️⃣ DELTA DRAWER ELEMENTS:");
const drawer = document.getElementById('delta-drawer');
const panel = document.getElementById('delta-drawer-panel');
const content = document.getElementById('delta-drawer-content');
console.log("   Drawer element:", drawer ? "✅ EXISTS" : "❌ MISSING");
console.log("   Panel element:", panel ? "✅ EXISTS" : "❌ MISSING");
console.log("   Content element:", content ? "✅ EXISTS" : "❌ MISSING");

// 3. Check for Tabulator tables
console.log("\n3️⃣ TABULATOR TABLES:");
const tables = document.querySelectorAll('[role="table"]');
console.log("   Found tables:", tables.length);
tables.forEach((table, idx) => {
  const rows = table.querySelectorAll('[role="row"]');
  const cols = table.querySelectorAll('[role="columnheader"]');
  console.log(`   Table ${idx}: ${cols.length} columns, ${rows.length - 1} data rows`);
  console.log(`     Column names: ${Array.from(cols).map(c => c.textContent).join(", ")}`);
});

// 4. Check CSS loaded
console.log("\n4️⃣ STYLESHEETS:");
const tabulatorCSS = Array.from(document.styleSheets).find(s => s.href?.includes('tabulator'));
const deltaCSS = Array.from(document.styleSheets).find(s => s.href?.includes('delta'));
console.log("   Tabulator CSS:", tabulatorCSS ? "✅ LOADED" : "❌ MISSING");
console.log("   Delta CSS:", deltaCSS ? "✅ LOADED" : "❌ MISSING");

// 5. Check channel state
console.log("\n5️⃣ CHANNEL STATE & SCALE FACTORS:");
try {
  // Note: This depends on how channelState is exposed
  console.log("   (Check browser's global channelState object)");
  if (typeof window.channelState !== 'undefined') {
    console.log("   Analog scales:", window.channelState.analog?.axesScales);
    console.log("   Digital scales:", window.channelState.digital?.axesScales);
  }
} catch (e) {
  console.log("   Unable to access channel state");
}

// 6. Test formatScaledValue if available
console.log("\n6️⃣ FORMAT SCALED VALUE TEST:");
console.log("   Testing: 1,911,112 with scaleFactor 0.001 and unit 'A'");
console.log("   Expected: 1.91 kA");
console.log("   (Check console logs for formatScaledValue output above)");

// 7. DOM Tree for Delta Drawer
console.log("\n7️⃣ DELTA DRAWER DOM STRUCTURE:");
if (content) {
  console.log("   Content HTML length:", content.innerHTML.length, "characters");
  const sections = content.querySelectorAll('[class*="delta-table-container"]');
  console.log("   Table containers:", sections.length);
  sections.forEach((section, idx) => {
    const title = section.querySelector('[class*="delta-table-title"]');
    const table = section.querySelector('[role="table"]');
    console.log(`   Section ${idx}: Title="${title?.textContent}" Has_table=${!!table}`);
  });
}

// 8. Console error count
console.log("\n8️⃣ ERRORS & WARNINGS:");
console.log("   (Check browser console for [DeltaDrawer] and [formatScaledValue] messages)");
console.log("   Filter console by: 'DeltaDrawer' or 'formatScaledValue'");

// 9. Test data structure
console.log("\n9️⃣ VERIFY TABLE DATA:");
const table = document.querySelector('[role="table"]');
if (table) {
  const firstRow = table.querySelector('[role="row"]:nth-child(2)'); // Skip header
  if (firstRow) {
    const cells = firstRow.querySelectorAll('[role="gridcell"]');
    console.log("   First row cells:");
    cells.forEach((cell, idx) => {
      const header = table.querySelectorAll('[role="columnheader"]')[idx];
      console.log(`     ${header?.textContent || `Col ${idx}`}: "${cell.textContent}"`);
    });
  }
}

// 10. Quick fixes to try
console.log("\n🔧 TROUBLESHOOTING STEPS:");
console.log("   1. Hard refresh: Ctrl+F5");
console.log("   2. Clear cache: Ctrl+Shift+Delete");
console.log("   3. Reload page: F5");
console.log("   4. Check DevTools → Console for [DeltaDrawer] messages");
console.log("   5. Monitor formatScaledValue logs for unit calculation");
console.log("   6. Verify Tabulator CDN is accessible");

console.log("\n========== END DIAGNOSTICS ==========\n");

// Export function to test SI prefix calculation
window.testSIPrefix = function(value, scaleFactor = 0.001, unit = "A") {
  const scaled = value * scaleFactor;
  const absScaled = Math.abs(scaled);
  
  let siPrefix = "";
  let divisor = 1;
  
  if (absScaled >= 1e9) { siPrefix = "G"; divisor = 1e9; }
  else if (absScaled >= 1e6) { siPrefix = "M"; divisor = 1e6; }
  else if (absScaled >= 1e3) { siPrefix = "k"; divisor = 1e3; }
  else if (absScaled >= 1) { siPrefix = ""; divisor = 1; }
  else if (absScaled >= 1e-3) { siPrefix = "m"; divisor = 1e-3; }
  else if (absScaled >= 1e-6) { siPrefix = "μ"; divisor = 1e-6; }
  else if (absScaled >= 1e-9) { siPrefix = "n"; divisor = 1e-9; }
  
  const finalValue = scaled / divisor;
  const result = `${finalValue.toFixed(2)} ${siPrefix}${unit}`;
  
  console.log(`✓ testSIPrefix(${value}, ${scaleFactor}, "${unit}") = "${result}"`);
  console.log(`  Steps: ${value} × ${scaleFactor} = ${scaled} → ${absScaled} abs → prefix='${siPrefix}' → ${finalValue.toFixed(2)} ${siPrefix}${unit}`);
  
  return result;
};

console.log("\n💡 AVAILABLE FUNCTIONS:");
console.log("   window.testSIPrefix(value, scaleFactor, unit)");
console.log("   Example: testSIPrefix(1911112, 0.001, 'A')");
console.log("   Should output: 1.91 kA");
