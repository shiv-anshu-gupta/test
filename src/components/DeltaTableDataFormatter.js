/**
 * @file DeltaTableDataFormatter.js
 * @description Pure function to format delta data for table rendering
 */

/**
 * Transform deltaData into table format
 * Consolidates data from multiple charts into a single table
 * @param {Array} deltaData - Array of delta sections (one per chart per pair)
 * @param {number} verticalLinesCount - Number of vertical lines
 * @param {Array} verticalLineTimes - Array of time values for each vertical line
 * @returns {Array} Formatted table data
 */
export function formatTableData(
  deltaData,
  verticalLinesCount,
  verticalLineTimes = []
) {
  if (!Array.isArray(deltaData) || deltaData.length === 0) {
    console.warn("[formatTableData] No delta data to format");
    return [];
  }

  console.log(
    `[formatTableData] Formatting data for ${verticalLinesCount} lines from ${deltaData.length} sections`
  );

  // Build a map: { channelName: { color, v0, v1, v2, ..., delta0, delta1, ..., percentage0, percentage1, ... } }
  const channelMap = new Map();

  // Group sections by their pair index (pairIdx)
  // ✅ CRITICAL FIX: All sections represent the SAME pair index!
  // Multiple sections = multiple charts, NOT multiple pairs
  // Each chart has the same pair (pair 0 when there are 2 vertical lines)
  const pairGroups = {};

  deltaData.forEach((section, sectionIdx) => {
    if (!section.series || !Array.isArray(section.series)) {
      console.warn(
        `[formatTableData] Section ${sectionIdx} has no series data`
      );
      return;
    }

    // ✅ KEY FIX: All sections are from DIFFERENT CHARTS but represent the SAME PAIR
    // The pair index is always 0 (or constant based on verticalLinesCount)
    // Not based on sectionIdx!
    const pairIdx = 0; // All sections share the same pair index!

    if (!pairGroups[pairIdx]) {
      pairGroups[pairIdx] = {
        deltaTime: section.deltaTime || "",
        allSeries: [],
      };
    }

    // Collect ALL series from this section (different chart, same pair)
    section.series.forEach((seriesData) => {
      pairGroups[pairIdx].allSeries.push(seriesData);
    });

    console.log(
      `[formatTableData] Section ${sectionIdx} (Chart ${sectionIdx}): ${section.series.length} channels for pair ${pairIdx}`
    );
  });

  console.log(
    `[formatTableData] Total pair groups: ${Object.keys(pairGroups).length}`
  );

  // ✅ NOW: Process each pair group and build channel map
  Object.entries(pairGroups).forEach(([pairIdx, pairGroup]) => {
    pairIdx = parseInt(pairIdx);

    pairGroup.allSeries.forEach((seriesData) => {
      const channelName = seriesData.name || `Unknown_${pairIdx}`;

      // Initialize channel if not exists
      if (!channelMap.has(channelName)) {
        channelMap.set(channelName, {
          channel: channelName,
          color: seriesData.color || "#6b7280",
        });
        console.log(`[formatTableData] ✨ New channel: ${channelName}`);
      }

      const channelData = channelMap.get(channelName);

      // ✅ FIX: Add v0 value only for the FIRST pair (index 0)
      if (pairIdx === 0 && !channelData.hasOwnProperty("v0")) {
        channelData.v0 = seriesData.v1Formatted || "N/A";
        console.log(
          `[formatTableData] Channel ${channelName}: v0 = ${channelData.v0}`
        );
      }

      // ✅ FIX: Always add v(pairIdx+1) value for this pair
      const vKey = `v${pairIdx + 1}`;
      channelData[vKey] = seriesData.v2Formatted || "N/A";
      console.log(
        `[formatTableData] Channel ${channelName}: ${vKey} = ${channelData[vKey]}`
      );

      // ✅ FIX: Add delta and percentage for this pair
      channelData[`delta${pairIdx}`] = seriesData.deltaFormatted || "N/A";
      channelData[`percentage${pairIdx}`] =
        seriesData.percentage != null ? seriesData.percentage : 0;

      console.log(
        `[formatTableData] Channel ${channelName}: delta${pairIdx} = ${
          channelData[`delta${pairIdx}`]
        }, percentage${pairIdx} = ${channelData[`percentage${pairIdx}`]}%`
      );
    });
  });

  // ✅ FIX: Fill in missing values with "N/A" for channels that don't exist in all charts
  channelMap.forEach((channelData, channelName) => {
    for (let i = 0; i < verticalLinesCount; i++) {
      const vKey = `v${i}`;
      if (!channelData.hasOwnProperty(vKey)) {
        channelData[vKey] = "N/A";
        console.log(
          `[formatTableData] ⚠️ Channel ${channelName}: ${vKey} missing, set to N/A`
        );
      }
    }

    for (let i = 0; i < verticalLinesCount - 1; i++) {
      if (!channelData.hasOwnProperty(`delta${i}`)) {
        channelData[`delta${i}`] = "N/A";
        channelData[`percentage${i}`] = 0;
        console.log(
          `[formatTableData] ⚠️ Channel ${channelName}: delta${i} missing, set to N/A`
        );
      }
    }
  });

  const tableData = Array.from(channelMap.values());

  console.log(
    `[formatTableData] ✅ Consolidated ${
      tableData.length
    } channels with ${verticalLinesCount} value columns and ${
      verticalLinesCount - 1
    } delta pairs`
  );

  // ✅ FIX: Add time row as first row
  const timeRow = {
    channel: "__TIME_ROW__",
    color: "#3b82f6",
  };

  // Add time values
  verticalLineTimes.forEach((timeVal, idx) => {
    timeRow[`v${idx}`] = timeVal;
  });

  // Add delta times - only for the actual delta PAIRS
  for (let i = 0; i < verticalLinesCount - 1; i++) {
    timeRow[`delta${i}`] = deltaData[0]?.deltaTime || "N/A";
    timeRow[`percentage${i}`] = 0; // No percentage for time row
  }

  // Insert time row at the beginning
  tableData.unshift(timeRow);

  return tableData;
}
