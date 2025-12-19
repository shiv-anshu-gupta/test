// src/components/createDragBar.js
import { createCustomElement } from '../utils/helpers.js';

/**
 * Create a draggable bar for a chart group.
 * @param {Object} group - Group object with indices and colors.
 * @param {Object} cfg - COMTRADE config object.
 * @param {Object} channelState - Channel state object containing color information.
 * @returns {HTMLDivElement} The drag bar element.
 */
export function createDragBar(group, cfg, channelState) {
  const handleDiv = createCustomElement("div", "dragBar");
  handleDiv.setAttribute("draggable", "true");
  handleDiv.style.display = "flex";
  handleDiv.style.flexDirection = "column";
  handleDiv.style.alignItems = "flex-start";
  handleDiv.style.gap = "2px";
  handleDiv.style.whiteSpace = "normal";
  handleDiv.style.wordBreak = "break-word";

  handleDiv.innerHTML = group.indices.map((idx) => {
    // Get color from channelState.analog.lineColors
    let color = channelState.analog.lineColors[idx];
    return (
      `<div class="dragBar-row" style="display:flex;align-items:center;margin-bottom:2px;">` +
      `<span class="dragBar-color" style="display:inline-block;width:14px;height:14px;background:${color};border-radius:3px;margin-right:6px;vertical-align:middle;"></span>` +
      `<span class="dragBar-label" style="vertical-align:middle;">${cfg.analogChannels[idx].id}</span>` +
      `</div>`
    );
  }).join("");
  return handleDiv;
}
