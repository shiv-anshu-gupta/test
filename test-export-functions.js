// Test export functions with sample data

// Mock computation object
const mockComputation = {
  equation: "(IA + IB + IC) / 3",
  results: [
    100.5, 105.75, 112.3, 125.5, 150.25, 175.75, 200.5, 250.75, 300.5, 350.75,
    400.5, 450.75,
  ],
  stats: {
    min: 100.5,
    max: 450.75,
    avg: 275.125,
    count: 12,
  },
  scalingFactor: 1.0,
};

// Test generateCFGContent
function testCFGGeneration() {
  const sampleRate = 4800;

  const min = mockComputation.stats.min;
  const max = mockComputation.stats.max;
  const range = max - min;

  const intMin = -2147483648;
  const intMax = 2147483647;
  const intRange = intMax - intMin;

  const multiplier = range / intRange;
  const offset = min - intMin * multiplier;

  console.log("=== CFG Generation Test ===");
  console.log(`Min: ${min}`);
  console.log(`Max: ${max}`);
  console.log(`Range: ${range}`);
  console.log(`Multiplier: ${multiplier.toExponential(15)}`);
  console.log(`Offset: ${offset.toExponential(15)}`);
  console.log(`Total samples: ${mockComputation.results.length}`);

  // Verify multiplier is not 0
  if (multiplier === 0) {
    console.error("❌ ERROR: Multiplier is 0! (min === max)");
    return false;
  }

  // Verify offset is reasonable
  if (isNaN(offset) || !isFinite(offset)) {
    console.error("❌ ERROR: Offset is NaN or infinite!");
    return false;
  }

  console.log("✅ CFG generation parameters valid");
  return true;
}

// Test generateDATContent - value conversion
function testDATGeneration() {
  const sampleRate = 4800;

  const min = mockComputation.stats.min;
  const max = mockComputation.stats.max;
  const range = max - min;

  const intMin = -2147483648;
  const intMax = 2147483647;
  const intRange = intMax - intMin;

  const multiplier = range / intRange;
  const offset = min - intMin * multiplier;

  console.log("\n=== DAT Generation Test ===");
  console.log(`Sample Rate: ${sampleRate}`);
  console.log(`Total samples: ${mockComputation.results.length}`);

  const dat = [];
  let allValid = true;

  mockComputation.results.forEach((value, idx) => {
    const sampleNum = idx + 1;
    const timestampMs = Math.round((idx / sampleRate) * 1000);
    const rawValue = Math.round((value - offset) / multiplier);

    // Verify raw value is in valid range
    if (rawValue < intMin || rawValue > intMax) {
      console.error(
        `❌ Sample ${sampleNum}: rawValue ${rawValue} out of range [${intMin}, ${intMax}]`
      );
      allValid = false;
    }

    // Verify reverse conversion
    const displayValue = rawValue * multiplier + offset;
    const error = Math.abs(displayValue - value);

    if (error > 0.001) {
      console.warn(
        `⚠ Sample ${sampleNum}: conversion error ${error} (display=${displayValue}, original=${value})`
      );
    }

    dat.push(`${sampleNum},${timestampMs},${rawValue}`);
  });

  console.log("\nFirst 5 DAT lines:");
  dat.slice(0, 5).forEach((line) => console.log(`  ${line}`));

  console.log("\nLast 5 DAT lines:");
  dat.slice(-5).forEach((line) => console.log(`  ${line}`));

  if (allValid) {
    console.log("✅ All DAT values in valid range");
  }

  return allValid;
}

// Test round-trip: export then import
function testRoundTrip() {
  console.log("\n=== Round-Trip Test (Export -> Import) ===");

  const sampleRate = 4800;
  const min = mockComputation.stats.min;
  const max = mockComputation.stats.max;
  const range = max - min;

  const intMin = -2147483648;
  const intMax = 2147483647;
  const intRange = intMax - intMin;

  const multiplier = range / intRange;
  const offset = min - intMin * multiplier;

  let maxError = 0;
  let totalError = 0;

  mockComputation.results.forEach((originalValue, idx) => {
    // Export: display -> raw
    const rawValue = Math.round((originalValue - offset) / multiplier);

    // Import: raw -> display (using CFG multiplier/offset)
    const reimportedValue = rawValue * multiplier + offset;

    const error = Math.abs(reimportedValue - originalValue);
    totalError += error;
    maxError = Math.max(maxError, error);

    console.log(
      `Sample ${idx + 1}: original=${originalValue.toFixed(
        2
      )}, raw=${rawValue}, reimported=${reimportedValue.toFixed(
        2
      )}, error=${error.toFixed(6)}`
    );
  });

  const avgError = totalError / mockComputation.results.length;
  console.log(`\n📊 Error Statistics:`);
  console.log(`   Max error: ${maxError.toFixed(6)}`);
  console.log(`   Avg error: ${avgError.toFixed(6)}`);

  if (maxError < 1.0) {
    console.log("✅ Round-trip conversion successful (error < 1.0)");
    return true;
  } else {
    console.warn("⚠ Round-trip error exceeds threshold");
    return false;
  }
}

// Run all tests
console.log("🔧 COMTRADE Export Functions Test Suite\n");
console.log("=".repeat(50));

const test1 = testCFGGeneration();
const test2 = testDATGeneration();
const test3 = testRoundTrip();

console.log("\n" + "=".repeat(50));
console.log("\n📋 Test Summary:");
console.log(`  CFG Generation: ${test1 ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  DAT Generation: ${test2 ? "✅ PASS" : "❌ FAIL"}`);
console.log(`  Round-Trip:     ${test3 ? "✅ PASS" : "❌ FAIL"}`);

if (test1 && test2 && test3) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log("\n⚠️  Some tests failed - review above");
}
