/**
 * colors.js
 * Structured colour-palette resource.
 * Same shape as the design JSON — grouped by usage weight (60/30/10 rule).
 * Import this when you need the whole palette object (e.g. to build a theme).
 */

export const colors = {
  dominant: {
    background_main: "#FFFFFF",
    background_subtle: "#F8FAFC",
    description:
      "60% of layout. Ensures photos are colour-accurate and text is easy to read.",
  },
  secondary: {
    navigation_header: "#0F172A",
    primary_text: "#1E293B",
    supporting_text: "#334155",
    borders: "#E2E8F0",
    description:
      "30% of layout. Establishes law-enforcement level authority and security.",
  },
  accent: {
    emergency_button: "#EA580C",
    alert_badge: "#F97316",
    description:
      "10% of layout. Mirrors AMBER Alert colors for high-priority actions.",
  },
};

export default colors;
