// Utilidades para manejo de conexión y errores de Supabase

export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting', 
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

export const REALTIME_STATES = {
  SUBSCRIBED: 'SUBSCRIBED',
  CHANNEL_ERROR: 'CHANNEL_ERROR', 
  TIMED_OUT: 'TIMED_OUT',
  CLOSED: 'CLOSED'
};

/**
 * Determina si un error es relacionado con la red/conexión
 * @param {Error} error - El error a evaluar
 * @returns {boolean} - True si es un error de red
 */
export const isNetworkError = (error) => {
  if (!error || !error.message) return false;
  
  const message = error.message.toLowerCase();
  const networkKeywords = [
    'fetch',
    'network', 
    'timeout',
    'failed to fetch',
    'connection',
    'refused',
    'unreachable',
    'offline'
  ];
  
  return networkKeywords.some(keyword => message.includes(keyword));
};

/**
 * Determina si un error es temporal y puede ser reintentado
 * @param {Error} error - El error a evaluar  
 * @returns {boolean} - True si el error puede ser reintentado
 */
export const isRetryableError = (error) => {
  if (!error) return false;
  
  // Errores de red generalmente son reintentables
  if (isNetworkError(error)) return true;
  
  // Códigos de estado HTTP que pueden ser reintentados
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatuses.includes(error.status)) {
    return true;
  }
  
  return false;
};

/**
 * Obtiene un mensaje de error amigable para el usuario
 * @param {Error} error - El error
 * @param {string} context - Contexto donde ocurrió el error
 * @returns {string} - Mensaje amigable
 */
export const getFriendlyErrorMessage = (error, context = '') => {
  if (!error) return 'Error desconocido';
  
  if (isNetworkError(error)) {
    return `Problema de conexión${context ? ` en ${context}` : ''}. Verifica tu internet y reintenta.`;
  }
  
  if (error.message?.includes('timeout')) {
    return `Timeout${context ? ` en ${context}` : ''}. El servidor tardó mucho en responder.`;
  }
  
  if (error.status === 401) {
    return 'Error de autenticación. Inicia sesión nuevamente.';
  }
  
  if (error.status === 403) {
    return 'No tienes permisos para esta operación.';
  }
  
  if (error.status >= 500) {
    return `Error del servidor${context ? ` en ${context}` : ''}. Inténtalo más tarde.`;
  }
  
  // Fallback al mensaje original si no es algo reconocido
  return `Error${context ? ` en ${context}` : ''}: ${error.message}`;
};

/**
 * Implementa un delay exponencial para reintentos
 * @param {number} attempt - Número del intento (empezando en 1)
 * @param {number} baseDelay - Delay base en milisegundos
 * @param {number} maxDelay - Delay máximo en milisegundos
 * @returns {number} - Delay calculado en milisegundos
 */
export const getExponentialBackoffDelay = (attempt, baseDelay = 1000, maxDelay = 30000) => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  // Agregar un poco de jitter para evitar thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.floor(delay + jitter);
};

/**
 * Verifica si el navegador está online
 * @returns {boolean} - True si hay conexión
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Espera a que el navegador esté online
 * @param {number} timeout - Timeout máximo en ms
 * @returns {Promise<boolean>} - Resuelve cuando está online o timeout
 */
export const waitForOnline = (timeout = 30000) => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }
    
    let timeoutId;
    
    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };
    
    window.addEventListener('online', handleOnline);
    
    timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      resolve(false);
    }, timeout);
  });
};

/**
 * Estados para el indicador de conexión
 */
export const getConnectionStatusIcon = (state) => {
  switch (state) {
    case CONNECTION_STATES.CONNECTED:
      return '🟢';
    case CONNECTION_STATES.CONNECTING:
      return '🟡';  
    case CONNECTION_STATES.DISCONNECTED:
      return '🔴';
    case CONNECTION_STATES.ERROR:
      return '❌';
    default:
      return '⚪';
  }
};

export const getConnectionStatusText = (state) => {
  switch (state) {
    case CONNECTION_STATES.CONNECTED:
      return 'Conectado';
    case CONNECTION_STATES.CONNECTING:
      return 'Conectando...';
    case CONNECTION_STATES.DISCONNECTED:
      return 'Desconectado';
    case CONNECTION_STATES.ERROR:
      return 'Error de conexión';
    default:
      return 'Estado desconocido';
  }
};