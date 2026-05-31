/**
 * Production-safe logger
 * Removes console.log statements in production build
 */

const isProd = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => {
    if (!isProd) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (!isProd) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    // Always show warnings
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always show errors
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (!isProd) {
      console.debug(...args);
    }
  }
};
