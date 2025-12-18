// Configuración de URLs para desarrollo y producción

/**
 * Obtiene la URL base para las APIs según el entorno
 * En desarrollo: usa el proxy de Vite (funciona en cualquier puerto)
 * En producción: usa la URL directa de Chatwoot
 */
export const getChatwootApiUrl = () => {
  const isDev = import.meta.env.DEV;
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  console.log('🔧 Configuración Chatwoot:', {
    isDev,
    hostname,
    port,
    fullLocation: window.location.href
  });
  
  // En desarrollo, usar el proxy de Vite (relativo al host actual)
  if (isDev) {
    console.log('✅ Usando proxy de desarrollo: /chatwoot-api');
    return '/chatwoot-api';
  }
  
  // En producción, verificar si estamos en localhost para desarrollo local
  const isLocalhost = hostname === 'localhost' || 
                     hostname === '127.0.0.1' ||
                     hostname.startsWith('192.168.') ||
                     hostname.startsWith('10.') ||
                     hostname.endsWith('.local');
  
  if (isLocalhost) {
    // En desarrollo local, usar proxy relativo
    console.log('✅ Detectado localhost, usando proxy local: /chatwoot-api');
    return '/chatwoot-api';
  }
  
  // En producción real, usar la URL configurada en variables de entorno o fallback
  const prodUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://chatwoot-chatwoot.gnfcio.easypanel.host';
  console.log('🌐 Usando URL de producción:', prodUrl);
  return prodUrl;
};

/**
 * Construye una URL completa para la API de Chatwoot
 * @param {string} endpoint - El endpoint de la API (ej: '/api/v1/accounts/1/conversations')
 * @returns {string} - URL completa
 */
export const buildChatwootApiUrl = (endpoint) => {
  const baseUrl = getChatwootApiUrl();
  // Asegurar que el endpoint empiece con /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;
  
  console.log('🔗 URL construida:', {
    baseUrl,
    endpoint,
    cleanEndpoint,
    fullUrl
  });
  
  return fullUrl;
};

/**
 * Obtiene la URL base para el dashboard web de Chatwoot
 * @returns {string} - URL del dashboard
 */
export const getChatwootWebUrl = () => {
  return import.meta.env.VITE_CHATWOOT_BASE_URL || 'https://chatwoot-chatwoot.gnfcio.easypanel.host';
};

/**
 * Construye la URL del dashboard para una conversación específica
 * @param {string|number} accountId - ID de la cuenta
 * @param {string|number} conversationId - ID de la conversación  
 * @returns {string} - URL del dashboard
 */
export const buildChatwootWebUrl = (accountId, conversationId) => {
  const baseUrl = getChatwootWebUrl();
  return `${baseUrl}/app/accounts/${accountId}/conversations/${conversationId}`;
};

/**
 * Configuración para requests a la API de Chatwoot
 * @param {string} apiToken - Token de acceso a la API
 * @returns {Object} - Headers para fetch
 */
export const getChatwootApiHeaders = (apiToken) => {
  return {
    'api_access_token': apiToken,
    'Content-Type': 'application/json',
  };
};

/**
 * Log de configuración para debugging
 */
export const logApiConfiguration = () => {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.startsWith('192.168.') ||
                     window.location.hostname.startsWith('10.') ||
                     window.location.hostname.endsWith('.local');
  
  console.log('🔧 Configuración de API Chatwoot:', {
    environment: import.meta.env.DEV ? 'development' : 'production',
    hostname: window.location.hostname,
    port: window.location.port,
    fullUrl: window.location.href,
    isLocalhost: isLocalhost,
    apiBaseUrl: getChatwootApiUrl(),
    webBaseUrl: getChatwootWebUrl(),
    chatwootEnvVar: import.meta.env.VITE_CHATWOOT_BASE_URL,
  });
};