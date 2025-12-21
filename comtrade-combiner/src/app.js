/**
 * Main Application Logic
 * COMTRADE File Combiner UI and orchestration
 */

import ComtradeFileParser from "./utils/fileParser.js";
import ComtradeCombiner from "./utils/combiner.js";
import ReportGenerator from "./utils/reportGenerator.js";
import ComtradeDataExporter from "./utils/dataExporter.js";

class ComtradeComberApp {
  constructor() {
    this.selectedFiles = [];
    this.parsedData = [];
    this.groups = [];
    this.report = null;
    this.initializeEventListeners();
    this.initializeTabs();
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

    // Download report button
    const downloadBtn = document.getElementById("downloadReportBtn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        this.downloadReport();
      });
    }
  }

  initializeTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = button.getAttribute("data-tab");

        // Remove active from all buttons and contents
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabContents.forEach((content) => content.classList.remove("active"));

        // Add active to clicked button and corresponding content
        button.classList.add("active");
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
          targetTab.classList.add("active");
        }
      });
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
          fileName: pair.cfg.name.replace(".cfg", ""),
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

      // Generate report
      this.report = ReportGenerator.generateReport(
        this.groups,
        this.parsedData,
        {
          removeDuplicates,
          removeSimilar,
          similarityThreshold: threshold,
          timeWindow,
        }
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
      (sum, f) => sum + (f.channels ? f.channels.length : 0),
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

    // Display detailed report
    this.displayDetailedReport();
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

  displayDetailedReport() {
    const reportDiv = document.getElementById("detailedReport");
    const downloadBtn = document.getElementById("downloadReportBtn");

    if (!this.report) {
      reportDiv.innerHTML = '<p class="placeholder">No report generated</p>';
      return;
    }

    const reportHTML = ReportGenerator.generateHTML(this.report);
    reportDiv.innerHTML = reportHTML;

    // Show download button
    if (downloadBtn) {
      downloadBtn.style.display = "block";
    }
  }

  downloadReport() {
    if (!this.report) return;

    const metadata = ComtradeDataExporter.generateMetadata(this.report);
    const jsonData = JSON.stringify(this.report, null, 2);

    // Create a combined export with both metadata and full report
    const timestamp = new Date().toISOString().slice(0, 10);
    ComtradeDataExporter.downloadFile(
      jsonData,
      `comtrade_combination_report_${timestamp}.json`,
      "application/json"
    );
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
        const combined = ComtradeCombiner.prepareCombinedFile(group, {
          removeDuplicates,
          removeSimilar,
          similarityThreshold: threshold,
        });

        // Add group number for later reference
        combined.groupNumber = idx + 1;
        return combined;
      });

      // Export files
      combinedData.forEach((data) => {
        try {
          const exported = ComtradeDataExporter.exportGroup(
            {
              files: this.report.groups[data.groupNumber - 1].files.map(
                (f) => ({
                  fileName: f.name,
                })
              ),
              startTime: new Date(
                this.report.groups[data.groupNumber - 1].timeSpan.startTime
              ),
              groupNumber: data.groupNumber,
            },
            data.mergedChannels
          );

          // Log export info
          console.log(
            `[combineFiles] Exported group ${data.groupNumber}:`,
            exported.filename
          );
        } catch (err) {
          console.warn(
            `[combineFiles] Could not export CFG/DAT for group ${data.groupNumber}:`,
            err.message
          );
        }
      });

      // Show success message
      this.updateStatus(
        `✅ Combination complete! ${combinedData.length} group(s) processed.`
      );

      // Switch to report tab
      const reportTab = document.querySelector('[data-tab="report"]');
      if (reportTab) {
        reportTab.click();
      }
    } catch (error) {
      this.updateStatus(`❌ Error: ${error.message}`);
      console.error(error);
    }
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
    this.report = null;
    document.getElementById("fileList").innerHTML =
      '<p class="placeholder">No files selected yet</p>';
    document.getElementById("analysisResults").innerHTML =
      '<p class="placeholder">Click "Analyze Files" to see results</p>';
    document.getElementById("combineGroups").innerHTML =
      '<p class="placeholder">Results will appear here</p>';
    document.getElementById("detailedReport").innerHTML =
      '<p class="placeholder">Generate report after combination</p>';
    document.getElementById("previewChart").innerHTML =
      '<p class="placeholder">Preview will appear after combining</p>';
    document.getElementById("combineBtn").disabled = true;
    const downloadBtn = document.getElementById("downloadReportBtn");
    if (downloadBtn) {
      downloadBtn.style.display = "none";
    }
    this.updateStatus("Ready");

    // Switch to files tab
    const filesTab = document.querySelector('[data-tab="files"]');
    if (filesTab) {
      filesTab.click();
    }
  }
}

const app = new ComtradeComberApp();
