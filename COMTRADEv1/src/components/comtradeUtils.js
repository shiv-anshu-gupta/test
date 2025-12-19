/**
 * Parses a COMTRADE .CFG file according to standard format.
 * - Dynamically detects analog and digital channels.
 * - Extracts start date-time, sampling rates, timemult, and (for 2013) time_code, local_code, tmq_code, leapsec.
 * - Adds timeUnit property (default: 'microseconds').
 * 
 * @param {string} cfgText - Raw text content of the .CFG file.
 * @param {string} [timeUnit] - Desired time unit: 'seconds', 'milliseconds', or 'microseconds'.
 * @returns {Object} Parsed configuration { analogChannels, digitalChannels, samplingRates, baseMicroseconds, timemult, timeUnit, ... }
 */
export function parseCFG(cfgText, timeUnit = 'microseconds') {
    const rows = cfgText.split(/\r?\n/);
    const cells = rows.map(row => row.split(",").map(cell => cell.trim()));
    const lastRowEmpty = cells[cells.length - 1].every(cell => cell === "") ? 1 : 0;
    // 1️⃣ Parse Header Information
    const [stationName, deviceID, COMTRADE_rev] = cells[0];
    const [channelCount, analogCount, digitalCount] = [
        Number(cells[1][0]),
        Number(cells[1][1].replace("A", "")),
        Number(cells[1][2].replace("D", ""))
    ];
    const comtrade_revoffset = COMTRADE_rev == "1999" ? 0 : COMTRADE_rev == "2013" ? 2 : 0;

    // 2️⃣ Parse Analog Channels
    const analogChannels = [];
    for (let i = 2; i < 2 + analogCount; i++) {
        const row = cells[i];
        analogChannels.push({
            index: parseInt(row[0]),
            id: row[1],
            phase: row[2],
            component: row[3],
            unit: row[4],
            multiplier: parseFloat(row[5]),
            offset: parseFloat(row[6]),
            skew: parseFloat(row[7]),
            min: parseFloat(row[8]),
            max: parseFloat(row[9]),
            primary: parseFloat(row[10]),
            secondary: parseFloat(row[11]),
            reference: row[12]
        });
    }

    // 3️⃣ Parse Digital Channels
    const digitalChannels = [];
    for (let i = 2 + analogCount; i < 2 + analogCount + digitalCount; i++) {
        const row = cells[i];
        digitalChannels.push({
            index: parseInt(row[0]),
            id: row[1],
            phase: row[2],
            component: row[3],
            normalState: row[4] === '1'
        });
    }

    // 4️⃣ Parse Sampling Rates
    const samplingRates = [];
    const nrates = Number(cells[3 + channelCount][0]);
    if (nrates === 0) {
        const [samp, endsamp] = cells[4 + channelCount].map(Number);
        samplingRates.push({ rate: samp, endSample: endsamp });
    } else {
        for (let i = 0; i < nrates; i++) {
            const [samp, endsamp] = cells[4 + channelCount + i].map(Number);
            samplingRates.push({ rate: samp, endSample: endsamp });
        }
    }

    // 5️⃣ Parse Start Time and Trigger Time
    const timeLines = rows.slice(-4 - lastRowEmpty - comtrade_revoffset, -2 - lastRowEmpty - comtrade_revoffset);
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4},\d{1,2}:\d{1,2}:\d{1,2}\.\d{0,12}$/;
    if (!dateRegex.test(timeLines[0].trim()) || !dateRegex.test(timeLines[1].trim())) {
        throw new Error("Invalid or missing start time and trigger time in CFG file.");
    }

    const parseTime = (timeLine) => {
        const [datePart, timePart] = timeLine.split(',');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hour, minute, secMicro] = timePart.split(':');
        const [second, micro = "000000"] = secMicro.split('.');

        // Convert time components into microseconds
        const totalMicroseconds =
            (((((hour * 60 + minute) * 60) + parseInt(second)) * 1e6) + parseInt(micro.padEnd(6, '0')));

        return {
            totalMicroseconds, // microseconds since midnight
            day,
            month,
            year,
            hour: Number(hour),
            minute: Number(minute),
            second: Number(second),
            microsecond: Number(micro.padEnd(6, '0'))
        };
    };

    const startTimeObj = parseTime(timeLines[0]);
    const triggerTimeObj = parseTime(timeLines[1]);

    // 6️⃣ Parse Time Multiplier and File Type
    const timemult = isNaN(cells[rows.length - 1 - lastRowEmpty - comtrade_revoffset][0]) ? 0 : parseFloat(cells[rows.length - 1 - lastRowEmpty - comtrade_revoffset][0]);
    const ft = cells[rows.length - 2 - lastRowEmpty - comtrade_revoffset][0];

    // 7️⃣ Parse 2013-specific fields: time_code, local_code, tmq_code, leapsec
    let timeCode = null, localCode = null, tmqCode = null, leapSec = null;
    if (COMTRADE_rev == "2013") {
        // time_code, local_code
        const timeCodeLine = rows[rows.length - 1 -1 - lastRowEmpty].split(',').map(s => s.trim());
        timeCode = timeCodeLine[0] || null;
        localCode = timeCodeLine[1] || null;
        // tmq_code, leapsec
        const tmqLine = rows[rows.length - 1 - lastRowEmpty].split(',').map(s => s.trim());
        tmqCode = tmqLine[0] || null;
        leapSec = tmqLine[1] || null;
    }

    // Return Parsed Configuration
    return {
        stationName,
        deviceID,
        COMTRADE_rev,
        analogChannels,
        digitalChannels,
        samplingRates,
        ft,
        baseMicroseconds: startTimeObj.totalMicroseconds,
        startDay: startTimeObj.day,
        startMonth: startTimeObj.month,
        startYear: startTimeObj.year,
        startHour: startTimeObj.hour,
        startMinute: startTimeObj.minute,
        startSecond: startTimeObj.second,
        startMicrosecond: startTimeObj.microsecond,
        timemult,
        timeUnit,
        // 2013-specific fields
        timeCode,
        localCode,
        tmqCode,
        leapSec
    };
}

/**
 * Parses COMTRADE .DAT file.
 * - Supports both ASCII and Binary formats.
 * - Applies timemult for timestamp calculations.
 * - Converts timestamps to selected time unit.
 * 
 * @param {string|Buffer} datContent - Raw content of the .DAT file (string for ASCII, Buffer for Binary).
 * @param {Object} cfg - Parsed CFG object.
 * @param {string} ft - File type, either "ASCII" or "BINARY".
 * @param {string} [timeUnit] - Desired time unit: 'seconds', 'milliseconds', or 'microseconds'.
 * @returns {Object} { time, analogData, digitalData, startDateInfo }
 */
export function parseDAT(datContent, cfg, ft, timeUnit = 'microseconds') {
    const time = [];
  //  console.log(`COMTRADE: Parsing DAT file...`,ft);
    const analogData = cfg.analogChannels.map(() => []);
    const digitalData = cfg.digitalChannels.map(() => []);

    // Helper to convert microseconds to desired unit
    function convertTime(us) {
        if (timeUnit === 'seconds') return us / 1e6;
        if (timeUnit === 'milliseconds') return us / 1e3;
        return us; // microseconds
    }

    // Reference start date/time info from cfg
    const startDateInfo = {
        day: cfg.startDay,
        month: cfg.startMonth,
        year: cfg.startYear,
        hour: cfg.startHour,
        minute: cfg.startMinute,
        second: cfg.startSecond,
        microsecond: cfg.startMicrosecond
    };
    const timemult = cfg.timemult==0?1:cfg.timemult; // Time multiplier from CFG
    //console.log(`COMTRADE: Time Multiplier =`, timemult,cfg.timemult);
    if (ft === "ASCII") {
        // Parse ASCII format
        const lines = datContent.trim().split(/\r?\n/);

        lines.forEach(line => {
            const parts = line.trim().split(',').map(val => val.trim());
            if (parts.length < 2 + cfg.analogChannels.length + cfg.digitalChannels.length) return;

            // Parse sample number and timestamp
            const sampleNumber = parseInt(parts[0]);
            const timestampRaw = parseFloat(parseInt(parts[1],10)); // Convert to float for safety
            const relTimeMicroSec = timestampRaw * timemult;  // Convert to microseconds
            const absUnixTime = cfg.baseMicroseconds + relTimeMicroSec * 1;
           // time.push(convertTime(absUnixTime));
           time.push(relTimeMicroSec); // Store in microseconds for now

            // Parse analog data
            cfg.analogChannels.forEach((ch, idx) => {
                const analogValue = parseFloat(parts[2 + idx]);
                analogData[idx].push(isNaN(analogValue) ? 99999 : analogValue); // Missing values = 99999
            });

            // Parse digital data
            cfg.digitalChannels.forEach((ch, idx) => {
                const digitalValue = parseInt(parts[2 + cfg.analogChannels.length + idx]);
                digitalData[idx].push(digitalValue === 1 ? 1 : 0); // Only valid values are 0 or 1
            });
        });

    } else if (ft === "BINARY") {
        // Parse Binary format using ArrayBuffer and DataView
        const dataView = new DataView(datContent);
        let offset = 0;

        while (offset < dataView.byteLength) {
            // Ensure there is enough data for sample number and timestamp (8 bytes)
            if (offset + 8 > dataView.byteLength) {
                console.error("Insufficient data for sample number and timestamp.");
                break;
            }

            // Parse sample number (4 bytes, unsigned)
            const sampleNumber = dataView.getUint32(offset, true); // Little-endian
            offset += 4;

            // Parse timestamp (4 bytes, unsigned)
            const timestampRaw = dataView.getUint32(offset, true); // Little-endian
            const relTimeSec =  timestampRaw * timemult;
            const absUnixTime = cfg.baseMicroseconds + relTimeSec * 1000;
          //  time.push(convertTime(absUnixTime));
            time.push(relTimeSec);
            offset += 4;

            // Ensure there is enough data for analog channels
            const analogDataSize = cfg.analogChannels.length * 2; // 2 bytes per analog channel
            if (offset + analogDataSize > dataView.byteLength) {
                console.error("Insufficient data for analog channels.");
                break;
            }

            // Parse analog data (2 bytes each, signed)
            cfg.analogChannels.forEach((ch, idx) => {
                const analogValue = dataView.getInt16(offset, true); // Little-endian
                analogData[idx].push(analogValue === -32768 ? 99999 : analogValue); // Missing values = 0x8000
                offset += 2;
            });

            // Ensure there is enough data for digital channels
            const digitalWords = Math.ceil(cfg.digitalChannels.length / 16);
            const digitalDataSize = digitalWords * 2; // 2 bytes per 16 digital channels
            if (offset + digitalDataSize > dataView.byteLength) {
                console.error("Insufficient data for digital channels.");
                break;
            }

            // Parse digital data (grouped in 2 bytes for every 16 channels)
            for (let i = 0; i < digitalWords; i++) {
                const digitalWord = dataView.getUint16(offset, true); // Little-endian
                for (let bit = 0; bit < 16; bit++) {
                    const channelIndex = i * 16 + bit;
                    if (channelIndex < cfg.digitalChannels.length) {
                        const digitalValue = (digitalWord >> bit) & 1;
                        digitalData[channelIndex].push(digitalValue);
                    }
                }
                offset += 2;
            }
        }
    } else {
        throw new Error("Unsupported file type. Must be 'ASCII' or 'BINARY'.");
    }

    // console.log(`COMTRADE-parseDAT: Parsed ${time.length} timestamps.`);
    // console.log(`COMTRADE-parseDAT: Parsed ${analogData.length} analog channels.`);
    // console.log(`COMTRADE-parseDAT: Parsed ${digitalData.length} digital channels.`);
    // console.log("Time=",time,"Analog=",analogData,"Digital=",digitalData);
    return { time, analogData, digitalData, startDateInfo };
}
