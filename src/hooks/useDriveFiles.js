import { useState, useEffect } from 'react';
import driveFilesService from '../services/driveFilesService';

/**
 * Hook personalizado para manejar archivos de Google Drive
 * Proporciona funcionalidades para vincular archivos con depósitos
 */
export const useDriveFiles = () => {
  const [unlinkedFiles, setUnlinkedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Cargar archivos no vinculados
   */
  const loadUnlinkedFiles = async (fileType = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.getUnlinkedFiles(fileType);
      if (result.success) {
        setUnlinkedFiles(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Insertar nuevo archivo
   */
  const insertFile = async (fileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.insertFile(fileData);
      if (result.success) {
        // Recargar archivos no vinculados
        await loadUnlinkedFiles();
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vincular archivo con depósito
   */
  const linkFileToDeposit = async (fileId, depositoId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.linkFileToDeposit(fileId, depositoId);
      if (result.success) {
        // Remover el archivo de la lista de no vinculados
        setUnlinkedFiles(prev => prev.filter(file => file.id !== fileId));
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Desvincular archivo
   */
  const unlinkFile = async (fileId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.unlinkFile(fileId);
      if (result.success) {
        // Recargar archivos no vinculados para incluir el recién desvinculado
        await loadUnlinkedFiles();
        return result.data;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buscar archivos
   */
  const searchFiles = async (searchTerm) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.searchFiles(searchTerm);
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return [];
      }
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener archivos de un depósito específico
   */
  const getFilesByDeposit = async (depositoId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.getFilesByDeposit(depositoId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.error);
        return [];
      }
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Cargar archivos no vinculados al montar el componente
  useEffect(() => {
    loadUnlinkedFiles();
  }, []);

  return {
    unlinkedFiles,
    loading,
    error,
    loadUnlinkedFiles,
    insertFile,
    linkFileToDeposit,
    unlinkFile,
    searchFiles,
    getFilesByDeposit,
    setError, // Para limpiar errores manualmente
  };
};

/**
 * Hook específico para archivos vinculados a un depósito
 */
export const useDepositFiles = (depositoId) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadFiles = async () => {
    if (!depositoId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await driveFilesService.getFilesByDeposit(depositoId);
      if (result.success) {
        setFiles(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [depositoId]);

  return {
    files,
    loading,
    error,
    reloadFiles: loadFiles
  };
};

export default useDriveFiles;