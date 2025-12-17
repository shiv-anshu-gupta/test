/**
 * Delta Display Window Component
 * Shows detailed delta measurements in a separate popup window
 */

export function createDeltaWindow() {
  let popupWindow = null;

  return {
    show: () => {
      console.log("[DeltaWindow] show() called");
      if (!popupWindow || popupWindow.closed) {
        // Open new popup window
        const windowFeatures =
          "width=550,height=700,resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no";
        popupWindow = window.open("", "DeltaWindow", windowFeatures);

        if (!popupWindow) {
          alert(
            "❌ Failed to open Delta Window. Please check your popup blocker settings."
          );
          return;
        }

        popupWindow.document.title = "Delta Measurements";

        // Set up HTML structure in popup
        popupWindow.document.head.innerHTML = `
          <meta charset="UTF-8">
          <title>Delta Measurements</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              background: #ffffff;
              color: #000;
              font-family: Arial, sans-serif;
              min-height: 100vh;
            }

            .window-container {
              display: flex;
              flex-direction: column;
              height: 100vh;
            }

            .header {
              background: #ffffff;
              padding: 12px;
              border-bottom: 1px solid #ccc;
              font-weight: bold;
              font-size: 14px;
              color: #000;
            }

            .content {
              flex: 1;
              overflow-y: auto;
              padding: 12px;
              background: #ffffff;
            }

            .delta-section {
              margin-bottom: 12px;
              padding: 8px;
              background: #ffffff;
              border-bottom: 1px solid #eee;
            }

            .delta-section-title {
              font-weight: bold;
              font-size: 11px;
              color: #000;
              margin-bottom: 6px;
            }

            .delta-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 4px 0;
              padding: 4px;
              font-size: 12px;
            }

            .delta-label {
              display: flex;
              align-items: center;
              gap: 6px;
              flex: 1;
            }

            .delta-color-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              flex-shrink: 0;
            }

            .delta-value {
              display: flex;
              gap: 16px;
              justify-content: flex-end;
              flex: 1;
            }

            .delta-metric {
              text-align: right;
              font-size: 12px;
            }

            .delta-metric-label {
              font-size: 10px;
              color: #666;
            }

            .delta-metric-value {
              font-weight: bold;
              color: #000;
              font-family: monospace;
            }

            .delta-percentage {
              color: #000;
            }

            .delta-percentage.negative {
              color: #000;
            }

            .delta-time-box {
              background: #ffffff;
              border: 1px solid #ccc;
              padding: 8px;
              margin-bottom: 12px;
              text-align: center;
            }

            .delta-time-label {
              font-size: 10px;
              color: #666;
              margin-bottom: 4px;
            }

            .delta-time-value {
              font-size: 14px;
              font-weight: bold;
              color: #000;
              font-family: monospace;
            }

            .delta-empty {
              text-align: center;
              color: #666;
              padding: 24px 12px;
              font-size: 12px;
            }

            .footer {
              background: #ffffff;
              padding: 8px 12px;
              border-top: 1px solid #ccc;
              font-size: 10px;
              color: #666;
              text-align: center;
            }
          </style>
        `;

        popupWindow.document.body.innerHTML = `
          <div class="window-container">
            <div class="header">Delta Measurements</div>
            <div id="delta-content" class="content">
              <div class="delta-empty">Waiting for vertical lines...</div>
            </div>
            <div class="footer">Position the window where you can see both the chart and measurements</div>
          </div>
        `;
      } else {
        popupWindow.focus();
      }
    },

    hide: () => {
      console.log("[DeltaWindow] hide() called");
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
        popupWindow = null;
      }
    },

    update: (deltaData) => {
      if (!popupWindow || popupWindow.closed) {
        // Window was closed, show it again
        this.show();
      }

      if (popupWindow && !popupWindow.closed) {
        const contentElement =
          popupWindow.document.getElementById("delta-content");
        if (contentElement) {
          updateDeltaWindow(contentElement, deltaData, popupWindow.document);
        }
      }
    },

    clear: () => {
      console.log("[DeltaWindow] clear() called");
      if (popupWindow && !popupWindow.closed) {
        const contentElement =
          popupWindow.document.getElementById("delta-content");
        if (contentElement) {
          contentElement.innerHTML = "";
        }
      }
    },
  };
}

export function updateDeltaWindow(contentElement, deltaData, doc = document) {
  console.log("[updateDeltaWindow] Called with:", {
    hasDeltaData: !!deltaData,
    sections: deltaData ? deltaData.length : 0,
  });

  contentElement.innerHTML = "";

  if (!deltaData || deltaData.length === 0) {
    console.log("[updateDeltaWindow] No delta data, showing empty state");
    contentElement.innerHTML =
      '<div class="delta-empty">No vertical lines created yet.<br>Add lines using Alt+1 on the chart.</div>';
    return;
  }

  console.log("[updateDeltaWindow] Processing delta data sections:", deltaData);

  deltaData.forEach((section, sectionIdx) => {
    console.log(`[updateDeltaWindow] Processing section ${sectionIdx}:`, {
      deltaTime: section.deltaTime,
      seriesCount: section.series ? section.series.length : 0,
    });

    // Time delta box
    if (sectionIdx === 0 || section.deltaTime !== undefined) {
      const timeBox = doc.createElement("div");
      timeBox.className = "delta-time-box";
      timeBox.innerHTML = `
        <div class="delta-time-label">Time Difference (T${sectionIdx + 1} → T${
        sectionIdx + 2
      })</div>
        <div class="delta-time-value">${section.deltaTime}</div>
      `;
      contentElement.appendChild(timeBox);
    }

    // Series deltas
    if (section.series && section.series.length > 0) {
      const seriesSection = doc.createElement("div");
      seriesSection.className = "delta-section";

      const sectionTitle = doc.createElement("div");
      sectionTitle.className = "delta-section-title";
      sectionTitle.textContent = `Line Pair: T${sectionIdx + 1} → T${
        sectionIdx + 2
      }`;
      seriesSection.appendChild(sectionTitle);

      section.series.forEach((seriesData) => {
        const item = doc.createElement("div");
        item.className = "delta-item";

        const label = doc.createElement("div");
        label.className = "delta-label";

        const colorDot = doc.createElement("div");
        colorDot.className = "delta-color-dot";
        colorDot.style.backgroundColor = seriesData.color;

        const seriesName = doc.createElement("span");
        seriesName.textContent = seriesData.name;
        seriesName.style.color = seriesData.color;
        seriesName.style.fontWeight = "500";

        label.appendChild(colorDot);
        label.appendChild(seriesName);

        const valueContainer = doc.createElement("div");
        valueContainer.className = "delta-value";

        // V1 → V2
        const valuesMetric = doc.createElement("div");
        valuesMetric.className = "delta-metric";
        valuesMetric.innerHTML = `
          <div class="delta-metric-label">Values</div>
          <div class="delta-metric-value">${seriesData.v1.toFixed(
            2
          )} → ${seriesData.v2.toFixed(2)}</div>
        `;

        // Delta value
        const deltaMetric = doc.createElement("div");
        deltaMetric.className = "delta-metric";
        deltaMetric.innerHTML = `
          <div class="delta-metric-label">Δ Value</div>
          <div class="delta-metric-value">${seriesData.deltaY.toFixed(2)}</div>
        `;

        // Percentage change
        const percentMetric = doc.createElement("div");
        percentMetric.className = "delta-metric";
        const percentClass =
          seriesData.percentage < 0
            ? "delta-percentage negative"
            : "delta-percentage";
        percentMetric.innerHTML = `
          <div class="delta-metric-label">Δ %</div>
          <div class="${percentClass}">${seriesData.percentage}%</div>
        `;

        valueContainer.appendChild(valuesMetric);
        valueContainer.appendChild(deltaMetric);
        valueContainer.appendChild(percentMetric);

        item.appendChild(label);
        item.appendChild(valueContainer);
        seriesSection.appendChild(item);
      });

      contentElement.appendChild(seriesSection);
    }
  });
}
