import { apiGet, apiPost } from "./backendApi.js";

const WHATSAPP_CONFIG = {
  version: "v24.0",
};

class WhatsAppService {
  constructor() {
    this.phoneNumberId = null;
    this.accessToken = null;
    this.configLoaded = false;
  }

  async loadConfiguration() {
    console.log("Cargando configuracion de WhatsApp...");

    try {
      const localPhone = localStorage.getItem("whatsapp_phone_number_id");
      const localToken = localStorage.getItem("whatsapp_access_token");

      if (localPhone && localToken) {
        this.phoneNumberId = localPhone;
        this.accessToken = localToken;
        this.configLoaded = true;
        return true;
      }

      const response = await apiGet("/whatsapp/credentials");
      const credentials = response.data || response;

      if (credentials?.phone_number_id && credentials?.access_token) {
        this.phoneNumberId = credentials.phone_number_id;
        this.accessToken = credentials.access_token;
        localStorage.setItem("whatsapp_phone_number_id", this.phoneNumberId);
        localStorage.setItem("whatsapp_access_token", this.accessToken);
        this.configLoaded = true;
        return true;
      }

      this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || null;
      this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || null;
    } catch (error) {
      console.warn("No se pudo cargar configuracion de WhatsApp:", error.message);
      this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || null;
      this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || null;
    }

    this.configLoaded = true;
    return !!(this.phoneNumberId && this.accessToken);
  }

  async validateCredentials() {
    if (!this.configLoaded) {
      await this.loadConfiguration();
    }

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        "WhatsApp credentials not configured. Please configure them in the admin panel or set environment variables."
      );
    }
  }

  async makeRequest(type, data = {}) {
    await this.validateCredentials();
    return apiPost("/whatsapp/send", {
      type,
      ...data,
      phoneNumberId: this.phoneNumberId,
      accessToken: this.accessToken,
      graphVersion: WHATSAPP_CONFIG.version,
    });
  }

  async sendTextMessage(to, message) {
    return this.makeRequest("text", {
      to,
      text: {
        body: message,
      },
    });
  }

  async sendTemplateMessage(to, templateName, languageCode = "es", components = []) {
    return this.makeRequest("template", {
      to,
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    });
  }

  async sendDocumentMessage(to, documentUrl, filename, caption = "") {
    return this.makeRequest("document", {
      to,
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    });
  }

  async sendImageMessage(to, imageUrl, caption = "") {
    return this.makeRequest("image", {
      to,
      image: {
        link: imageUrl,
        caption,
      },
    });
  }

  async sendButtonMessage(to, bodyText, buttons) {
    return this.makeRequest("interactive", {
      to,
      interactive: {
        type: "button",
        body: {
          text: bodyText,
        },
        action: {
          buttons: buttons.map((button, index) => ({
            type: "reply",
            reply: {
              id: `button_${index}`,
              title: button.title,
            },
          })),
        },
      },
    });
  }

  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("51") && cleaned.length === 11) {
      return cleaned;
    }

    if (cleaned.length === 9 && cleaned.startsWith("9")) {
      return `51${cleaned}`;
    }

    return cleaned;
  }

  isValidPhoneNumber(phoneNumber) {
    const formatted = this.formatPhoneNumber(phoneNumber);
    return /^51[0-9]{9}$/.test(formatted);
  }

  async sendDepositConfirmation(depositData, sucursalTelefono) {
    try {
      const telefonoFormateado = this.formatPhoneNumber(sucursalTelefono);

      if (!this.isValidPhoneNumber(telefonoFormateado)) {
        throw new Error(`Numero de telefono invalido: ${sucursalTelefono}`);
      }

      const fechaFormateada = new Date(depositData.fechaDeposito).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

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

      const result = await this.sendTextMessage(telefonoFormateado, mensaje);

      return {
        success: true,
        messageId: result.data?.messages?.[0]?.id || result.data?.id || null,
        phone: telefonoFormateado,
        result,
      };
    } catch (error) {
      console.error("Error enviando confirmacion de deposito:", error);

      return {
        success: false,
        error: error.message,
        phone: sucursalTelefono,
        depositData,
      };
    }
  }
}

const whatsappService = new WhatsAppService();

export default whatsappService;
export { WhatsAppService };
