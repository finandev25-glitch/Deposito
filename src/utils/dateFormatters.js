/**
 * Utilidades centralizadas para formateo de fechas
 */

/**
 * Convierte una fecha a formato ISO local (YYYY-MM-DD) en zona horaria de Lima
 * @param {Date|string} date - Fecha a convertir
 * @returns {string|null} Fecha en formato ISO o null si es inválida
 */
export const toLocalISOString = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;

  // Obtener componentes de fecha en zona horaria de Lima usando Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  // formatToParts devuelve un array con cada componente de la fecha
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;

  return `${year}-${month}-${day}`; // Formato: YYYY-MM-DD
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
 * Formatea fecha corta (DD/MM) en zona horaria de Lima
 * @param {string} isoString - Fecha ISO
 * @returns {string} Fecha formateada "DD/MM" o ""
 */
export const formatShortDate = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  // Usar toLocaleDateString con timezone de Lima para obtener solo la fecha
  const formatted = date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Lima"
  });

  return formatted; // Ya viene en formato DD/MM
};

/**
 * Formatea una fecha DATE (YYYY-MM-DD) a formato corto (DD/MM)
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada "DD/MM" o ""
 */
export const formatShortDateFromDateOnly = (dateString) => {
  if (!dateString) return "";

  // dateString viene como "YYYY-MM-DD" desde la columna DATE de PostgreSQL
  const parts = dateString.split("-");
  if (parts.length !== 3) return "";

  const day = parts[2];
  const month = parts[1];

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
