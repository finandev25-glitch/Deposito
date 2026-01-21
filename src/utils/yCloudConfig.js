/**
 * Configuración y utilidades para YCloud WhatsApp API
 * Documentación: https://docs.ycloud.com/reference
 */

// URL base de la API de YCloud
export const YCLOUD_API_BASE_URL = 'https://api.ycloud.com/v2';

/**
 * Endpoints disponibles de YCloud
 */
export const YCLOUD_ENDPOINTS = {
  // Mensajes
  SEND_MESSAGE: '/whatsapp/messages/sendDirectly',

  // Balance
  BALANCE: '/balance',

  // Templates
  TEMPLATES: '/whatsapp/templates',

  // Contactos
  CONTACTS: '/whatsapp/contacts',
};

/**
 * Tipos de mensaje soportados por YCloud
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  TEMPLATE: 'template',
  IMAGE: 'image',
  DOCUMENT: 'document',
  VIDEO: 'video',
  AUDIO: 'audio',
  LOCATION: 'location',
  INTERACTIVE: 'interactive',
  CONTACTS: 'contacts',
  STICKER: 'sticker',
};

/**
 * Categorías de templates de WhatsApp
 */
export const TEMPLATE_CATEGORIES = {
  UTILITY: 'UTILITY',
  MARKETING: 'MARKETING',
  AUTHENTICATION: 'AUTHENTICATION',
};

/**
 * Idiomas comunes para templates
 */
export const TEMPLATE_LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'es_MX', name: 'Español (México)' },
  { code: 'es_AR', name: 'Español (Argentina)' },
  { code: 'en', name: 'English' },
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'pt_BR', name: 'Português (Brasil)' },
  { code: 'pt_PT', name: 'Português (Portugal)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
];

/**
 * Genera los headers para la API de YCloud
 * @param {string} apiKey - API Key de YCloud
 * @returns {Object} - Headers para la petición
 */
export function getYCloudHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': apiKey,
  };
}

/**
 * Construye la URL completa de un endpoint de YCloud
 * @param {string} endpoint - Endpoint (ej: '/whatsapp/messages/sendDirectly')
 * @returns {string} - URL completa
 */
export function buildYCloudUrl(endpoint) {
  return `${YCLOUD_API_BASE_URL}${endpoint}`;
}

/**
 * Formatea un número de teléfono para YCloud (con código de país)
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} [defaultCountryCode='+52'] - Código de país por defecto
 * @returns {string} - Número formateado
 */
export function formatPhoneNumber(phoneNumber, defaultCountryCode = '+52') {
  if (!phoneNumber) return '';

  // Eliminar espacios y caracteres no numéricos excepto +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Si no tiene código de país, agregar el default
  if (!cleaned.startsWith('+')) {
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}

/**
 * Valida el formato de un número de teléfono
 * @param {string} phoneNumber - Número a validar
 * @returns {boolean} - true si es válido
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber) return false;

  // Debe comenzar con + y tener al menos 10 dígitos
  const regex = /^\+\d{10,15}$/;
  return regex.test(phoneNumber.replace(/\s/g, ''));
}

/**
 * Construye el payload para un mensaje de texto
 * @param {string} to - Número de destino
 * @param {string} from - Número de origen
 * @param {string} text - Texto del mensaje
 * @param {boolean} [previewUrl=false] - Mostrar vista previa de URLs
 * @returns {Object} - Payload para la API
 */
export function buildTextMessagePayload(to, from, text, previewUrl = false) {
  return {
    to,
    from,
    type: MESSAGE_TYPES.TEXT,
    text: {
      body: text,
      previewUrl,
    },
  };
}

/**
 * Construye el payload para un mensaje de template
 * @param {string} to - Número de destino
 * @param {string} from - Número de origen
 * @param {string} templateName - Nombre del template
 * @param {string} [language='es'] - Código de idioma
 * @param {Array} [components=[]] - Componentes del template
 * @returns {Object} - Payload para la API
 */
export function buildTemplateMessagePayload(to, from, templateName, language = 'es', components = []) {
  return {
    to,
    from,
    type: MESSAGE_TYPES.TEMPLATE,
    template: {
      name: templateName,
      language: {
        code: language,
      },
      components,
    },
  };
}

/**
 * Construye el payload para un mensaje con imagen
 * @param {string} to - Número de destino
 * @param {string} from - Número de origen
 * @param {string} imageUrl - URL de la imagen
 * @param {string} [caption] - Texto descriptivo
 * @returns {Object} - Payload para la API
 */
export function buildImageMessagePayload(to, from, imageUrl, caption) {
  const payload = {
    to,
    from,
    type: MESSAGE_TYPES.IMAGE,
    image: {
      link: imageUrl,
    },
  };

  if (caption) {
    payload.image.caption = caption;
  }

  return payload;
}

/**
 * Construye el payload para un mensaje con documento
 * @param {string} to - Número de destino
 * @param {string} from - Número de origen
 * @param {string} documentUrl - URL del documento
 * @param {string} [filename] - Nombre del archivo
 * @param {string} [caption] - Texto descriptivo
 * @returns {Object} - Payload para la API
 */
export function buildDocumentMessagePayload(to, from, documentUrl, filename, caption) {
  const payload = {
    to,
    from,
    type: MESSAGE_TYPES.DOCUMENT,
    document: {
      link: documentUrl,
    },
  };

  if (filename) {
    payload.document.filename = filename;
  }

  if (caption) {
    payload.document.caption = caption;
  }

  return payload;
}

/**
 * Construye un componente de header para template
 * @param {string} type - Tipo de header ('text', 'image', 'video', 'document')
 * @param {Object} params - Parámetros del header
 * @returns {Object} - Componente de header
 */
export function buildHeaderComponent(type, params) {
  const component = {
    type: 'header',
    parameters: [],
  };

  switch (type) {
    case 'text':
      component.parameters.push({
        type: 'text',
        text: params.text,
      });
      break;
    case 'image':
      component.parameters.push({
        type: 'image',
        image: { link: params.link },
      });
      break;
    case 'video':
      component.parameters.push({
        type: 'video',
        video: { link: params.link },
      });
      break;
    case 'document':
      component.parameters.push({
        type: 'document',
        document: { link: params.link, filename: params.filename },
      });
      break;
  }

  return component;
}

/**
 * Construye un componente de body para template
 * @param {Array<string>} textParams - Array de strings para los parámetros
 * @returns {Object} - Componente de body
 */
export function buildBodyComponent(textParams) {
  return {
    type: 'body',
    parameters: textParams.map(text => ({
      type: 'text',
      text,
    })),
  };
}

/**
 * Construye un componente de botón para template
 * @param {number} index - Índice del botón (0, 1, 2)
 * @param {string} subType - Subtipo del botón ('url', 'quick_reply', 'copy_code')
 * @param {Object} params - Parámetros del botón
 * @returns {Object} - Componente de botón
 */
export function buildButtonComponent(index, subType, params) {
  const component = {
    type: 'button',
    sub_type: subType,
    index,
    parameters: [],
  };

  switch (subType) {
    case 'url':
      component.parameters.push({
        type: 'text',
        text: params.urlSuffix,
      });
      break;
    case 'copy_code':
      component.parameters.push({
        type: 'coupon_code',
        coupon_code: params.code,
      });
      break;
    case 'quick_reply':
      component.parameters.push({
        type: 'payload',
        payload: params.payload,
      });
      break;
  }

  return component;
}

export default {
  YCLOUD_API_BASE_URL,
  YCLOUD_ENDPOINTS,
  MESSAGE_TYPES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_LANGUAGES,
  getYCloudHeaders,
  buildYCloudUrl,
  formatPhoneNumber,
  isValidPhoneNumber,
  buildTextMessagePayload,
  buildTemplateMessagePayload,
  buildImageMessagePayload,
  buildDocumentMessagePayload,
  buildHeaderComponent,
  buildBodyComponent,
  buildButtonComponent,
};
