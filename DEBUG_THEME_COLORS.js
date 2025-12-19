/**
 * DEBUG_THEME_COLORS.js
 *
 * Run this in the browser console to debug the theme color update issue.
 * Copy and paste the entire content into the browser dev tools console.
 *
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this file content
 * 4. Call functions like: debugCharts(), debugDOM(), inspectChartStructure()
 */

console.log("=".repeat(70));
console.log("🔍 COMTRADE Theme Color Debugging Tool");
console.log("=".repeat(70));

/**
 * Inspect the current charts array state
 */
window.debugCharts = function () {
  console.group("📊 Charts Array Inspection");

  try {
    const charts = window.__charts;
    if (!charts) {
      console.error("❌ window.__charts not found!");
      return;
    }

    console.log(`Total charts: ${charts.length}`);

    charts.forEach((chart, idx) => {
      console.group(`Chart ${idx}`);
      console.log("Exists:", !!chart);
      if (chart) {
        console.log("Type:", typeof chart);
        console.log("Has root:", !!chart.root);
        console.log("Root tag:", chart.root ? chart.root.tagName : "N/A");
        console.log("Has data:", !!chart.data);
        console.log("Data length:", chart.data ? chart.data.length : 0);
        console.log("Chart keys:", Object.keys(chart).slice(0, 20));

        // Try to find SVG differently
        const allSVGs = document.querySelectorAll("svg");
        console.log("Total SVGs in DOM:", allSVGs.length);

        if (chart.root && chart.root.tagName === "SVG") {
          const textCount = chart.root.querySelectorAll("text").length;
          const lineCount = chart.root.querySelectorAll("line").length;
          console.log(
            `SVG content - text elements: ${textCount}, line elements: ${lineCount}`
          );
        }
      }
      console.groupEnd();
    });
  } catch (e) {
    console.error("Error:", e);
  }

  console.groupEnd();
};

/**
 * Inspect the DOM structure of charts
 */
window.debugDOM = function () {
  console.group("🌳 DOM Structure");

  try {
    const chartsContainer = document.getElementById("charts");
    if (!chartsContainer) {
      console.error("❌ charts container not found!");
      return;
    }

    console.log("Charts container found ✓");
    console.log("Children count:", chartsContainer.children.length);

    // Find all chart divs
    const chartParents = chartsContainer.querySelectorAll(
      ".chart-parent-container"
    );
    console.log(`Found ${chartParents.length} chart parent containers`);

    chartParents.forEach((parent, idx) => {
      const svg = parent.querySelector("svg");
      const chartDiv = parent.querySelector("[class*='chart-container']");
      console.log(`\nChart ${idx}:`);
      console.log("  - Has SVG:", !!svg);
      if (svg) {
        console.log(
          "    SVG text elements:",
          svg.querySelectorAll("text").length
        );
        console.log(
          "    SVG line elements:",
          svg.querySelectorAll("line").length
        );
        console.log("    SVG viewBox:", svg.getAttribute("viewBox"));
      }
      console.log("  - Chart div:", !!chartDiv);
    });
  } catch (e) {
    console.error("Error:", e);
  }

  console.groupEnd();
};

/**
 * Get current theme colors
 */
window.debugThemeColors = function () {
  console.group("🎨 Theme Colors");

  const computedStyle = getComputedStyle(document.documentElement);
  const textColor = computedStyle.getPropertyValue("--chart-text").trim();
  const gridColor = computedStyle.getPropertyValue("--chart-grid").trim();
  const bgColor = computedStyle.getPropertyValue("--bg-primary").trim();

  console.log("CSS Variables:");
  console.log(`  --chart-text: ${textColor || "(empty)"}`);
  console.log(`  --chart-grid: ${gridColor || "(empty)"}`);
  console.log(`  --bg-primary: ${bgColor || "(empty)"}`);
  console.log(
    `\nTheme appears to be: ${textColor.includes("ffffff") ? "DARK" : "LIGHT"}`
  );

  console.groupEnd();
};

/**
 * Manually test color update on a specific SVG element
 */
window.testUpdateColors = function () {
  console.group("🧪 Manual Color Update Test");

  try {
    const computedStyle = getComputedStyle(document.documentElement);
    const axisColor =
      computedStyle.getPropertyValue("--chart-text").trim() || "#ffffff";
    const gridColor =
      computedStyle.getPropertyValue("--chart-grid").trim() || "#404040";

    console.log(
      `Attempting to update with colors: text=${axisColor}, grid=${gridColor}`
    );

    // Find first SVG
    const svg = document.querySelector("svg");
    if (!svg) {
      console.error("❌ No SVG found in DOM!");
      return;
    }

    console.log("Found SVG, updating text elements...");
    const textEls = svg.querySelectorAll("text");
    console.log(`  Updating ${textEls.length} text elements`);
    textEls.forEach((el) => {
      el.setAttribute("fill", axisColor);
      el.style.fill = axisColor;
    });

    console.log("Updating line elements...");
    const lineEls = svg.querySelectorAll("line");
    console.log(`  Updating ${lineEls.length} line elements`);
    lineEls.forEach((el) => {
      el.setAttribute("stroke", gridColor);
      el.style.stroke = gridColor;
    });

    console.log("✅ Manual update complete - check if colors changed!");
  } catch (e) {
    console.error("Error:", e);
  }

  console.groupEnd();
};

/**
 * Call updateAllChartAxisColors from chartComponent
 */
window.testUpdateAllCharts = function () {
  console.group("🎨 Testing updateAllChartAxisColors");

  try {
    // Try to import the function
    if (window.__updateAllChartAxisColors) {
      window.__updateAllChartAxisColors(window.__charts);
      console.log("✅ Called updateAllChartAxisColors");
    } else {
      console.error("❌ updateAllChartAxisColors not available in window");
      console.log(
        "Available window functions:",
        Object.keys(window).filter((k) => k.includes("chart"))
      );
    }
  } catch (e) {
    console.error("Error:", e);
  }

  console.groupEnd();
};

/**
 * Comprehensive inspection
 */
window.inspectAll = function () {
  console.clear();
  console.log("🔍 COMPLETE SYSTEM INSPECTION\n");
  window.debugCharts();
  window.debugDOM();
  window.debugThemeColors();
  console.log("\n" + "=".repeat(70));
  console.log("Available debug functions:");
  console.log("  • debugCharts() - Inspect charts array");
  console.log("  • debugDOM() - Inspect DOM structure");
  console.log("  • debugThemeColors() - Check theme colors");
  console.log("  • testUpdateColors() - Manual color test on first SVG");
  console.log("  • testUpdateAllCharts() - Call updateAllChartAxisColors");
  console.log("  • inspectAll() - Run everything");
  console.log("=".repeat(70));
};

// Auto-run inspection on load
console.log("\n✅ Debug tools loaded!\n");
console.log("Quick start - run one of these:");
console.log("  • inspectAll()");
console.log("  • debugCharts()");
console.log("  • testUpdateColors()");
console.log("\nThen toggle the theme to see what happens!\n");
