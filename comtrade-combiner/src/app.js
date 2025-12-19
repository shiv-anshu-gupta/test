/**
 * Main Application Logic
 * COMTRADE File Combiner UI and orchestration
 */

import ComtradeFileParser from "./utils/fileParser.js";
import ComtradeCombiner from "./utils/combiner.js";

class ComtradeComberApp {
  constructor() {
    this.selectedFiles = [];
    this.parsedData = [];
    this.groups = [];
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // File input
    document.getElementById("fileInput").addEventListener("change", (e) => {
      this.handleFileSelect(e);
    });

    // Analyze button
    document.getElementById("analyzeBtn").addEventListener("click", () => {
      this.analyzeFiles();
    });

    // Combine button
    document.getElementById("combineBtn").addEventListener("click", () => {
      this.combineFiles();
    });

    // Reset button
    document.getElementById("resetBtn").addEventListener("click", () => {
      this.reset();
    });

    // Modal close
    document.querySelector(".close").addEventListener("click", () => {
      this.closeModal();
    });
  }

  handleFileSelect(event) {
    this.selectedFiles = Array.from(event.target.files);
    this.updateFileList();
    this.updateStatus(`Selected ${this.selectedFiles.length} files`);
  }

  updateFileList() {
    const fileList = document.getElementById("fileList");

    if (this.selectedFiles.length === 0) {
      fileList.innerHTML = '<p class="placeholder">No files selected yet</p>';
      return;
    }

    const pairs = ComtradeFileParser.matchFilePairs(this.selectedFiles);

    if (pairs.length === 0) {
      fileList.innerHTML =
        '<p class="placeholder">No matching .cfg and .dat pairs found</p>';
      return;
    }

    fileList.innerHTML = pairs
      .map(
        (pair, idx) => `
      <div class="file-item">
        <div class="file-info">
          <div class="file-name">Pair ${idx + 1}</div>
          <div class="file-time">${pair.cfg.name} + ${pair.dat.name}</div>
        </div>
        <div class="file-status status-ok">Ready</div>
      </div>
    `
      )
      .join("");
  }

  async analyzeFiles() {
    const pairs = ComtradeFileParser.matchFilePairs(this.selectedFiles);

    if (pairs.length === 0) {
      this.updateStatus("❌ No matching file pairs found");
      return;
    }

    this.updateStatus("Analyzing files...");
    this.parsedData = [];

    try {
      for (const pair of pairs) {
        const cfgData = await ComtradeFileParser.parseCFG(pair.cfg);
        const datData = await ComtradeFileParser.parseDAT(pair.dat);

        this.parsedData.push({
          ...cfgData,
          ...datData,
        });
      }

      // Get settings
      const timeWindow = parseFloat(
        document.getElementById("timeWindow").value
      );
      const removeDuplicates =
        document.getElementById("removeDuplicates").checked;
      const removeSimilar = document.getElementById("removeSimilar").checked;
      const threshold = parseFloat(
        document.getElementById("similarityThreshold").value
      );

      // Group by time window
      this.groups = ComtradeCombiner.groupByTimeWindow(
        this.parsedData,
        timeWindow
      );

      // Display analysis results
      this.displayAnalysisResults(removeDuplicates, removeSimilar, threshold);

      // Enable combine button
      if (this.groups.length > 0) {
        document.getElementById("combineBtn").disabled = false;
      }

      this.updateStatus(
        `✅ Analysis complete: ${this.groups.length} combine group(s) found`
      );
    } catch (error) {
      this.updateStatus(`❌ Error: ${error.message}`);
      console.error(error);
    }
  }

  displayAnalysisResults(removeDuplicates, removeSimilar, threshold) {
    const results = document.getElementById("analysisResults");

    let html = "";

    // Duplicates
    if (removeDuplicates) {
      const duplicates = ComtradeCombiner.findDuplicateChannels(
        this.parsedData
      );
      const duplicateCount = Object.keys(duplicates).length;

      html += `
        <div class="analysis-item">
          <div class="analysis-label">🔍 Duplicate Channels Found</div>
          <div class="analysis-value">${duplicateCount} duplicate(s) detected</div>
        </div>
      `;
    }

    // Similar channels
    if (removeSimilar) {
      const similar = ComtradeCombiner.findSimilarChannels(
        this.parsedData,
        threshold
      );

      html += `
        <div class="analysis-item">
          <div class="analysis-label">📊 Similar Channels Found</div>
          <div class="analysis-value">${
            similar.length
          } similar pair(s) at ${Math.round(threshold * 100)}% threshold</div>
        </div>
      `;
    }

    // Total statistics
    const totalChannels = this.parsedData.reduce(
      (sum, f) => sum + f.channels.length,
      0
    );
    html += `
      <div class="analysis-item">
        <div class="analysis-label">📈 Total Channels</div>
        <div class="analysis-value">${totalChannels} channels across ${this.parsedData.length} files</div>
      </div>
    `;

    results.innerHTML = html || '<p class="placeholder">No analysis data</p>';

    // Display combine groups
    this.displayCombineGroups(removeDuplicates, removeSimilar, threshold);
  }

  displayCombineGroups(removeDuplicates, removeSimilar, threshold) {
    const groupsDiv = document.getElementById("combineGroups");

    if (this.groups.length === 0) {
      groupsDiv.innerHTML = '<p class="placeholder">No groups to display</p>';
      return;
    }

    let html = this.groups
      .map((group, idx) => {
        const combined = ComtradeCombiner.prepareCombinedFile(group, {
          removeDuplicates,
          removeSimilar,
          similarityThreshold: threshold,
        });

        return `
        <div class="group-item">
          <div class="group-title">
            <span>Group ${idx + 1}</span>
            <span class="group-count">${combined.fileCount} file(s)</span>
          </div>
          <div class="group-files">
            ${combined.originalFiles
              .map((f) => `<span class="file-badge">${f}</span>`)
              .join("")}
          </div>
          <div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
            ⏱️ Time span: ${combined.timeSpan.toFixed(2)}s<br>
            📊 Channels: ${combined.totalChannels} → ${
          combined.finalChannelCount
        } (removed: ${combined.duplicatesRemoved + combined.similarRemoved})
          </div>
        </div>
      `;
      })
      .join("");

    groupsDiv.innerHTML = html;
  }

  async combineFiles() {
    const removeDuplicates =
      document.getElementById("removeDuplicates").checked;
    const removeSimilar = document.getElementById("removeSimilar").checked;
    const threshold = parseFloat(
      document.getElementById("similarityThreshold").value
    );

    this.updateStatus("Preparing combined files...");

    try {
      const combinedData = this.groups.map((group, idx) => {
        return ComtradeCombiner.prepareCombinedFile(group, {
          removeDuplicates,
          removeSimilar,
          similarityThreshold: threshold,
        });
      });

      // Show export summary
      this.showExportSummary(combinedData);

      this.updateStatus("✅ Ready to export! Check the modal for details.");
    } catch (error) {
      this.updateStatus(`❌ Error: ${error.message}`);
      console.error(error);
    }
  }

  showExportSummary(combinedData) {
    const modal = document.getElementById("detailsModal");
    const title = document.getElementById("modalTitle");
    const body = document.getElementById("modalBody");

    title.textContent = "📦 Combined Files Summary";

    let html = '<div style="max-height: 500px; overflow-y: auto;">';

    combinedData.forEach((data, idx) => {
      html += `
        <div style="margin-bottom: 20px; padding: 12px; background: var(--bg-tertiary); border-radius: 6px;">
          <h3 style="margin-bottom: 10px; color: var(--primary-color);">Combined File ${
            idx + 1
          }</h3>
          <p><strong>Files:</strong> ${data.originalFiles.join(", ")}</p>
          <p><strong>Start Time:</strong> ${new Date(
            data.startTime
          ).toLocaleString()}</p>
          <p><strong>Time Span:</strong> ${data.timeSpan.toFixed(2)} seconds</p>
          <p><strong>Original Channels:</strong> ${data.totalChannels}</p>
          <p><strong>Duplicates Removed:</strong> ${data.duplicatesRemoved}</p>
          <p><strong>Similar Removed:</strong> ${data.similarRemoved}</p>
          <p><strong style="color: var(--success-color);">Final Channels:</strong> ${
            data.finalChannelCount
          }</p>
          
          <div style="margin-top: 10px;">
            <strong>Merged Channels:</strong>
            <ul style="margin-top: 5px; margin-left: 20px;">
              ${data.mergedChannels
                .slice(0, 5)
                .map((ch) => `<li>${ch.name} (${ch.type})</li>`)
                .join("")}
              ${
                data.mergedChannels.length > 5
                  ? `<li>... and ${data.mergedChannels.length - 5} more</li>`
                  : ""
              }
            </ul>
          </div>
        </div>
      `;
    });

    html += `
      <div style="margin-top: 20px; padding: 12px; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
        <p><strong>Next Step:</strong> This is a preview of what will be combined.</p>
        <p>Implement the actual file export/merge logic here.</p>
        <p>Files would be created with merged data + new CFG/DAT pair.</p>
      </div>
    </div>`;

    body.innerHTML = html;
    modal.classList.add("show");
  }

  updateStatus(text) {
    document.getElementById("statusText").textContent = text;
  }

  closeModal() {
    document.getElementById("detailsModal").classList.remove("show");
  }

  reset() {
    document.getElementById("fileInput").value = "";
    this.selectedFiles = [];
    this.parsedData = [];
    this.groups = [];
    document.getElementById("fileList").innerHTML =
      '<p class="placeholder">No files selected yet</p>';
    document.getElementById("analysisResults").innerHTML =
      '<p class="placeholder">Click "Analyze Files" to see results</p>';
    document.getElementById("combineGroups").innerHTML =
      '<p class="placeholder">Results will appear here</p>';
    document.getElementById("combineBtn").disabled = true;
    this.updateStatus("Ready");
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ComtradeComberApp();
  console.log("COMTRADE File Combiner initialized");
});
