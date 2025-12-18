import { useState, useCallback } from 'react';
import WhatsAppService from '../services/whatsappService.js';

/**
 * Hook para notificaciones WhatsApp integrado con el sistema de depósitos
 */
export const useWhatsAppNotifications = () => {
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Plantillas de mensajes
  const messageTemplates = {
    depositApproved: (deposit, empresa, banco) => ({
      type: 'text',
      content: `✅ *DEPÓSITO APROBADO*

🏢 Empresa: ${empresa?.nombre || 'N/A'}
🏦 Banco: ${banco?.nombre || 'N/A'}
💰 Monto: ${deposit.moneda} ${deposit.monto?.toLocaleString() || 'N/A'}
📋 Código: ${deposit.codigo_unico || 'N/A'}
📅 Fecha: ${new Date(deposit.fecha_deposito).toLocaleDateString('es-PE')}

El depósito ha sido validado y aprobado correctamente.

🔗 Accede al sistema para más detalles.`
    }),

    depositRejected: (deposit, empresa, banco, reason) => ({
      type: 'text', 
      content: `❌ *DEPÓSITO RECHAZADO*

🏢 Empresa: ${empresa?.nombre || 'N/A'}
🏦 Banco: ${banco?.nombre || 'N/A'}
💰 Monto: ${deposit.moneda} ${deposit.monto?.toLocaleString() || 'N/A'}
📋 Código: ${deposit.codigo_unico || 'N/A'}

❗ Motivo del rechazo:
${reason}

Por favor, revise y corrija el comprobante antes de volver a enviarlo.`
    }),

    depositPending: (deposit, empresa, banco) => ({
      type: 'text',
      content: `⏳ *DEPÓSITO EN REVISIÓN*

🏢 Empresa: ${empresa?.nombre || 'N/A'}  
🏦 Banco: ${banco?.nombre || 'N/A'}
💰 Monto: ${deposit.moneda} ${deposit.monto?.toLocaleString() || 'N/A'}
📋 Código: ${deposit.codigo_unico || 'N/A'}

Su depósito está siendo revisado. Recibirá una notificación cuando sea procesado.`
    }),

    dailySummary: (approvedCount, rejectedCount, pendingCount) => ({
      type: 'text',
      content: `📊 *RESUMEN DIARIO DE DEPÓSITOS*

✅ Aprobados: ${approvedCount}
❌ Rechazados: ${rejectedCount}  
⏳ Pendientes: ${pendingCount}

Total procesados hoy: ${approvedCount + rejectedCount}

${pendingCount > 0 ? '⚠️ Hay depósitos pendientes de revisión.' : '🎉 Todos los depósitos han sido procesados.'}`
    })
  };

  // Obtener números de teléfono para notificar
  const getNotificationNumbers = useCallback(async (deposit, notificationType) => {
    try {
      // Aquí puedes implementar la lógica para obtener números según el tipo
      // Por ejemplo: números de administradores, del depositante, etc.
      
      const numbers = [];
      
      // Si es aprobación/rechazo, notificar al depositante (si tiene número)
      if (['approved', 'rejected'].includes(notificationType) && deposit.telefono_contacto) {
        numbers.push(deposit.telefono_contacto);
      }
      
      // Para pending o resúmenes, notificar a administradores
      if (['pending', 'summary'].includes(notificationType)) {
        // Aquí podrías consultar la BD para obtener números de admins
        // Por ahora, usar un número configurado
        const adminNumber = localStorage.getItem('admin_whatsapp_number');
        if (adminNumber) {
          numbers.push(adminNumber);
        }
      }
      
      return numbers.filter(num => num && num.trim());
    } catch (error) {
      console.error('Error obteniendo números para notificar:', error);
      return [];
    }
  }, []);

  // Enviar notificación de depósito aprobado
  const notifyDepositApproved = useCallback(async (deposit, empresa, banco) => {
    setIsSending(true);
    try {
      const message = messageTemplates.depositApproved(deposit, empresa, banco);
      const numbers = await getNotificationNumbers(deposit, 'approved');
      
      const results = [];
      for (const number of numbers) {
        try {
          const whatsapp = new WhatsAppService();
          const result = await whatsapp.sendTextMessage(number, message.content);
          results.push({ number, success: true, result });
        } catch (error) {
          results.push({ number, success: false, error: error.message });
        }
      }
      
      setLastResult({ type: 'approved', results });
      return results;
    } catch (error) {
      console.error('Error enviando notificación de aprobación:', error);
      setLastResult({ type: 'approved', error: error.message });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [getNotificationNumbers]);

  // Enviar notificación de depósito rechazado
  const notifyDepositRejected = useCallback(async (deposit, empresa, banco, reason) => {
    setIsSending(true);
    try {
      const message = messageTemplates.depositRejected(deposit, empresa, banco, reason);
      const numbers = await getNotificationNumbers(deposit, 'rejected');
      
      const results = [];
      for (const number of numbers) {
        try {
          const whatsapp = new WhatsAppService();
          const result = await whatsapp.sendTextMessage(number, message.content);
          results.push({ number, success: true, result });
        } catch (error) {
          results.push({ number, success: false, error: error.message });
        }
      }
      
      setLastResult({ type: 'rejected', results });
      return results;
    } catch (error) {
      console.error('Error enviando notificación de rechazo:', error);
      setLastResult({ type: 'rejected', error: error.message });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [getNotificationNumbers]);

  // Enviar notificación de depósito pendiente
  const notifyDepositPending = useCallback(async (deposit, empresa, banco) => {
    setIsSending(true);
    try {
      const message = messageTemplates.depositPending(deposit, empresa, banco);
      const numbers = await getNotificationNumbers(deposit, 'pending');
      
      const results = [];
      for (const number of numbers) {
        try {
          const whatsapp = new WhatsAppService();
          const result = await whatsapp.sendTextMessage(number, message.content);
          results.push({ number, success: true, result });
        } catch (error) {
          results.push({ number, success: false, error: error.message });
        }
      }
      
      setLastResult({ type: 'pending', results });
      return results;
    } catch (error) {
      console.error('Error enviando notificación de pendiente:', error);
      setLastResult({ type: 'pending', error: error.message });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [getNotificationNumbers]);

  // Enviar resumen diario
  const sendDailySummary = useCallback(async (approvedCount, rejectedCount, pendingCount) => {
    setIsSending(true);
    try {
      const message = messageTemplates.dailySummary(approvedCount, rejectedCount, pendingCount);
      const numbers = await getNotificationNumbers(null, 'summary');
      
      const results = [];
      for (const number of numbers) {
        try {
          const whatsapp = new WhatsAppService();
          const result = await whatsapp.sendTextMessage(number, message.content);
          results.push({ number, success: true, result });
        } catch (error) {
          results.push({ number, success: false, error: error.message });
        }
      }
      
      setLastResult({ type: 'summary', results });
      return results;
    } catch (error) {
      console.error('Error enviando resumen diario:', error);
      setLastResult({ type: 'summary', error: error.message });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [getNotificationNumbers]);

  // Enviar mensaje personalizado
  const sendCustomMessage = useCallback(async (numbers, message) => {
    setIsSending(true);
    try {
      const results = [];
      const numberList = Array.isArray(numbers) ? numbers : [numbers];
      
      for (const number of numberList) {
        try {
          const whatsapp = new WhatsAppService();
          const result = await whatsapp.sendTextMessage(number, message);
          results.push({ number, success: true, result });
        } catch (error) {
          results.push({ number, success: false, error: error.message });
        }
      }
      
      setLastResult({ type: 'custom', results });
      return results;
    } catch (error) {
      console.error('Error enviando mensaje personalizado:', error);
      setLastResult({ type: 'custom', error: error.message });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, []);

  return {
    // Estados
    isSending,
    lastResult,
    
    // Métodos de notificación
    notifyDepositApproved,
    notifyDepositRejected, 
    notifyDepositPending,
    sendDailySummary,
    sendCustomMessage,
    
    // Plantillas (para preview o personalización)
    messageTemplates,
    
    // Reset del último resultado
    clearLastResult: () => setLastResult(null)
  };
};

export default useWhatsAppNotifications;