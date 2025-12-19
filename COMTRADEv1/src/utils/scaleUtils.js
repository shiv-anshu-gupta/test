import { SI_UNITS } from "./constants.js";

export function getSiPrefix(scale) {
  if (scale === 1e-12) return 'p';
  if (scale === 1e-9) return 'n';
  if (scale === 1e-6) return 'μ';
  if (scale === 1e-3) return 'm';
  if (scale === 1) return '';
  if (scale === 1e3) return 'k';
  if (scale === 1e6) return 'M';
  if (scale === 1e9) return 'G';
  if (scale === 1e12) return 'T';
  return '';
}

export function makeAxisValueFormatter(unit, initialScale = 1) {
  return (ticks) => {
    if (!Array.isArray(ticks)) return [];
    return ticks.map((v) => {
      if (v == null || v === '' || isNaN(v)) return '';
      const scaled = Number(v) * initialScale;
      return siFormat(scaled) + (unit ? ` ${unit}` : '');
    });
  };
}