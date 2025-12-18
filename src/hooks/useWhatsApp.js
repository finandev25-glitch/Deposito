import { useState } from 'react';
import whatsappService from '../services/whatsappService';

/**
 * Hook personalizado para manejar WhatsApp en componentes React
 */
export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Resetea el estado de error y éxito
   */
  const resetStatus = () => {
    setError(null);
    setSuccess(false);
  };

  /**
   * Envía un mensaje de texto
   */
  const sendTextMessage = async (phoneNumber, message) => {
    setLoading(true);
    resetStatus();

    try {
      // Validar número de teléfono
      if (!whatsappService.isValidPhoneNumber(phoneNumber)) {
        throw new Error('Número de teléfono inválido. Use formato: 987654321 o 51987654321');
      }

      const formattedPhone = whatsappService.formatPhoneNumber(phoneNumber);
      const result = await whatsappService.sendTextMessage(formattedPhone, message);
      
      setSuccess(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envía notificación de depósito validado
   */
  const sendDepositValidatedNotification = async (deposit) => {
    const phoneNumber = deposit.trabajador?.telefono || deposit.telefono_contacto;
    
    if (!phoneNumber) {
      throw new Error('No se encontró número de teléfono para este depósito');
    }

    const message = `🎉 *Depósito Validado*

✅ Su depósito ha sido aprobado:

📋 *Detalles:*
• Nro. Operación: ${deposit.numero_operacion}
• Banco: ${deposit.banco?.nombre || 'N/A'}
• Importe: ${deposit.moneda} ${deposit.monto}
• Fecha: ${new Date(deposit.fecha_deposito).toLocaleDateString('es-ES')}

Empresa: ${deposit.empresa?.nombre || 'N/A'}
Sucursal: ${deposit.sucursal?.nombre || 'N/A'}

¡Gracias por su confianza! 🏦`;

    return await sendTextMessage(phoneNumber, message);
  };

  /**
   * Envía notificación de depósito rechazado
   */
  const sendDepositRejectedNotification = async (deposit, reason) => {
    const phoneNumber = deposit.trabajador?.telefono || deposit.telefono_contacto;
    
    if (!phoneNumber) {
      throw new Error('No se encontró número de teléfono para este depósito');
    }

    const message = `❌ *Depósito Rechazado*

Su depósito ha sido rechazado:

📋 *Detalles:*
• Nro. Operación: ${deposit.numero_operacion}
• Banco: ${deposit.banco?.nombre || 'N/A'}
• Importe: ${deposit.moneda} ${deposit.monto}

📝 *Motivo del rechazo:*
${reason || 'No se especificó motivo'}

Por favor, verifique la información y vuelva a enviar el comprobante correcto.

Empresa: ${deposit.empresa?.nombre || 'N/A'}`;

    return await sendTextMessage(phoneNumber, message);
  };

  /**
   * Envía documento (comprobante) por WhatsApp
   */
  const sendDepositDocument = async (phoneNumber, documentUrl, deposit) => {
    setLoading(true);
    resetStatus();

    try {
      if (!whatsappService.isValidPhoneNumber(phoneNumber)) {
        throw new Error('Número de teléfono inválido');
      }

      const formattedPhone = whatsappService.formatPhoneNumber(phoneNumber);
      const filename = `Comprobante_${deposit.numero_operacion}.pdf`;
      const caption = `📄 Comprobante de depósito\nNro. Operación: ${deposit.numero_operacion}`;

      const result = await whatsappService.sendDocumentMessage(
        formattedPhone,
        documentUrl,
        filename,
        caption
      );
      
      setSuccess(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envía recordatorio de validación pendiente (para validadores)
   */
  const sendValidationReminder = async (validatorPhone, pendingCount) => {
    const message = `⏰ *Recordatorio de Validación*

Tienes ${pendingCount} depósito${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de validar.

🔍 Ingresa al sistema para revisar y validar los comprobantes.

${pendingCount > 5 ? '🚨 ¡Atención! Hay muchos depósitos acumulados.' : ''}`;

    return await sendTextMessage(validatorPhone, message);
  };

  return {
    loading,
    error,
    success,
    resetStatus,
    sendTextMessage,
    sendDepositValidatedNotification,
    sendDepositRejectedNotification,
    sendDepositDocument,
    sendValidationReminder,
  };
};

export default useWhatsApp;