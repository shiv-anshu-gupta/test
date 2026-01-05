/**
 * @file DeltaTable.js
 * @description Functional HTML table builder for Delta Drawer
 * Builds table structure from delta data without any DOM manipulation
 */

/**
 * Build table header row with dynamic columns
 * @param {number} verticalLinesCount - Number of vertical lines
 * @param {string[]} verticalLineTimes - Time values for each line
 * @param {string[]} crosshairColors - Array of colors for lines
 * @returns {string} HTML string for <thead>
 */
export function buildTableHeader(
  verticalLinesCount,
  verticalLineTimes,
  crosshairColors
) {
  const columns = [];

  // Column 1: Channel name
  columns.push(`<th class="delta-th delta-th-channel">Channel</th>`);

  // Value columns (one per vertical line)
  for (let i = 0; i < verticalLinesCount; i++) {
    const color = getColorHex(crosshairColors[i % crosshairColors.length]);

    columns.push(`
      <th class="delta-th delta-th-value">
        <div class="delta-th-content">
          
          <span class="delta-th-label" style="color: ${color}">${
      crosshairColors[i % crosshairColors.length].charAt(0).toUpperCase() +
      crosshairColors[i % crosshairColors.length].slice(1)
    } vertical line</span>
        </div>
      </th>
    `);
  }

  // Delta columns (one pair per consecutive lines)
  for (let i = 0; i < verticalLinesCount - 1; i++) {
    const color1 = getColorHex(crosshairColors[i % crosshairColors.length]);
    const color2 = getColorHex(
      crosshairColors[(i + 1) % crosshairColors.length]
    );

    // Delta value column
    columns.push(`
      <th class="delta-th delta-th-delta">
        <div class="delta-th-content">
          <span class="delta-color-dot" style="background-color: ${color1};"></span>
          <span class="delta-arrow">→</span>
          <span class="delta-color-dot" style="background-color: ${color2};"></span>
          <span class="delta-th-label">Δ</span>
        </div>
      </th>
    `);

    // Percentage column
    columns.push(`
      <th class="delta-th delta-th-percentage">
        <div class="delta-th-content">
          <span class="delta-color-dot" style="background-color: ${color1};"></span>
          <span class="delta-arrow">→</span>
          <span class="delta-color-dot" style="background-color: ${color2};"></span>
          <span class="delta-th-label">%</span>
        </div>
      </th>
    `);
  }

  return `<thead><tr>${columns.join("")}</tr></thead>`;
}

/**
 * Build table body rows from delta data
 * @param {Object[]} tableData - Formatted table data
 * @param {number} verticalLinesCount - Number of vertical lines
 * @returns {string} HTML string for <tbody>
 */
export function buildTableBody(tableData, verticalLinesCount) {
  if (!tableData || tableData.length === 0) {
    return `<tbody><tr><td colspan="100" class="delta-empty">No data available</td></tr></tbody>`;
  }

  // ✅ Debug: Log first row to inspect structure
  console.log("[DeltaTable] First row structure:", tableData[0]);
  console.log("[DeltaTable] Total rows:", tableData.length);
  console.log("[DeltaTable] VerticalLinesCount:", verticalLinesCount);

  const rows = tableData.map((row, rowIndex) => {
    const cells = [];
    const isTimeRow = row.channel === "__TIME_ROW__";

    // ✅ Debug: Log values being extracted for first non-time row
    if (rowIndex === 1 || (rowIndex === 0 && !isTimeRow)) {
      console.log(`[DeltaTable] Row ${rowIndex} values:`, {
        channel: row.channel,
        v0: row.v0,
        v1: row.v1,
        delta0: row.delta0,
        percentage0: row.percentage0,
      });
    }

    // Channel name cell
    if (isTimeRow) {
      cells.push(
        `<td class="delta-td delta-td-channel delta-time-row">Time (T)</td>`
      );
    } else {
      cells.push(`
        <td class="delta-td delta-td-channel">
          <div class="delta-channel-content">
            <span class="delta-color-dot" style="background-color: ${row.color};"></span>
            <span class="delta-channel-name">${row.channel}</span>
          </div>
        </td>
      `);
    }

    // Value cells
    for (let i = 0; i < verticalLinesCount; i++) {
      const value = row[`v${i}`] || "N/A";
      const cellClass = isTimeRow
        ? "delta-td-value delta-time-row"
        : "delta-td-value";
      cells.push(`<td class="delta-td ${cellClass}">${value}</td>`);
    }

    // Delta and percentage cells
    for (let i = 0; i < verticalLinesCount - 1; i++) {
      const deltaValue = row[`delta${i}`] || "N/A";
      let percentage =
        row[`percentage${i}`] != null ? row[`percentage${i}`] : 0;

      // Ensure percentage is a number
      if (typeof percentage === "string") {
        percentage = parseFloat(percentage) || 0;
      } else if (typeof percentage !== "number") {
        percentage = 0;
      }

      // Delta cell
      const deltaCellClass = isTimeRow
        ? "delta-td-delta delta-time-row"
        : "delta-td-delta";
      cells.push(`<td class="delta-td ${deltaCellClass}">${deltaValue}</td>`);

      // Percentage cell
      if (isTimeRow) {
        cells.push(
          `<td class="delta-td delta-td-percentage delta-time-row">—</td>`
        );
      } else {
        const percentClass =
          percentage < 0 ? "negative" : percentage > 0 ? "positive" : "zero";
        cells.push(`
          <td class="delta-td delta-td-percentage">
            <span class="delta-percentage ${percentClass}">${percentage.toFixed(
          1
        )}%</span>
          </td>
        `);
      }
    }

    return `<tr class="${
      isTimeRow ? "delta-row-time" : ""
    }" data-row-index="${rowIndex}">${cells.join("")}</tr>`;
  });

  return `<tbody>${rows.join("")}</tbody>`;
}

/**
 * Build complete table HTML
 * @param {Object[]} tableData - Formatted table data
 * @param {number} verticalLinesCount - Number of vertical lines
 * @param {string[]} verticalLineTimes - Time values
 * @param {string[]} crosshairColors - Colors array
 * @returns {string} Complete table HTML
 */
export function buildTableHTML(
  tableData,
  verticalLinesCount,
  verticalLineTimes,
  crosshairColors
) {
  const header = buildTableHeader(
    verticalLinesCount,
    verticalLineTimes,
    crosshairColors
  );
  const body = buildTableBody(tableData, verticalLinesCount);

  return `
    <table class="delta-table">           
      ${header}
      ${body}
    </table>
  `;
}

/**
 * Convert color name to hex
 * @param {string} colorName - Color from crosshairColors
 * @returns {string} Hex color code
 */
function getColorHex(colorName) {
  const colorMap = {
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    magenta: "#d946ef",
    purple: "#a855f7",
    orange: "#f97316",
    brown: "#92400e",
    black: "#000000",
    pink: "#ec4899",
    yellow: "#eab308",
  };
  return colorMap[colorName] || "#6b7280";
}
