/**
 * COMTRADE 2013 File Parser
 * Parses CFG files following the COMTRADE 2013 standard format
 *
 * CFG Format (Line by line):
 * 1. MID = station,device,rev (e.g., "MID=SUBSTATION,RELAY,2013")
 * 2. n_A, n_D = num_analog, num_digital
 * 3-n. Channel definitions (one per line)
 * ... Sample rate lines, timestamp, etc
 */

export class ComtradeFileParser {
  /**
   * Parse COMTRADE 2013 CFG file
   * Supports both ASCII (.cfg) and binary (.dat) COMTRADE files
   * @param {File} cfgFile - The .cfg file
   * @returns {Promise<Object>} Parsed CFG data with all metadata
   */
  static async parseCFG(cfgFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split("\n").filter((line) => line.trim());

          if (lines.length < 2) {
            throw new Error("Invalid CFG file: too few lines");
          }

          // Line 1: MID = station,device,rev (comma-separated)
          const midLine = lines[0];
          let stationName = "Unknown",
            deviceName = "Unknown",
            version = "2013";

          if (midLine.includes("=")) {
            const parts = midLine
              .split("=")[1]
              .split(",")
              .map((s) => s.trim());
            stationName = parts[0] || "Unknown";
            deviceName = parts[1] || "Unknown";
            version = parts[2] || "2013";
          } else {
            const parts = midLine.split(",").map((s) => s.trim());
            stationName = parts[0] || "Unknown";
            deviceName = parts[1] || "Unknown";
            version = parts[2] || "2013";
          }

          // Line 2: n_A,n_D (number of analog and digital channels)
          const channelCountLine = lines[1].split(",").map((s) => s.trim());
          const numAnalog = parseInt(channelCountLine[0]) || 0;
          const numDigital = parseInt(channelCountLine[1]) || 0;
          const totalChannels = numAnalog + numDigital;

          // Lines 3 to (3 + totalChannels - 1): Channel definitions
          const channels = [];
          let lineIdx = 2;

          // Parse analog channels
          for (
            let i = 0;
            i < numAnalog && lineIdx < lines.length;
            i++, lineIdx++
          ) {
            const chLine = lines[lineIdx];
            const chParts = chLine.split(",").map((s) => s.trim());

            // Format: ch_num, ch_name, ph, circuitID, units, a, b, skew, min, max, primary, secondary, PS
            if (chParts.length >= 4) {
              channels.push({
                id: parseInt(chParts[0]) || i + 1,
                name: chParts[1] || `A${i + 1}`,
                unit: chParts[4] || "N/A",
                type: "analog",
                scale: parseFloat(chParts[5]) || 1,
                offset: parseFloat(chParts[6]) || 0,
                min: parseInt(chParts[8]) || 0,
                max: parseInt(chParts[9]) || 0,
              });
            }
          }

          // Parse digital channels
          for (
            let i = 0;
            i < numDigital && lineIdx < lines.length;
            i++, lineIdx++
          ) {
            const chLine = lines[lineIdx];
            const chParts = chLine.split(",").map((s) => s.trim());

            // Format: ch_num, ch_name, ph, circuitID
            if (chParts.length >= 2) {
              channels.push({
                id: parseInt(chParts[0]) || i + 1,
                name: chParts[1] || `D${i + 1}`,
                unit: "N/A",
                type: "digital",
              });
            }
          }

          // Skip some lines and find timestamp
          // Look for timestamp pattern: MM/DD/YYYY,HH:MM:SS.mmmmmm
          let timestamp = new Date();
          let sampleRate = 4800;
          let totalSamples = 0;

          for (let i = lineIdx; i < lines.length; i++) {
            const line = lines[i];

            // Sample rate and count: rate,count (e.g., "4800,62464")
            const rateMatch = line.match(/^(\d+),(\d+)$/);
            if (rateMatch) {
              sampleRate = parseInt(rateMatch[1]);
              totalSamples = parseInt(rateMatch[2]);
              continue;
            }

            // Timestamp: MM/DD/YYYY,HH:MM:SS.mmmmmm
            const tsMatch = line.match(
              /(\d{1,2})\/(\d{1,2})\/(\d{4}),(\d{1,2}):(\d{2}):(\d{2})\.?(\d*)/
            );
            if (tsMatch) {
              const [, mm, dd, yyyy, hh, min, ss, ms] = tsMatch;
              timestamp = new Date(
                parseInt(yyyy),
                parseInt(mm) - 1,
                parseInt(dd),
                parseInt(hh),
                parseInt(min),
                parseInt(ss),
                parseInt((ms || "0").padEnd(3, "0").substring(0, 3))
              );
              break;
            }
          }

          resolve({
            stationName,
            deviceName,
            version,
            timestamp,
            channels,
            numAnalog,
            numDigital,
            totalChannels,
            sampleRate,
            totalSamples,
            fileName: cfgFile.name,
            fileSize: cfgFile.size,
            timespanSeconds: totalSamples / sampleRate,
          });
        } catch (error) {
          reject(new Error(`Failed to parse CFG: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read CFG file"));
      reader.readAsText(cfgFile);
    });
  }

  /**
   * Parse COMTRADE DAT file for file size and sample info
   * @param {File} datFile - The .dat file
   * @returns {Promise<Object>} Sample data info
   */
  static async parseDAT(datFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;

          resolve({
            fileName: datFile.name,
            fileSize: datFile.size,
            isBinary: true,
            byteLength: buffer.byteLength,
          });
        } catch (error) {
          reject(new Error(`Failed to parse DAT: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read DAT file"));
      reader.readAsArrayBuffer(datFile);
    });
  }

  /**
   * Match CFG and DAT files by base name
   * E.g., "test.cfg" matches with "test.dat"
   * @param {File[]} files - Array of selected files
   * @returns {Object[]} Array of { cfg, dat } pairs with parsed data
   */
  static matchFilePairs(files) {
    const pairs = [];
    const cfgFiles = files.filter((f) => f.name.toLowerCase().endsWith(".cfg"));
    const datFiles = files.filter((f) => f.name.toLowerCase().endsWith(".dat"));

    cfgFiles.forEach((cfg) => {
      const baseName = cfg.name.replace(/\.cfg$/i, "");
      const dat = datFiles.find(
        (d) => d.name.replace(/\.dat$/i, "") === baseName
      );
      if (dat) {
        pairs.push({ cfg, dat });
      }
    });

    return pairs;
  }
}

export default ComtradeFileParser;
