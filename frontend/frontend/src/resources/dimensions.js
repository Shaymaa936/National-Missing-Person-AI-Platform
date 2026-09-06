/**
 * dimensions.js
 * Layout/sizing tokens used across the app — spacing scale, radii,
 * breakpoints, container widths, font sizes, and fixed component sizes.
 * Keep numeric tokens here so spacing stays consistent everywhere.
 */

export const spacing = {
  xxs: "4px",
  xs: "8px",
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
  xxxl: "64px",
};

export const radius = {
  sm: "8px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  pill: "999px",
};

export const breakpoints = {
  mobile: "480px",
  tablet: "760px",
  laptop: "960px",
  desktop: "1180px",
};

export const container = {
  maxWidth: "1180px",
  narrow: "820px",
  form: "640px",
};

export const fontSize = {
  xs: "12px",
  sm: "13.5px",
  base: "15.5px",
  md: "17px",
  lg: "21px",
  xl: "28px",
  xxl: "36px",
  hero: "44px",
};

export const layout = {
  navHeight: "64px",
  sidebarWidth: "244px",
  cardPhotoAspect: "4 / 5",
  photoBlurAmount: "18px",
};

export const shadow = {
  sm: "0 1px 2px rgba(15,23,42,.08)",
  md: "0 4px 16px rgba(15,23,42,.10)",
  lg: "0 12px 32px rgba(15,23,42,.16)",
};

export default { spacing, radius, breakpoints, container, fontSize, layout, shadow };
