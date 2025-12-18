/**
 * Utilidades centralizadas para formateo de fechas
 */

/**
 * Convierte una fecha a formato ISO local (YYYY-MM-DD)
 * @param {Date|string} date - Fecha a convertir
 * @returns {string|null} Fecha en formato ISO o null si es inválida
 */
export const toLocalISOString = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Formatea fecha y hora completa con segundos
 * @param {string} isoString - Fecha ISO
 * @returns {string} Fecha formateada "DD/MM/YYYY, HH:MM:SS" o "-"
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return "-";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

/**
 * Formatea solo la fecha (sin hora)
 * @param {string} isoString - Fecha ISO
 * @returns {string} Fecha formateada "DD/MM/YYYY" o "N/A"
 */
export const formatDate = (isoString) => {
  if (!isoString) return "N/A";

  const date = new Date(isoString.split("T")[0].replace(/-/g, "/"));
  if (isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Formatea fecha corta (DD/MM)
 * @param {string} isoString - Fecha ISO
 * @returns {string} Fecha formateada "DD/MM" o ""
 */
export const formatShortDate = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
};

/**
 * Exportar todas las utilidades como objeto
 */
export const dateFormatters = {
  toLocalISOString,
  formatDateTime,
  formatDate,
  formatShortDate,
};

export default dateFormatters;
