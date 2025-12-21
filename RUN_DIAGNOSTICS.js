/**
 * PASTE THIS INTO YOUR BROWSER CONSOLE (F12) TO RUN DIAGNOSTICS
 * 
 * This will:
 * 1. Check if debugLite is disabled
 * 2. Simulate a color change
 * 3. Show you the exact timing breakdown
 * 4. Recommend next steps
 */

console.clear();
console.log('%c🔍 FREEZE DIAGNOSTIC TOOL', 'font-size: 16px; font-weight: bold; color: #0066cc;');
console.log('Checking application performance...\n');

// Check 1: Is debugLite disabled?
try {
  const debugLiteEnabled = window.__DEBUG_LITE_ENABLED; // We'll set this in the app
  console.log('✅ debugLite Status:');
  console.log(`   Enabled: ${debugLiteEnabled ? '🔴 YES (SLOW)' : '🟢 NO (FAST)'}`);
  
  if (debugLiteEnabled) {
    console.warn('   ⚠️ RECOMMENDATION: Disable debugLite by setting debugLite._enabled = false');
  } else {
    console.log('   ✅ Good! Debug logs are disabled.');
  }
} catch (e) {
  console.log('⚠️ Could not check debugLite status');
}

// Check 2: Run a test color change
console.log('\n📊 Simulating color change...');
console.time('[TEST] Color Change Time');

// This will trigger the color subscriber if the app is set up
try {
  if (window.appState && window.appState.channelState) {
    const startTime = performance.now();
    
    // Simulate changing first analog channel color
    if (window.appState.channelState.analog && window.appState.channelState.analog.lineColors) {
      const oldColor = window.appState.channelState.analog.lineColors[0];
      window.appState.channelState.analog.lineColors[0] = '#' + Math.floor(Math.random()*16777215).toString(16);
      
      const elapsed = performance.now() - startTime;
      console.timeEnd('[TEST] Color Change Time');
      
      console.log(`\n📈 RESULTS:`);
      console.log(`   Time: ${elapsed.toFixed(2)}ms`);
      console.log(`   Status: ${
        elapsed > 100 ? '🔴 VERY SLOW (FREEZE)' :
        elapsed > 50 ? '🟡 SLOW' :
        elapsed > 20 ? '🟡 MEDIUM' :
        '🟢 FAST'
      }`);
      
      if (elapsed > 50) {
        console.warn('\n⚠️ Still too slow. Possible causes:');
        console.log('   1. debugLite._enabled = true (disable it)');
        console.log('   2. chart.redraw() is expensive (skip it)');
        console.log('   3. Full chart recreation (check chart._channelIndices)');
      } else {
        console.log('\n✅ Color changes are now FAST!');
      }
      
      // Restore original color
      window.appState.channelState.analog.lineColors[0] = oldColor;
    }
  } else {
    console.log('⚠️ Could not access app state. Make sure it\'s exposed globally.');
    console.log('   Try: window.appState = { channelState, ... }');
  }
} catch (e) {
  console.error('Error running test:', e);
}

// Check 3: Show available diagnostics
console.log('\n🛠️ AVAILABLE DIAGNOSTICS:');
console.log('');
console.log('To enable more detailed logging, set:');
console.log('   debugLite._enabled = true      // Show debug panel (SLOW)');
console.log('   debugLite._enabled = false     // Hide debug panel (FAST)');
console.log('');
console.log('Then watch the [Performance] logs in console when changing colors.');
console.log('');
console.log('🎯 NEXT STEPS:');
console.log('   1. If color changes are still slow (>50ms):');
console.log('      → Open FREEZE_DIAGNOSIS_GUIDE.md for detailed steps');
console.log('   2. If color changes are fast (<20ms):');
console.log('      → Freeze is FIXED! 🎉');
console.log('   3. Want real-time diagnostics?');
console.log('      → Enable debugLite to see debug panel');
console.log('      → But note: it WILL slow things down');

console.log('\n');
console.log('%c✅ Diagnostic complete. Check results above.', 'font-size: 12px; color: #006600;');
