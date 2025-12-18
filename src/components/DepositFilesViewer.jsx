import { useState, useEffect } from "react";
import {
  FileText,
  Image,
  File,
  ExternalLink,
  Unlink,
  AlertCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useDepositFiles } from "../hooks/useDriveFiles";
import driveFilesService from "../services/driveFilesService";
import DriveFilesModal from "./DriveFilesModal";

/**
 * Componente para mostrar y gestionar archivos vinculados a un depósito
 */
const DepositFilesViewer = ({
  depositoId,
  deposito = null,
  className = "",
}) => {
  const { files, loading, error, reloadFiles } = useDepositFiles(depositoId);
  const [showModal, setShowModal] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const [localError, setLocalError] = useState(null);

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "image":
        return <Image className="w-5 h-5 text-blue-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + " MB";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUnlinkFile = async (fileId, fileName) => {
    if (
      !confirm(
        `¿Estás seguro de que quieres desvincular el archivo "${fileName}"? El archivo no se eliminará de Google Drive.`
      )
    ) {
      return;
    }

    setUnlinking(fileId);
    setLocalError(null);

    try {
      const result = await driveFilesService.unlinkFile(fileId);
      if (result.success) {
        await reloadFiles();
      } else {
        setLocalError(result.error);
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setUnlinking(null);
    }
  };

  const handleFileLinked = async (linkedFile) => {
    // Recargar la lista de archivos después de vincular uno nuevo
    await reloadFiles();
  };

  if (!depositoId) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">
          Selecciona un depósito para ver sus archivos
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Archivos Vinculados
          </h3>
          {deposito && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {deposito.numero_operacion || "Sin número de operación"} -{" "}
              {deposito.banco?.nombre || "Sin banco"}
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={reloadFiles}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                     hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg 
                     hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Vincular Archivo</span>
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {(error || localError) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error || localError}
            </p>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Cargando archivos...
            </span>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8">
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No hay archivos vinculados a este depósito
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Vincular Primer Archivo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 
                         rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(file.file_type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.file_name}
                    </h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex space-x-4">
                        <span>Tamaño: {formatFileSize(file.file_size)}</span>
                        <span>Vinculado: {formatDate(file.linked_at)}</span>
                      </div>
                      {file.description && (
                        <p className="truncate">
                          Descripción: {file.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 
                             rounded-lg transition-colors"
                    title="Abrir en Google Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleUnlinkFile(file.id, file.file_name)}
                    disabled={unlinking === file.id}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 
                             rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Desvincular archivo"
                  >
                    {unlinking === file.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para vincular archivos */}
      <DriveFilesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onFileSelected={handleFileLinked}
        depositoId={depositoId}
        title="Vincular Archivo al Depósito"
      />
    </div>
  );
};

export default DepositFilesViewer;
