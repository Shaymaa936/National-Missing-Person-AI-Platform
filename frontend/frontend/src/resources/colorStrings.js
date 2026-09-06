/**
 * colorStrings.js
 * Flat, named string constants for every colour in the palette.
 * Use these directly in inline styles / styled-components / CSS-in-JS
 * when you just need a single hex value instead of the whole object.
 */

// Dominant — 60% of layout (backgrounds, base surfaces)
export const COLOR_BACKGROUND_MAIN = "#FFFFFF";
export const COLOR_BACKGROUND_SUBTLE = "#F8FAFC";

// Secondary — 30% of layout (authority / structure / text)
export const COLOR_NAVIGATION_HEADER = "#0F172A";
export const COLOR_PRIMARY_TEXT = "#1E293B";
export const COLOR_SUPPORTING_TEXT = "#334155";
export const COLOR_BORDER = "#E2E8F0";

// Accent — 10% of layout (high-priority / emergency actions)
export const COLOR_EMERGENCY_BUTTON = "#EA580C";
export const COLOR_ALERT_BADGE = "#F97316";

// Convenience: everything as one frozen lookup map, keyed the same as above
export const COLOR_STRINGS = Object.freeze({
  backgroundMain: COLOR_BACKGROUND_MAIN,
  backgroundSubtle: COLOR_BACKGROUND_SUBTLE,
  navigationHeader: COLOR_NAVIGATION_HEADER,
  primaryText: COLOR_PRIMARY_TEXT,
  supportingText: COLOR_SUPPORTING_TEXT,
  border: COLOR_BORDER,
  emergencyButton: COLOR_EMERGENCY_BUTTON,
  alertBadge: COLOR_ALERT_BADGE,
});
