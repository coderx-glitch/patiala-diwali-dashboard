import type { CategoryInfo, CpcbCategory } from '../types/airQuality';

export const CPCB_CATEGORIES: Record<CpcbCategory, CategoryInfo> = {
  Good: {
    label: 'Good',
    range: '0 – 30 µg/m³',
    color: '#15803d',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-700',
    healthAdvisory: 'Minimal health impact; normal outdoor activities encouraged.'
  },
  Satisfactory: {
    label: 'Satisfactory',
    range: '31 – 60 µg/m³',
    color: '#4d7c0f',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-500/40',
    textColor: 'text-lime-700',
    healthAdvisory: 'Minor breathing discomfort to sensitive people; within CPCB 24-hr standard limit.'
  },
  Moderate: {
    label: 'Moderate',
    range: '61 – 90 µg/m³',
    color: '#b45309',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-800',
    healthAdvisory: 'Breathing discomfort to people with lungs, asthma and heart diseases.'
  },
  Poor: {
    label: 'Poor',
    range: '91 – 120 µg/m³',
    color: '#c2410c',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500/40',
    textColor: 'text-orange-800',
    healthAdvisory: 'Breathing discomfort to most people on prolonged exposure.'
  },
  'Very Poor': {
    label: 'Very Poor',
    range: '121 – 250 µg/m³',
    color: '#be123c',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-800',
    healthAdvisory: 'Respiratory illness on prolonged exposure. Significant risk for elders and children.'
  },
  Severe: {
    label: 'Severe',
    range: '> 250 µg/m³',
    color: '#7e22ce',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500/40',
    textColor: 'text-purple-800',
    healthAdvisory: 'Affects healthy people and seriously impacts those with existing diseases. Emergency precautions.'
  }
};

export function getCpcbCategory(pm25: number): CategoryInfo {
  if (pm25 <= 30) return CPCB_CATEGORIES.Good;
  if (pm25 <= 60) return CPCB_CATEGORIES.Satisfactory;
  if (pm25 <= 90) return CPCB_CATEGORIES.Moderate;
  if (pm25 <= 120) return CPCB_CATEGORIES.Poor;
  if (pm25 <= 250) return CPCB_CATEGORIES['Very Poor'];
  return CPCB_CATEGORIES.Severe;
}

export const CPCB_NAAQS_STANDARD = 60; // 24-hr standard (µg/m³)
export const WHO_AIR_QUALITY_GUIDELINE = 15; // 24-hr guideline (µg/m³)
