import { supabase } from '../supabaseClient.js';

/**
 * Servicio para interactuar con YCloud WhatsApp API usando Supabase Edge Functions
 * Documentación YCloud: https://docs.ycloud.com/reference/whatsapp_message-send-directly
 */
export const yCloudService = {
  /**
   * Envía un mensaje de texto a través de YCloud
   * @param {Object} messageData - Datos del mensaje
   * @param {string} messageData.configId - ID de la configuración YCloud
   * @param {string} messageData.to - Número de destino (formato: +521234567890)
   * @param {string} messageData.text - Texto del mensaje
   * @param {string} [messageData.from] - Número de origen (opcional, usa default de config)
   * @param {string} [messageData.replyToMessageId] - ID del mensaje al que se responde (wamid)
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendTextMessage(messageData) {
    try {
      console.log('🚀 YCloud Service - Enviando mensaje de texto:', {
        configId: messageData.configId,
        to: messageData.to,
        textPreview: messageData.text?.substring(0, 50) + '...',
        replyTo: messageData.replyToMessageId || 'ninguno'
      });

      const bodyData = {
        configId: messageData.configId,
        to: messageData.to,
        from: messageData.from,
        type: 'text',
        text: {
          body: messageData.text,
          previewUrl: messageData.previewUrl || false
        }
      };

      // Agregar contexto de respuesta si se proporciona wamid
      if (messageData.replyToMessageId) {
        bodyData.context = {
          message_id: messageData.replyToMessageId
        };
      }

      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-ycloud-message', {
          body: bodyData
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        console.error('❌ Error en Edge Function:', error);
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        console.error('❌ Error de YCloud API:', data);
        throw new Error(data.error || 'Error desconocido de YCloud API');
      }

      console.log('✅ Mensaje de texto enviado exitosamente:', {
        message_id: data.data?.id,
        status: data.data?.status
      });

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en yCloudService.sendTextMessage:', error);
      return {
        success: false,
        message: `Error enviando mensaje: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje usando un template de WhatsApp
   * @param {Object} messageData - Datos del mensaje
   * @param {string} messageData.configId - ID de la configuración YCloud
   * @param {string} messageData.to - Número de destino
   * @param {Object} messageData.template - Datos del template
   * @param {string} messageData.template.name - Nombre del template
   * @param {string} [messageData.template.language='es'] - Código de idioma
   * @param {Array} [messageData.template.components] - Componentes del template (header, body, buttons)
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendTemplateMessage(messageData) {
    try {
      console.log('🚀 YCloud Service - Enviando mensaje de template:', {
        configId: messageData.configId,
        to: messageData.to,
        templateName: messageData.template?.name
      });

      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-ycloud-message', {
          body: {
            configId: messageData.configId,
            to: messageData.to,
            from: messageData.from,
            type: 'template',
            template: {
              name: messageData.template.name,
              language: messageData.template.language || 'es',
              components: messageData.template.components || []
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        console.error('❌ Error en Edge Function:', error);
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        console.error('❌ Error de YCloud API:', data);
        throw new Error(data.error || 'Error desconocido de YCloud API');
      }

      console.log('✅ Mensaje de template enviado exitosamente:', {
        message_id: data.data?.id,
        status: data.data?.status
      });

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en yCloudService.sendTemplateMessage:', error);
      return {
        success: false,
        message: `Error enviando template: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje con imagen
   * @param {Object} messageData - Datos del mensaje
   * @param {string} messageData.configId - ID de la configuración YCloud
   * @param {string} messageData.to - Número de destino
   * @param {string} messageData.imageUrl - URL de la imagen
   * @param {string} [messageData.caption] - Texto descriptivo de la imagen
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendImageMessage(messageData) {
    try {
      console.log('🚀 YCloud Service - Enviando mensaje con imagen:', {
        configId: messageData.configId,
        to: messageData.to,
        imageUrl: messageData.imageUrl
      });

      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-ycloud-message', {
          body: {
            configId: messageData.configId,
            to: messageData.to,
            from: messageData.from,
            type: 'image',
            image: {
              link: messageData.imageUrl,
              caption: messageData.caption
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Error desconocido de YCloud API');
      }

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en yCloudService.sendImageMessage:', error);
      return {
        success: false,
        message: `Error enviando imagen: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje con documento
   * @param {Object} messageData - Datos del mensaje
   * @param {string} messageData.configId - ID de la configuración YCloud
   * @param {string} messageData.to - Número de destino
   * @param {string} messageData.documentUrl - URL del documento
   * @param {string} [messageData.filename] - Nombre del archivo
   * @param {string} [messageData.caption] - Texto descriptivo
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendDocumentMessage(messageData) {
    try {
      console.log('🚀 YCloud Service - Enviando mensaje con documento:', {
        configId: messageData.configId,
        to: messageData.to,
        documentUrl: messageData.documentUrl
      });

      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-ycloud-message', {
          body: {
            configId: messageData.configId,
            to: messageData.to,
            from: messageData.from,
            type: 'document',
            document: {
              link: messageData.documentUrl,
              filename: messageData.filename,
              caption: messageData.caption
            }
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Error desconocido de YCloud API');
      }

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en yCloudService.sendDocumentMessage:', error);
      return {
        success: false,
        message: `Error enviando documento: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje genérico (para tipos avanzados)
   * @param {Object} messageData - Datos completos del mensaje según API de YCloud
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendMessage(messageData) {
    try {
      console.log('🚀 YCloud Service - Enviando mensaje:', {
        configId: messageData.configId,
        to: messageData.to,
        type: messageData.type
      });

      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-ycloud-message', {
          body: messageData
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        console.error('❌ Error en Edge Function:', error);
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        console.error('❌ Error de YCloud API:', data);
        throw new Error(data.error || 'Error desconocido de YCloud API');
      }

      console.log('✅ Mensaje enviado exitosamente via YCloud:', {
        message_id: data.data?.id,
        status: data.data?.status
      });

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en yCloudService.sendMessage:', error);
      return {
        success: false,
        message: `Error enviando mensaje: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje de prueba
   * @param {string} configId - ID de la configuración YCloud
   * @param {string} toNumber - Número de destino para la prueba
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendTestMessage(configId, toNumber) {
    const testMessage = `Mensaje de prueba desde YCloud

Hora: ${new Date().toLocaleString()}
Sistema: Edge Function YCloud
Estado: Conectado correctamente`;

    return await this.sendTextMessage({
      configId,
      to: toNumber,
      text: testMessage
    });
  },

  /**
   * Obtiene el historial de conversación de un número específico
   * @param {Object} params - Parámetros de búsqueda
   * @param {string} params.configId - ID de la configuración YCloud
   * @param {string} params.phoneNumber - Número de teléfono (formato: +521234567890)
   * @param {string} [params.startDate] - Fecha de inicio (ISO string)
   * @param {string} [params.endDate] - Fecha de fin (ISO string)
   * @param {number} [params.limit] - Límite de mensajes (default: 50)
   * @returns {Promise<Object>} - Respuesta con el historial
   */
  async getConversationHistory(params) {
    try {
      console.log('📞 YCloud Service - Obteniendo historial de conversación:', {
        configId: params.configId,
        phoneNumber: params.phoneNumber,
        startDate: params.startDate,
        endDate: params.endDate
      });

      const { data, error } = await Promise.race([
        supabase.functions.invoke('get-ycloud-conversation', {
          body: {
            configId: params.configId,
            phoneNumber: params.phoneNumber,
            startDate: params.startDate,
            endDate: params.endDate,
            limit: params.limit || 50
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: Edge Function no responde (30s)')), 30000)
        )
      ]);

      if (error) {
        console.error('❌ Error en Edge Function (historial):', error);
        throw new Error(`Error en Edge Function: ${error.message}`);
      }

      if (data && !data.success) {
        console.warn('⚠️ No se pudieron obtener mensajes:', data.message);
        return {
          success: true,
          messages: [],
          message: data.message || 'No hay mensajes disponibles'
        };
      }

      console.log('✅ Historial obtenido exitosamente:', {
        messageCount: data.messages?.length || 0
      });

      return {
        success: true,
        messages: data.messages || [],
        message: data.message || 'Historial obtenido exitosamente'
      };

    } catch (error) {
      console.error('💥 Error obteniendo historial de YCloud:', error);
      return {
        success: false,
        messages: [],
        message: `Error obteniendo historial: ${error.message}`,
        error: error
      };
    }
  }
};

export default yCloudService;
