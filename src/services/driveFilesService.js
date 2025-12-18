import { supabase } from '../supabaseClient';

/**
 * Servicio simplificado para manejar archivos de Google Drive
 * Gestiona la tabla drive_files con 3 columnas: id, file_url, deposito_id
 */

export const driveFilesService = {
  /**
   * Insertar un nuevo archivo en la base de datos
   * @param {Object} fileData - Datos del archivo
   * @param {string} fileData.file_url - URL del archivo en Google Drive
   * @param {number} fileData.deposito_id - ID del depósito (opcional)
   * @returns {Promise<Object>} - Resultado de la inserción
   */
  async insertFile(fileData) {
    try {
      const { data, error } = await supabase
        .from('drive_files')
        .insert([{
          file_url: fileData.file_url,
          deposito_id: fileData.deposito_id || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error insertando archivo:', error);
        throw error;
      }

      console.log('✅ Archivo insertado correctamente:', data);
      return { success: true, data };
    } catch (error) {
      console.error('💥 Error en insertFile:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener archivos no vinculados (disponibles para vincular)
   * @returns {Promise<Array>} - Lista de archivos disponibles
   */
  async getUnlinkedFiles() {
    try {
      const { data, error } = await supabase
        .from('drive_files')
        .select('*')
        .is('deposito_id', null)
        .order('id', { ascending: false });

      if (error) {
        console.error('Error obteniendo archivos no vinculados:', error);
        throw error;
      }

      console.log(`📁 Encontrados ${data?.length || 0} archivos no vinculados`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('💥 Error en getUnlinkedFiles:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  /**
   * Vincular archivo con depósito y actualizar campo imagen_voucher
   * @param {number} fileId - ID del archivo
   * @param {number} depositoId - ID del depósito
   * @returns {Promise<Object>} - Resultado de la vinculación
   */
  async linkFileToDeposit(fileId, depositoId) {
    try {
      // Primero obtenemos los datos del archivo
      const { data: fileData, error: fileError } = await supabase
        .from('drive_files')
        .select('file_url')
        .eq('id', fileId)
        .single();

      if (fileError) {
        console.error('Error obteniendo datos del archivo:', fileError);
        throw fileError;
      }

      // Vincular el archivo al depósito
      const { data: updatedFile, error: linkError } = await supabase
        .from('drive_files')
        .update({ deposito_id: depositoId })
        .eq('id', fileId)
        .select()
        .single();

      if (linkError) {
        console.error('Error vinculando archivo:', linkError);
        throw linkError;
      }

      // Actualizar el campo imagen_voucher en la tabla depositos
      const { data: updatedDeposito, error: depositoError } = await supabase
        .from('depositos')
        .update({ imagen_voucher: fileData.file_url })
        .eq('id', depositoId)
        .select('id, imagen_voucher')
        .single();

      if (depositoError) {
        console.error('Error actualizando imagen_voucher del depósito:', depositoError);
        // Si falla la actualización del depósito, revertir la vinculación del archivo
        await supabase
          .from('drive_files')
          .update({ deposito_id: null })
          .eq('id', fileId);
        throw depositoError;
      }

      console.log('🔗 Archivo vinculado correctamente y depósito actualizado:', {
        archivo: updatedFile,
        deposito: updatedDeposito
      });
      
      return { success: true, data: updatedFile, depositoData: updatedDeposito };
    } catch (error) {
      console.error('💥 Error en linkFileToDeposit:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Desvincular archivo de depósito
   * @param {number} fileId - ID del archivo
   * @returns {Promise<Object>} - Resultado de la desvinculación
   */
  async unlinkFile(fileId) {
    try {
      const { data, error } = await supabase
        .from('drive_files')
        .update({ deposito_id: null })
        .eq('id', fileId)
        .select()
        .single();

      if (error) {
        console.error('Error desvinculando archivo:', error);
        throw error;
      }

      console.log('🔓 Archivo desvinculado correctamente:', data);
      return { success: true, data };
    } catch (error) {
      console.error('💥 Error en unlinkFile:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener archivos vinculados a un depósito específico
   * @param {number} depositoId - ID del depósito
   * @returns {Promise<Array>} - Lista de archivos vinculados
   */
  async getFilesByDeposit(depositoId) {
    try {
      console.log('🔍 Buscando archivos para depósito:', depositoId, 'tipo:', typeof depositoId);
      
      const { data, error } = await supabase
        .from('drive_files')
        .select('*')
        .eq('deposito_id', depositoId)
        .order('id', { ascending: false });

      console.log('📊 Consulta SQL ejecutada. Error:', error, 'Data:', data);

      if (error) {
        console.error('❌ Error SQL obteniendo archivos del depósito:', error);
        throw error;
      }

      console.log(`📎 Encontrados ${data?.length || 0} archivos para el depósito ${depositoId}:`, data);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('💥 Error crítico en getFilesByDeposit:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  /**
   * Eliminar archivo completamente de la base de datos
   * @param {number} fileId - ID del archivo
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async deleteFile(fileId) {
    try {
      const { error } = await supabase
        .from('drive_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Error eliminando archivo:', error);
        throw error;
      }

      console.log('🗑️ Archivo eliminado correctamente');
      return { success: true };
    } catch (error) {
      console.error('💥 Error en deleteFile:', error);
      return { success: false, error: error.message };
    }
  }
};

export default driveFilesService;