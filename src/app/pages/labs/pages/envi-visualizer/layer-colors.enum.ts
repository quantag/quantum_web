/**
 * Returns the thematic color for a band based on its name.
 * Matches known data products by keyword; falls back to a default purple.
 */

const DEFAULT_COLOR = '#8B5CF6';

const LAYER_COLOR_MAP: Record<string, string> = {
  'DynamicWorld Land Cower [weight]': '#22C55E', // Green       – land use classification
  'OLCI GDMP [kg-ha-day]':           '#16A34A', // Dark Green  – biomass productivity
  'TerraClim WP [mm-month]':         '#3B82F6', // Blue        – precipitation
  'SoilGrid SOC [t-ha]':             '#A16207', // Amber/Brown – soil organic carbon
  'MODIS LST [K]':                   '#EF4444', // Red         – land surface temperature
  'S1 CSAR SSM [%]':                 '#06B6D4', // Cyan        – soil surface moisture
  'SRTM TS [deg]':                   '#6B7280', // Slate Gray  – terrain slope
};

export function getLayerColorByName(name: string): string {
  return LAYER_COLOR_MAP[name] ?? DEFAULT_COLOR;
}

export function getLayerColorThreeByName(name: string): number {
  const hex = getLayerColorByName(name);
  return parseInt(hex.slice(1), 16);
}
