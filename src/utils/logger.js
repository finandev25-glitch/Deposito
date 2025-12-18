/**
 * Sistema de logging centralizado
 * Solo muestra logs en modo desarrollo
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log normal - solo en desarrollo
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning - solo en desarrollo
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Error - siempre se muestra (importante para producción)
   */
  error: (...args) => {
    console.error(...args);
  },

  /**
   * Debug - solo en desarrollo
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Info - solo en desarrollo
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Grupo de logs - solo en desarrollo
   */
  group: (label, fn) => {
    if (isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Tabla - solo en desarrollo
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

export default logger;
