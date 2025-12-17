/**
 * Opens a MathLive editor popup when channel name is clicked
 * @param {Object} cell - Tabulator cell object
 * @param {Document} doc - Document object
 * @param {Window} win - Window object
 */

// import { createCustomElement } from '../utils/helpers.js';
// /**
//  * ChannelList component: lists all analog and digital channels with drag-and-drop support.
//   * @param {Object} cfg - COMTRADE config object with analogChannels and digitalChannels arrays.
//  * @param {Function} onChannelDrop - Callback(channelType, fromIdx, toIdx) when a channel is reordered.
//  * @returns {HTMLElement} The channel list element.
//  */
// export function createChannelList(cfg, onChannelDrop) {
//   const container = createCustomElement('div');
//   container.className = 'channel-list-container';

//   // Helper to create a list for a channel type
//   function createList(type, channels) {
//     const section = createCustomElement('section');
//     section.className = 'channel-list-section';
//     const title = createCustomElement('h3');
//     title.textContent = type === 'analog' ? 'Analog Channels' : 'Digital Channels';
//     section.appendChild(title);
//     const list = createCustomElement('ul');
//     list.className = 'channel-list';
//     channels.forEach((ch, idx) => {
//       const li = createCustomElement('li');
//       li.className = 'channel-list-item';
//       li.setAttribute('draggable', 'true');
//       // Channel color swatch and color picker
//       const color = ch.color || ch.stroke || ch.displayColor || ch.colour || '#888';
//       const colorBox = createCustomElement('input');
//       colorBox.type = 'color';
//       colorBox.value = color;
//       colorBox.className = 'channel-color-picker';
//       colorBox.style.marginRight = '10px';
//       colorBox.addEventListener('input', (e) => {
//         ch.color = e.target.value;
//         li.style.setProperty('--channel-color', e.target.value);
//         // Use 4th argument for color change
//         if (typeof onChannelDrop === 'function') onChannelDrop(type, idx, idx, e.target.value);
//       });
//       li.appendChild(colorBox);
//       // Channel label
//       const labelSpan = createCustomElement('span');
//       labelSpan.textContent = ch.id || ch.name || `Channel ${idx+1}`;
//       li.appendChild(labelSpan);
//       li.dataset.idx = idx;
//       li.dataset.type = type;
//       // Drag events
//       li.addEventListener('dragstart', e => {
//         e.dataTransfer.effectAllowed = 'move';
//         e.dataTransfer.setData('text/plain', JSON.stringify({ type, idx }));
//         li.classList.add('dragging');
//       });
//       li.addEventListener('dragend', e => {
//         li.classList.remove('dragging');
//       });
//       li.addEventListener('dragover', e => {
//         e.preventDefault();
//         li.classList.add('drag-over');
//       });
//       li.addEventListener('dragleave', e => {
//         li.classList.remove('drag-over');
//       });
//       li.addEventListener('drop', e => {
//         e.preventDefault();
//         li.classList.remove('drag-over');
//         const { type: fromType, idx: fromIdx } = JSON.parse(e.dataTransfer.getData('text/plain'));
//         const toIdx = idx;
//         if (fromType === type && fromIdx !== toIdx) {
//           onChannelDrop(type, parseInt(fromIdx), toIdx);
//         }
//       });
//       list.appendChild(li);
//     });
//     section.appendChild(list);
//     return section;
//   }

//   // Analog channels
//   if (cfg.analogChannels && cfg.analogChannels.length > 0) {
//     container.appendChild(createList('analog', cfg.analogChannels));
//   }
//   // Digital channels
//   if (cfg.digitalChannels && cfg.digitalChannels.length > 0) {
//     container.appendChild(createList('digital', cfg.digitalChannels));
//   }

//   return container;
// }

/**
 * Creates and renders a dynamic, interactive Tabulator-based channel list table UI
 * for managing Analog and Digital channel configurations.
 *
 * The function supports adding, deleting, editing, grouping, undo/redo history,
 * and exporting the table data as a PDF. It also provides real-time callbacks
 * for external update handling.
 *
 * @function createChannelList
 * @param {Object} cfg - Configuration object containing analog and digital channel data.
 * @param {Array<Object>} cfg.analogChannels - List of analog channel objects.
 * @param {Array<Object>} cfg.digitalChannels - List of digital channel objects.
 * @param {Function} [onChannelUpdate] - Optional callback triggered on data changes.
 * @param {("add"|"update"|"delete")} onChannelUpdate.action - The type of update event.
 * @param {Object} onChannelUpdate.data - The affected row’s data.
 * @param {Object} [TabulatorInstance] - Optional custom Tabulator class reference.
 * @param {Document} [doc=document] - Optional document object (used for iframe or testing).
 * @param {Window} [win=window] - Optional window object (used for iframe or testing).
 *
 * @returns {HTMLDivElement} The root container element containing the Tabulator table.
 **/

export function createChannelList(
  cfg,
  onChannelUpdate,
  TabulatorInstance,
  doc = document,
  win = window
) {
  const groupClasses = {
    "Group 1": "bg-pink-100",
    "Group 2": "bg-green-100",
    "Group 3": "bg-blue-100",
  };

  const rootDoc = doc || document;
  const rootWin = win || window;
  console.log("cfg:", cfg);

  const container = rootDoc.createElement("div");
  container.className =
    "channel-list-container rounded-lg shadow p-4 flex flex-col gap-4 transition-colors duration-300 dark:bg-gray-800 text-gray-800 dark:text-gray-100";

  const tableData = [
    ...cfg.analogChannels.map((ch, i) => ({
      id: i + 1,
      type: "Analog",
      name: ch.id || `Analog ${i + 1}`,
      unit: ch.unit || "",
      group: ch.group || "Group",
      color: ch.color || "#888888",
      scale: ch.scale || 1,
      start: ch.start || 0,
      duration: ch.duration || "",
      invert: ch.invert || "",
      isNew: false,
      isUser: false,
    })),
    ...cfg.digitalChannels.map((ch, i) => ({
      id: i + 1,
      type: "Digital",
      name: ch.id || `Digital ${i + 1}`,
      unit: ch.unit || "",
      group: ch.group || "Group",
      color: ch.color || "#888888",
      scale: ch.scale || 1,
      start: ch.start || 0,
      duration: ch.duration || "",
      invert: ch.invert || "",
      isNew: false,
      isUser: false,
    })),
  ];

  const columns = [
    { title: "ID", field: "id", width: 60, hozAlign: "center", responsive: 0 },

    {
      title: "Channel Name (Unit)",
      field: "name",
      headerFilter: "input",
      width: 200,
      resizable: true,
      responsive: 0,
      hozAlign: "center",
      validator: [
        "required",
        {
          type: (cell, value) => {
            // Check for duplicate channel names
            const currentRow = cell.getRow();
            const allRows = cell.getTable().getRows();

            const duplicate = allRows.find((row) => {
              return row !== currentRow && row.getData().name === value;
            });

            return !duplicate;
          },
          parameters: {},
        },
      ],
      validationFailed: (cell, value) => {
        alert(
          `Channel name "${value}" already exists. Please use a unique name.`
        );
      },
      formatter: (cell) => {
        const value = cell.getValue();
        const displayValue = convertLatexToPlainText(value);
        return displayValue || value;
      },
      // cellClick: (e, cell) => {
      //   openMathLiveEditor(cell, rootDoc, rootWin);
      // },
      cellClick: (e, cell) => {
        const rowData = cell.getRow().getData();

        if (!rowData.isUser) {
          console.log("Equation editor disabled for device channels");
          return;
        }

        // ✅ Open editor only for user channels
        openMathLiveEditor(cell, rootDoc, rootWin);
      },
    },

    {
      title: "Color",
      field: "color",
      width: 120,
      hozAlign: "center",
      validator: "required",

      formatter: (cell) => {
        const value = cell.getValue();
        return `<input type="color" value="${value}" class="w-10 h-6 border-none cursor-pointer p-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-400" />`;
      },
      cellClick: (e, cell) => {
        if (e.target.tagName === "INPUT" && e.target.type === "color") {
          e.target.addEventListener(
            "change",
            (evt) => cell.setValue(evt.target.value),
            { once: true }
          );
        }
      },
    },
    {
      title: "Unit",
      field: "unit",
      editor: "input",
      responsive: 1,
      width: 150,
      hozAlign: "center",
      validator: "numeric",
    },
    {
      title: "Group",
      field: "group",
      responsive: 1,
      width: 150,
      hozAlign: "center",
      editor: "list",
      editorParams: {
        autocomplete: true,
        allowEmpty: true,
        listOnEmpty: true,
        values: {
          "Group 1": "Group 1",
          "Group 2": "Group 2",
          "Group 3": "Group 3",
        },
      },
    },
    {
      title: "Scale",
      field: "scale",
      editor: "input",
      headerSort: true,
      responsive: 2,
      width: 150,
      hozAlign: "center",
      validator: "numeric",
    },
    {
      title: "Start",
      field: "start",
      editor: "input",
      responsive: 2,
      width: 150,
      hozAlign: "center",
      validator: "numeric",
    },
    {
      title: "Duration",
      field: "duration",
      editor: "input",
      responsive: 1,
      hozAlign: "center",

      width: 150,
      validator: "numeric",
    },
    {
      title: "Invert",
      field: "invert",
      hozAlign: "center",
      responsive: 1,
      width: 150,
      formatter: (cell) => {
        const value = cell.getValue() === true || cell.getValue() === "true";
        const checked = value ? "checked" : "";
        return `
          <label class="inline-flex items-center cursor-pointer relative">
            <input type="checkbox" class="sr-only peer" ${checked}>
            <div
              class="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-green-500
                     peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400
                     after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                     after:bg-white after:border-gray-300 after:border after:rounded-full
                     after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full
                     peer-checked:after:border-white relative">
            </div>
          </label>
        `;
      },
      cellClick: (e, cell) => {
        const checkbox = e.target.closest("label")?.querySelector("input");
        if (checkbox) {
          const newValue = !checkbox.checked;
          checkbox.checked = newValue;
          cell.setValue(newValue);
        }
      },
    },
    { title: "isNew", field: "isNew", visible: false },
    {
      title: "Delete",
      field: "delete",
      width: 150,
      formatter: () =>
        `<button class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition duration-150">Delete</button>`,
      hozAlign: "center",
      cellClick: (e, cell) => cell.getRow().delete(),
      responsive: 2,
    },
  ];

  const TabulatorClass =
    TabulatorInstance ||
    (typeof rootWin?.Tabulator !== "undefined"
      ? rootWin.Tabulator
      : typeof Tabulator !== "undefined"
      ? Tabulator
      : null);
  if (!TabulatorClass) {
    console.error(
      "Tabulator not available. Please ensure it's loaded in the target window."
    );
    return container;
  }

  const tableDiv = rootDoc.createElement("div");
  tableDiv.id = "channel-root-table";
  tableDiv.className =
    "w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-md dark:bg-gray-800 transition-colors duration-300";
  container.appendChild(tableDiv);

  const table = new TabulatorClass(tableDiv, {
    data: tableData,
    layout: "fitDataStretch",
    responsiveLayout: "collapse",
    responsiveLayoutCollapseStartOpen: false,
    groupBy: "type",
    groupHeader: (value, count) =>
      `<span class="font-semibold text-lg">${value}</span>
       <span class="text-gray-500 dark:text-gray-400 ml-2">(${count} items)</span>`,
    history: true,
    columns,
    resizableColumnFit: true,
    movableColumns: true,
    // movableRows: true,
    pagination: "local",
    paginationSize: 50,
    paginationSizeSelector: [10, 50, 100, true],
    paginationCounter: "rows",
  });

  console.log("Tabulator instance:", table);

  const downloadBtn = doc.getElementById("download-pdf");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      console.log("Downloading PDF...");

      const jsPDFLib =
        rootWin.jspdf || rootWin.jsPDF || window.jspdf || window.jsPDF;

      if (!jsPDFLib || !jsPDFLib.jsPDF) {
        alert("jsPDF not loaded yet. Please wait a second and try again.");
        console.error("jsPDF or autotable not found in popup window.");
        return;
      }

      rootWin.jspdf = jsPDFLib;

      try {
        table.download("pdf", "channel-list.pdf", {
          orientation: "landscape",
          title: "Channel List",
          autoTable: {
            startY: 40,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            margin: { top: 35 },
          },
        });
        console.log("PDF generation triggered successfully.");
      } catch (err) {
        console.error("Error generating PDF:", err);
      }
    });
  } else {
    console.warn("PDF button not found in popup");
  }

  table.on("tableBuilt", () => {
    table.getRows().forEach((row) => {
      const rowEl = row.getElement();
      const grp = row.getData().group;
      const formattedGroup = grp.trim().replace(/^\w/, (c) => c.toUpperCase());

      rowEl.classList.remove("bg-pink-100", "bg-green-100", "bg-blue-100");

      if (groupClasses[formattedGroup])
        rowEl.classList.add(groupClasses[formattedGroup]);
    });
  });

  table.on("cellEdited", (cell) => {
    const row = cell.getRow();
    const data = row.getData();

    if (cell.getField() === "group") {
      const rowEl = row.getElement();
      const newGroup = cell.getValue();
      const formattedGroup = newGroup
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase());

      rowEl.classList.remove("bg-pink-100", "bg-green-100", "bg-blue-100");

      const newClass = groupClasses[formattedGroup];
      if (newClass) rowEl.classList.add(newClass);
    }

    // if (data.isNew && cell.getField() === "name" && data.name.trim()) {
    //   const allRows = table.getRows("active");

    //   const sameTypeRows = allRows.filter(
    //     (r) => r !== row && r.getData().type === data.type && !r.getData().isNew
    //   );

    //   const lastOfType = sameTypeRows[sameTypeRows.length - 1];

    //   if (lastOfType) {
    //     row.update({ isNew: false });
    //     row.move(lastOfType, "after");
    //     const el = row.getElement();
    //     el.classList.add("bg-yellow-100");
    //     setTimeout(() => el.classList.remove("bg-yellow-100"), 800);
    //   }
    // }

    // Ensure new user rows move to the true last position of their group
    // if (data.isNew && cell.getField() === "name" && data.name.trim()) {
    //   // Get all rows of the same type (Analog or Digital)
    //   const typeRows = table
    //     .getRows()
    //     .filter((r) => r.getData().type === data.type);

    //   // Find the true last row of this type
    //   const lastRow = typeRows[typeRows.length - 1];

    //   // Move the newly added row to the bottom (ONLY if it's not already the last)
    //   if (lastRow && lastRow !== row) {
    //     row.update({ isNew: false });
    //     row.move(lastRow, "after");

    //     // Highlight animation
    //     const el = row.getElement();
    //     el.classList.add("bg-yellow-100");
    //     setTimeout(() => el.classList.remove("bg-yellow-100"), 800);
    //   }
    // }

    if (data.isNew && cell.getField() === "name" && data.name.trim()) {
      // Get all rows of the same type AND same group
      const typeGroupRows = table.getRows().filter((r) => {
        const rd = r.getData();
        return rd.type === data.type && rd.group === data.group;
      });

      // Find the true last row of this type+group
      const lastRow = typeGroupRows[typeGroupRows.length - 1];

      // Move the newly added row to the bottom of its type+group (ONLY if it's not already the last)
      if (lastRow && lastRow !== row) {
        row.update({ isNew: false });
        row.move(lastRow, "after");

        // Highlight animation
        const el = row.getElement();
        el.classList.add("bg-yellow-100");
        setTimeout(() => el.classList.remove("bg-yellow-100"), 800);
      } else {
        // Ensure we clear isNew so subsequent edits don't keep trying to move
        row.update({ isNew: false });
      }
    }

    updateUndoRedoButtons();
    if (typeof onChannelUpdate === "function") onChannelUpdate("update", data);
  });

  table.on("rowDeleted", (row) => {
    updateUndoRedoButtons();
    if (typeof onChannelUpdate === "function")
      onChannelUpdate("delete", row.getData());
  });

  table.on("rowAdded", (row) => {
    updateUndoRedoButtons();
    if (typeof onChannelUpdate === "function")
      onChannelUpdate("add", row.getData());
  });

  table.on("tableBuilt", () => {
    container.querySelectorAll(".tabulator-row").forEach((row) => {
      row.classList.add(
        "hover:bg-gray-50",
        "dark:hover:bg-gray-700",
        "hover:bg-gray-50",
        "dark:bg-gray-800",
        // "mb-2",
        "rounded-md",
        "shadow-sm",
        // "p-2",
        "transition-colors",
        "duration-200"
      );
    });
    container.querySelectorAll(".tabulator-cell").forEach((cell) => {
      cell.classList.add("px-4", "py-2", "sm:px-4", "sm:py-2");
    });
    updateUndoRedoButtons();
  });

  table.on("rowAdded", (row) => {
    const el = row.getElement();
    el.classList.add(
      "hover:bg-gray-50",
      "dark:hover:bg-gray-700",
      "hover:bg-gray-50",
      "dark:bg-gray-800",
      // "mb-2",
      "rounded-md",
      "shadow-sm",
      // "p-2",
      "transition-colors",
      "duration-200"
    );
    el.querySelectorAll(".tabulator-cell").forEach((cell) => {
      cell.classList.add("px-4", "py-2", "sm:px-4", "sm:py-2");
    });
    updateUndoRedoButtons();
    if (typeof onChannelUpdate === "function")
      onChannelUpdate("add", row.getData());
  });

  function updateUndoRedoButtons() {
    const undoBtn = rootDoc.getElementById("history-undo");
    const redoBtn = rootDoc.getElementById("history-redo");
    if (undoBtn)
      undoBtn.disabled =
        !table.getHistoryUndoSize || table.getHistoryUndoSize() === 0;
    if (redoBtn)
      redoBtn.disabled =
        !table.getHistoryRedoSize || table.getHistoryRedoSize() === 0;
  }

  const undoBtn = rootDoc.getElementById("history-undo");
  const redoBtn = rootDoc.getElementById("history-redo");
  const addRowBtn = rootDoc.getElementById("add-row");
  const groupSelect = rootDoc.getElementById("group-select");

  undoBtn?.addEventListener("click", () => {
    if (table.undo()) updateUndoRedoButtons();
  });

  redoBtn?.addEventListener("click", () => {
    if (table.redo()) updateUndoRedoButtons();
  });

  addRowBtn?.addEventListener("click", () => {
    const groupType = groupSelect?.value;

    if (!groupType) {
      alert("Please select a channel type (Analog or Digital)");
      return;
    }

    const groupRows = table
      .getRows()
      .filter((r) => r.getData().type === groupType);

    const maxIdForType =
      groupRows.length > 0
        ? Math.max(...groupRows.map((r) => r.getData().id))
        : 0;

    const lastGroupRow = groupRows[groupRows.length - 1];

    const newRow = {
      id: maxIdForType + 1,
      type: groupType,
      name: `${groupType} ${maxIdForType + 1}`,
      unit: "",
      group: "",
      color: "#888888",
      scale: 1,
      start: 0,
      duration: "",
      invert: "",
      isNew: true,
      isUser: true,
    };

    table.addRow(newRow, true).then((row) => {
      const rowEl = row.getElement();
      rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      if (newRow.isUser) {
        const nameCell = row.getCell("name");
        openMathLiveEditor(nameCell, rootDoc, rootWin);
      }
    });
  });

  const keyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      if (table.undo()) updateUndoRedoButtons();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      if (table.redo()) updateUndoRedoButtons();
    }
  };

  rootWin.addEventListener?.("keydown", keyHandler);

  if (rootWin) {
    const cleanup = () => {
      rootWin.removeEventListener?.("keydown", keyHandler);
    };
    rootWin.addEventListener?.("beforeunload", cleanup);
  }

  return container;
}

function openMathLiveEditor(cell, doc, win) {
  const currentValue = cell.getValue() || "";

  const channels = [
    { label: "IA", latex: "IA" },
    { label: "IB", latex: "IB" },
    { label: "IC", latex: "IC" },
    { label: "IN", latex: "IN" },
    { label: "VA", latex: "VA" },
    { label: "VB", latex: "VB" },
    { label: "VC", latex: "VC" },
    { label: "Freq", latex: "\\operatorname{f}" },
  ];

  const operators = [
    { label: "+", latex: "+", className: "operator" },
    { label: "-", latex: "-", className: "operator" },
    { label: "×", latex: "\\cdot", className: "operator" },
    { label: "÷", latex: "\\frac{#0}{#?}", className: "operator" },
    { label: "^", latex: "^{#0}", className: "operator" },
    { label: "(", latex: "(", className: "operator" },
    { label: ")", latex: ")", className: "operator" },
    { label: "==", latex: "=" },
    { label: ">", latex: ">" },
    { label: "<", latex: "<" },
    { label: "RMS()", latex: "\\operatorname{RMS}\\left(#0\\right)" },
    { label: "ABS()", latex: "\\left\\lvert #0 \\right\\rvert" },
    { label: "AVG()", latex: "\\operatorname{AVG}\\left(#0\\right)" },
  ];

  const functions = [
    {
      label: "Mag(I)",
      latex: "\\left\\lvert I \\right\\rvert",
      className: "func",
    },
    { label: "Ang(I)", latex: "\\angle I", className: "func" },
    {
      label: "d/dt",
      latex: "\\frac{d}{dt}\\left(#0\\right)",
      className: "func",
    },
    {
      label: "Trip()",
      latex: "\\operatorname{TRIP}\\left(#0\\right)",
      className: "func",
    },
    {
      label: "Pickup()",
      latex: "\\operatorname{PICKUP}\\left(#0\\right)",
      className: "func",
    },
  ];

  const overlay = doc.createElement("div");
  overlay.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;";

  const modal = doc.createElement("div");
  modal.style.cssText =
    "background:#fff;border-radius:8px;padding:24px;width:700px;max-width:95%;box-shadow:0 4px 16px rgba(0,0,0,0.2);max-height:90vh;overflow-y:auto;position:relative;z-index:10000;";

  const createButtonsHTML = (items, sectionTitle) => {
    return `
      <div style="margin-bottom:16px;">
        <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#555;">${sectionTitle}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${items
            .map(
              (item) => `
            <button class="insert-btn" data-latex="${item.latex.replace(
              /"/g,
              "&quot;"
            )}" 
              style="padding:6px 12px;border:1px solid #ddd;border-radius:4px;background:#f9f9f9;cursor:pointer;font-size:13px;transition:all 0.2s;"
              onmouseover="this.style.background='#e3f2fd';this.style.borderColor='#2196f3';"
              onmouseout="this.style.background='#f9f9f9';this.style.borderColor='#ddd';">
              ${item.label}
            </button>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  };

  modal.innerHTML = `
    <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#333;">Edit Channel Expression</h3>
    
    ${createButtonsHTML(channels, "Channels")}
    ${createButtonsHTML(operators, "Operators")}
    ${createButtonsHTML(functions, "Functions")}
    
    <div style="margin-bottom:16px;">
      <label style="display:block;margin-bottom:8px;font-weight:500;color:#555;">Math Expression:</label>
      <math-field id="math-editor" virtual-keyboard-mode="manual" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:16px;--keyboard-zindex:10001;"></math-field>
    </div>
    
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button id="cancel-btn" style="padding:8px 16px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;">Cancel</button>
      <button id="save-btn" style="padding:8px 16px;border:none;border-radius:4px;background:#22c55e;color:#fff;cursor:pointer;font-size:14px;">Save</button>
    </div>
  `;

  overlay.appendChild(modal);
  doc.body.appendChild(overlay);

  setTimeout(() => {
    const mathField = doc.getElementById("math-editor");

    if (mathField) {
      mathField.value = currentValue;

      modal.querySelectorAll(".insert-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const latex = btn.getAttribute("data-latex");
          mathField.executeCommand(["insert", latex]);
          mathField.focus();
        });
      });

      mathField.focus();
    }

    doc.getElementById("save-btn").addEventListener("click", () => {
      if (mathField) {
        const value = mathField.value.trim();
        if (!value) {
          win.alert("Please enter a value before saving.");
          mathField.focus();
          return;
        }

        // Check for duplicate channel names
        const currentRow = cell.getRow();
        const allRows = cell.getTable().getRows();

        const duplicate = allRows.find((row) => {
          return row !== currentRow && row.getData().name === value;
        });

        if (duplicate) {
          win.alert(
            `Channel name "${value}" already exists. Please use a unique name.`
          );
          mathField.focus();
          return;
        }

        cell.setValue(value);
      }
      doc.body.removeChild(overlay);
    });

    doc.getElementById("cancel-btn").addEventListener("click", () => {
      doc.body.removeChild(overlay);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        doc.body.removeChild(overlay);
      }
    });

    const escHandler = (e) => {
      if (e.key === "Escape" && doc.body.contains(overlay)) {
        doc.body.removeChild(overlay);
        doc.removeEventListener("keydown", escHandler);
      }
    };
    doc.addEventListener("keydown", escHandler);
  }, 100);
}

/**
 * Converts LaTeX expressions to plain text math notation
 * @param {string} latex - LaTeX string to convert
 * @returns {string} Plain text representation
 */
function convertLatexToPlainText(latex) {
  if (!latex) return "";

  let result = latex;

  result = result.replace(/([A-Za-z])_\{([A-Za-z0-9]+)\}/g, "$1$2");

  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  result = result.replace(/\\cdot/g, " × ");

  result = result.replace(/\\operatorname\{([^}]+)\}/g, "$1");

  result = result.replace(/\\left\\lvert/g, "|");
  result = result.replace(/\\right\\rvert/g, "|");
  result = result.replace(/\\left\(/g, "(");
  result = result.replace(/\\right\)/g, ")");

  result = result.replace(/\\angle/g, "∠");

  result = result.replace(/\^\{([^}]+)\}/g, "^$1");

  result = result.replace(/\\/g, "");

  return result;
}
