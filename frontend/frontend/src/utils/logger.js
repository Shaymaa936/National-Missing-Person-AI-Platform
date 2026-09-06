// Dev-only console logger.
// In production builds (npm run build), import.meta.env.DEV is false,
// so these become no-ops and nothing prints to the browser console.

export const devLog = (...args) => {
  if (import.meta.env.DEV) console.log(...args);
};

export const devError = (...args) => {
  if (import.meta.env.DEV) console.error(...args);
};

export const devWarn = (...args) => {
  if (import.meta.env.DEV) console.warn(...args);
};
