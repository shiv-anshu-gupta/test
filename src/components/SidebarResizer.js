/**
 * SidebarResizer Component
 * Provides draggable resize handles for sidebars
 * Features:
 * - Horizontal resize handle on LEFT edge
 * - Min width: 280px, Max width: 800px
 * - Persists width to localStorage
 * - Cursor changes to col-resize on hover
 */

export function createSidebarResizer(panelId, side = "left") {
  const panel = document.getElementById(panelId);

  if (!panel) {
    console.warn(`[SidebarResizer] Panel with ID "${panelId}" not found`);
    return;
  }

  // Create resizer handle
  const resizer = document.createElement("div");
  resizer.className =
    "absolute top-0 bottom-0 w-1 bg-gray-300 hover:bg-cyan-500 cursor-col-resize transition-colors duration-200";

  // Position resizer based on side
  if (side === "left") {
    resizer.style.left = "0";
  } else {
    resizer.style.right = "0";
  }

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  // Mouse down - start resizing
  resizer.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  // Mouse move - update width
  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    // Calculate width change (reverse for right-side panels)
    const diff = side === "left" ? e.clientX - startX : startX - e.clientX;

    const newWidth = Math.max(280, Math.min(800, startWidth + diff));
    panel.style.width = `${newWidth}px`;
  });

  // Mouse up - stop resizing and save
  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      // Save to localStorage
      const width = panel.offsetWidth;
      localStorage.setItem(`${panelId}-width`, width);
      console.log(`[SidebarResizer] Saved ${panelId} width: ${width}px`);
    }
  });

  // Restore saved width from localStorage
  const savedWidth = localStorage.getItem(`${panelId}-width`);
  if (savedWidth) {
    const width = Math.max(280, Math.min(800, parseInt(savedWidth, 10)));
    panel.style.width = `${width}px`;
    console.log(`[SidebarResizer] Restored ${panelId} width: ${width}px`);
  }

  // Append resizer to panel
  panel.style.position = "relative";
  panel.appendChild(resizer);

  console.log(`[SidebarResizer] ✅ Resizer created for ${panelId}`);
}
