/**
 * WhatsApp Cloud API Service
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

import { supabase } from '../supabaseClient.js';

// Configuración de la API de WhatsApp
const WHATSAPP_CONFIG = {
  baseURL: 'https://graph.facebook.com/v24.0',
  version: 'v24.0'
};

/**
 * Clase para manejar la API de WhatsApp Cloud API
 */
class WhatsAppService {
  constructor() {
    this.baseURL = WHATSAPP_CONFIG.baseURL;
    this.phoneNumberId = null;
    this.accessToken = null;
    this.configLoaded = false;
  }

  /**
   * Carga la configuración con múltiples fuentes de respaldo
   */
  async loadConfiguration() {
    console.log('🔄 Cargando configuración de WhatsApp...');
    
    try {
      // 1. Prioridad: localStorage (más confiable)
      const localPhone = localStorage.getItem('whatsapp_phone_number_id');
      const localToken = localStorage.getItem('whatsapp_access_token');
      
      if (localPhone && localToken) {
        console.log('✅ Configuración cargada desde localStorage');
        this.phoneNumberId = localPhone;
        this.accessToken = localToken;
        this.configLoaded = true;
        return true;
      }

      // 2. Intentar base de datos con timeout
      try {
        const dbPromise = supabase.rpc('get_whatsapp_credentials');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout BD')), 3000)
        );

        const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

        if (data && data.length > 0 && !error) {
          console.log('✅ Configuración cargada desde BD');
          this.phoneNumberId = data[0].phone_number_id;
          this.accessToken = data[0].access_token;
          
          // Guardar en localStorage para próximas veces
          localStorage.setItem('whatsapp_phone_number_id', this.phoneNumberId);
          localStorage.setItem('whatsapp_access_token', this.accessToken);
          
          this.configLoaded = true;
          return true;
        }
      } catch (dbError) {
        console.warn('⚠️ BD no disponible:', dbError.message);
      }

      // 3. Fallback final: variables de entorno
      console.log('🔄 Usando variables de entorno como fallback');
      this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
      this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
      
    } catch (error) {
      console.error('❌ Error en loadConfiguration:', error);
      // Fallback completo
      this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
      this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
    }

    this.configLoaded = true;
    return !!(this.phoneNumberId && this.accessToken);
  }

  /**
   * Valida que las credenciales estén configuradas
   */
  async validateCredentials() {
    console.log('🔑 VALIDANDO credenciales WhatsApp:', {
      configLoaded: this.configLoaded,
      phoneNumberId: this.phoneNumberId ? 'SI' : 'NO',
      accessToken: this.accessToken ? 'SI' : 'NO'
    });

    if (!this.configLoaded) {
      console.log('🔄 Cargando configuración...');
      await this.loadConfiguration();
    }

    if (!this.phoneNumberId || !this.accessToken) {
      console.error('❌ Credenciales WhatsApp no configuradas:', {
        phoneNumberId: this.phoneNumberId,
        accessToken: this.accessToken ? 'EXISTE' : 'FALTA'
      });
      throw new Error(
        'WhatsApp credentials not configured. Please configure them in the admin panel or set environment variables.'
      );
    }

    console.log('✅ Credenciales WhatsApp validadas correctamente');
  }

  /**
   * Realiza una petición a la API de WhatsApp
   */
  async makeRequest(endpoint, method = 'POST', data = null) {
    await this.validateCredentials();

    const url = `${this.baseURL}/${this.phoneNumberId}/${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `WhatsApp API Error ${response.status}: ${errorData.error?.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp API Request Error:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje de texto simple
   */
  async sendTextMessage(to, message) {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: {
        body: message
      }
    };

    return await this.makeRequest('messages', 'POST', data);
  }

  /**
   * Envía un mensaje con plantilla (template)
   */
  async sendTemplateMessage(to, templateName, languageCode = 'es', components = []) {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    return await this.makeRequest('messages', 'POST', data);
  }

  /**
   * Envía un mensaje con documento/archivo
   */
  async sendDocumentMessage(to, documentUrl, filename, caption = '') {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption
      }
    };

    return await this.makeRequest('messages', 'POST', data);
  }

  /**
   * Envía un mensaje con imagen
   */
  async sendImageMessage(to, imageUrl, caption = '') {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    };

    return await this.makeRequest('messages', 'POST', data);
  }

  /**
   * Envía un mensaje interactivo con botones
   */
  async sendButtonMessage(to, bodyText, buttons) {
    const data = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: buttons.map((button, index) => ({
            type: 'reply',
            reply: {
              id: `button_${index}`,
              title: button.title
            }
          }))
        }
      }
    };

    return await this.makeRequest('messages', 'POST', data);
  }

  /**
   * Formatea número de teléfono al formato de WhatsApp
   * Ejemplo: "51987654321" para Perú
   */
  formatPhoneNumber(phoneNumber) {
    // Remover espacios, guiones y caracteres especiales
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Si empieza con 51 (Perú) y tiene la longitud correcta, mantenerlo
    if (cleaned.startsWith('51') && cleaned.length === 11) {
      return cleaned;
    }
    
    // Si es número peruano sin código de país, agregarlo
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return `51${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Valida formato de número de teléfono
   */
  isValidPhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Validación básica para números peruanos
    return /^51[0-9]{9}$/.test(formatted);
  }

  /**
   * Envía mensaje de confirmación de depósito a la sucursal
   * @param {Object} depositData - Datos del depósito
   * @param {string} sucursalTelefono - Teléfono de la sucursal
   * @returns {Promise} Resultado del envío
   */
  async sendDepositConfirmation(depositData, sucursalTelefono) {
    try {
      console.log('📱 SERVICIO WhatsApp - sendDepositConfirmation INICIADO', {
        sucursal: depositData.sucursalNombre,
        telefono: sucursalTelefono,
        operacion: depositData.numeroOperacion,
        monto: depositData.monto,
        moneda: depositData.moneda,
        configLoaded: this.configLoaded,
        hasPhoneNumberId: !!this.phoneNumberId,
        hasAccessToken: !!this.accessToken
      });

      // Formatear el teléfono
      const telefonoFormateado = this.formatPhoneNumber(sucursalTelefono);
      
      if (!this.isValidPhoneNumber(telefonoFormateado)) {
        throw new Error(`Número de teléfono inválido: ${sucursalTelefono}`);
      }

      // Formatear la fecha para mostrar más legible
      const fechaFormateada = new Date(depositData.fechaDeposito).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });

      // Crear el mensaje de confirmación
      const mensaje = `🎉 *DEPÓSITO CONFIRMADO*

✅ *Empresa:* ${depositData.empresa}
📍 *Sucursal:* ${depositData.sucursalNombre}
🏦 *Banco:* ${depositData.banco}
🔢 *Anexo:* ${depositData.anexo}
📅 *Fecha Depósito:* ${fechaFormateada}
🆔 *Operación:* ${depositData.numeroOperacion}
💰 *Importe:* ${depositData.moneda} ${depositData.monto}

El depósito ha sido validado y confirmado exitosamente.

_Mensaje automático del sistema de control de depósitos_`;

      // Enviar el mensaje
      const result = await this.sendTextMessage(telefonoFormateado, mensaje);
      
      console.log('✅ Mensaje de confirmación enviado exitosamente:', {
        messageId: result.messages?.[0]?.id,
        telefono: telefonoFormateado,
        operacion: depositData.numeroOperacion
      });

      // Opcional: registrar en log de mensajes si existe la tabla
      try {
        await this.logMessage(telefonoFormateado, 'deposit_confirmation', {
          message_id: result.messages?.[0]?.id,
          deposit_data: depositData,
          message_content: mensaje
        });
      } catch (logError) {
        console.warn('⚠️ No se pudo registrar en log de mensajes:', logError.message);
      }

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
        phone: telefonoFormateado,
        result: result
      };

    } catch (error) {
      console.error('❌ Error enviando confirmación de depósito:', error);
      
      return {
        success: false,
        error: error.message,
        phone: sucursalTelefono,
        depositData: depositData
      };
    }
  }

  /**
   * Registra el mensaje enviado en el log (opcional)
   */
  async logMessage(telefono, tipo, metadata = {}) {
    try {
      if (!supabase) return;
      
      await supabase.from('whatsapp_mensajes_log').insert({
        telefono_destino: telefono,
        tipo_mensaje: tipo,
        contenido: metadata,
        estado: 'enviado',
        enviado_en: new Date().toISOString()
      });
    } catch (error) {
      // No fallar si no se puede registrar
      console.warn('Log de mensaje no registrado:', error.message);
    }
  }
}

// Instancia singleton del servicio
const whatsappService = new WhatsAppService();

export default whatsappService;

// Exportar también la clase para casos específicos
export { WhatsAppService };