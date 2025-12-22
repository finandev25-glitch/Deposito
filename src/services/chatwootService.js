import { supabase } from '../supabaseClient.js';

/**
 * Servicio para interactuar con ChatWoot usando Supabase Edge Functions
 * Esto resuelve problemas de CORS en producción
 */
export const chatwootService = {
  /**
   * Obtiene datos de ChatWoot (mensajes, conversaciones, etc.)
   * @param {Object} requestData - Datos de la petición
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async getChatwootData(requestData) {
    try {
      console.log('🔍 ChatWoot Service - Obteniendo datos via Edge Function:', {
        configId: requestData.configId,
        endpoint: requestData.endpoint,
        method: requestData.method || 'GET'
      });

      // Llamar a la Edge Function de Supabase
      const { data, error } = await Promise.race([
        supabase.functions.invoke('get-chatwoot-data', {
          body: {
            configId: requestData.configId,
            endpoint: requestData.endpoint,
            method: requestData.method || 'GET',
            body: requestData.body || null
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

      // La Edge Function puede devolver un error en el data
      if (data && !data.success) {
        console.error('❌ Error de ChatWoot API:', data);
        throw new Error(data.error || 'Error desconocido de ChatWoot API');
      }

      console.log('✅ Datos obtenidos exitosamente via Edge Function');

      return {
        success: true,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en chatwootService.getChatwootData:', error);

      return {
        success: false,
        message: `Error obteniendo datos: ${error.message}`,
        error: error
      };
    }
  },
  /**
   * Envía un mensaje a ChatWoot a través de Supabase Edge Function
   * @param {Object} messageData - Datos del mensaje
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendMessage(messageData) {
    try {
      console.log('🚀 ChatWoot Service - Enviando mensaje via Edge Function:', {
        configId: messageData.configId,
        conversationId: messageData.conversationId,
        content: messageData.content?.substring(0, 50) + '...',
        messageType: messageData.messageType
      });

      // Llamar a la Edge Function de Supabase con timeout
      const { data, error } = await Promise.race([
        supabase.functions.invoke('send-chatwoot-message', {
          body: {
            configId: messageData.configId,
            conversationId: messageData.conversationId,
            content: messageData.content,
            messageType: messageData.messageType || 'outgoing',
            private: messageData.private || false,
            contentType: messageData.contentType || 'text',
            contentAttributes: messageData.contentAttributes || {},
            campaignId: messageData.campaignId,
            templateParams: messageData.templateParams
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

      // La Edge Function puede devolver un error en el data
      if (data && !data.success) {
        console.error('❌ Error de ChatWoot API:', data);
        throw new Error(data.error || 'Error desconocido de ChatWoot API');
      }

      console.log('✅ Mensaje enviado exitosamente via Edge Function:', {
        message_id: data.data?.id,
        status: data.data?.status
      });

      return {
        success: true,
        message: data.message,
        data: data.data
      };

    } catch (error) {
      console.error('💥 Error en chatwootService.sendMessage:', error);
      
      return {
        success: false,
        message: `Error enviando mensaje: ${error.message}`,
        error: error
      };
    }
  },

  /**
   * Envía un mensaje de prueba a ChatWoot
   * @param {string} configId - ID de la configuración ChatWoot
   * @param {string} conversationId - ID de la conversación
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async sendTestMessage(configId, conversationId) {
    const testMessage = {
      configId,
      conversationId,
      content: `Mensaje de prueba desde Supabase Edge Function

⏰ Hora: ${new Date().toLocaleString()}
🔧 Sistema: Edge Function ChatWoot
✅ Estado: Conectado correctamente`,
      messageType: 'outgoing',
      contentType: 'text',
      private: false
    };

    return await this.sendMessage(testMessage);
  },

  /**
   * Responde a un mensaje específico de Chatwoot
   * @param {Object} replyData - Datos de la respuesta
   * @param {string} replyData.configId - ID de la configuración ChatWoot
   * @param {string} replyData.conversationId - ID de la conversación
   * @param {string} replyData.content - Contenido del mensaje de respuesta
   * @param {string|number} replyData.inReplyTo - ID del mensaje al que se está respondiendo
   * @param {boolean} [replyData.private=false] - Si el mensaje es privado
   * @returns {Promise<Object>} - Respuesta de la API
   */
  async replyToMessage(replyData) {
    const { configId, conversationId, content, inReplyTo, private: isPrivate = false } = replyData;

    console.log('💬 Respondiendo a mensaje en Chatwoot:', {
      conversationId,
      inReplyTo,
      contentPreview: content?.substring(0, 50) + '...'
    });

    return await this.sendMessage({
      configId,
      conversationId,
      content,
      messageType: 'outgoing',
      private: isPrivate,
      contentType: 'text',
      contentAttributes: {
        in_reply_to: inReplyTo.toString() // ID del mensaje al que se responde
      }
    });
  }
};

export default chatwootService;