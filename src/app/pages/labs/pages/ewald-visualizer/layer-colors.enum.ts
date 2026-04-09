/**
 * Returns the thematic color for a band based on its name.
 * Matches known data products by keyword; falls back to a default purple.
 */

const DEFAULT_COLOR = '#9CA3AF'; // Gray (Slate 400)

const LAYER_COLOR_MAP: Record<string, string> = {
  'DynamicWorld water [prob]':         '#3B82F6', // Blue
  'DynamicWorld trees [prob]':         '#15803D', // Green-700
  'DynamicWorld grass [prob]':         '#86EFAC', // Green-300
  'DynamicWorld flooded_veg [prob]':   '#8B5CF6', // Violet
  'DynamicWorld crops [prob]':         '#EAB308', // Yellow
  'DynamicWorld shrub_scrub [prob]':   '#A16207', // Amber-700
  'DynamicWorld built [prob]':         '#EF4444', // Red
  'DynamicWorld bare [prob]':          '#D1D5DB', // Gray-300
  'DynamicWorld snow_ice [prob]':      '#FFFFFF', // White
  'OLCI GDMP [kg-ha-day]':             '#16A34A', // Dark Green
  'TerraClim WP [mm-month]':           '#3B82F6', // Blue
  'SoilGrid SOC [t-ha]':               '#A16207', // Amber/Brown
  'MODIS LST [K]':                     '#EF4444', // Red
  'S1 CSAR SSM [%]':                   '#06B6D4', // Cyan
  'SRTM TS [deg]':                     '#6B7280', // Slate Gray
};

export function getLayerColorByName(name: string): string {
  return LAYER_COLOR_MAP[name] ?? DEFAULT_COLOR;
}

export function getLayerColorThreeByName(name: string): number {
  const hex = getLayerColorByName(name);
  return parseInt(hex.slice(1), 16);
}