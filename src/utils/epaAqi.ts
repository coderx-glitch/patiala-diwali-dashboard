/**
 * US EPA PM2.5 Sub-Index calculation based on official 24-hr PM2.5 breakpoints.
 * Reference: https://aqs.epa.gov/aqsweb/documents/codetables/aqi_breakpoints.html
 * (Updated 2024 / Nov 2026 standard)
 * 
 * Breakpoints (µg/m³ 24-hr mean):
 *  0.0 - 9.0    -> 0 - 50 (Good)
 *  9.1 - 35.4   -> 51 - 100 (Moderate)
 *  35.5 - 55.4  -> 101 - 150 (Unhealthy for Sensitive Groups)
 *  55.5 - 125.4 -> 151 - 200 (Unhealthy)
 *  125.5 - 225.4 -> 201 - 300 (Very Unhealthy)
 *  225.5 - 325.4 -> 301 - 500 (Hazardous)
 *  325.5 - 500.4 -> 501 - 999 (Hazardous)
 *
 * Truncate concentration to 0.1 µg/m³ before calculation per EPA convention.
 * Result rounded to nearest integer.
 */

export interface EpaSubIndexResult {
  aqi: number;
  category: string;
  categoryKey: 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';
  color: string;
  bgColor: string;
  borderColor: string;
}

export const EPA_BREAKPOINTS = [
  { bpLo: 0.0, bpHi: 9.0, iLo: 0, iHi: 50, category: 'Good', key: 'good' as const, color: '#15803d', bgColor: '#dcfce7', borderColor: '#86efac' },
  { bpLo: 9.1, bpHi: 35.4, iLo: 51, iHi: 100, category: 'Moderate', key: 'moderate' as const, color: '#854d0e', bgColor: '#fef9c3', borderColor: '#fde047' },
  { bpLo: 35.5, bpHi: 55.4, iLo: 101, iHi: 150, category: 'Unhealthy for Sensitive Groups', key: 'sensitive' as const, color: '#c2410c', bgColor: '#ffedd5', borderColor: '#fdba74' },
  { bpLo: 55.5, bpHi: 125.4, iLo: 151, iHi: 200, category: 'Unhealthy', key: 'unhealthy' as const, color: '#b91c1c', bgColor: '#fee2e2', borderColor: '#fca5a5' },
  { bpLo: 125.5, bpHi: 225.4, iLo: 201, iHi: 300, category: 'Very Unhealthy', key: 'very_unhealthy' as const, color: '#6b21a8', bgColor: '#f3e8ff', borderColor: '#d8b4fe' },
  { bpLo: 225.5, bpHi: 325.4, iLo: 301, iHi: 500, category: 'Hazardous', key: 'hazardous' as const, color: '#881337', bgColor: '#ffe4e6', borderColor: '#fda4af' },
  { bpLo: 325.5, bpHi: 500.4, iLo: 501, iHi: 999, category: 'Hazardous', key: 'hazardous' as const, color: '#881337', bgColor: '#ffe4e6', borderColor: '#fda4af' },
];

export const EPA_NOTE = "PM2.5-only conversion of a single pollutant; not a measured multi-pollutant AQI.";
export const EPA_LABEL = "US EPA PM2.5 sub-index";
export const CPCB_LABEL = "CPCB PM2.5 sub-index band";

export function calculateEpaSubIndex(pm25: number): EpaSubIndexResult {
  if (pm25 < 0 || isNaN(pm25)) {
    return { aqi: 0, category: 'N/A', categoryKey: 'good', color: '#6b7280', bgColor: '#f3f4f6', borderColor: '#e5e7eb' };
  }
  // Truncate concentration to 0.1 µg/m³ before lookup per EPA convention
  const c = Math.floor(pm25 * 10) / 10;

  for (const bp of EPA_BREAKPOINTS) {
    if (c >= bp.bpLo && c <= bp.bpHi) {
      const aqi = Math.round(((bp.iHi - bp.iLo) / (bp.bpHi - bp.bpLo)) * (c - bp.bpLo) + bp.iLo);
      return {
        aqi,
        category: bp.category,
        categoryKey: bp.key,
        color: bp.color,
        bgColor: bp.bgColor,
        borderColor: bp.borderColor,
      };
    }
  }

  // Beyond highest breakpoint
  return {
    aqi: 500,
    category: 'Hazardous',
    categoryKey: 'hazardous',
    color: '#881337',
    bgColor: '#ffe4e6',
    borderColor: '#fda4af',
  };
}
