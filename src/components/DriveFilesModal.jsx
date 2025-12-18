import { useState, useEffect } from "react";
import {
  X,
  Search,
  FileText,
  Image,
  File,
  ExternalLink,
  Link2,
  AlertCircle,
} from "lucide-react";
import { useDriveFiles } from "../hooks/useDriveFiles";

/**
 * Modal para seleccionar archivos de Google Drive y vincularlos a depósitos
 */
const DriveFilesModal = ({
  isOpen,
  onClose,
  onFileSelected,
  depositoId = null,
  title = "Seleccionar Archivo de Google Drive",
}) => {
  const {
    unlinkedFiles,
    loading,
    error,
    loadUnlinkedFiles,
    linkFileToDeposit,
    searchFiles,
    setError,
  } = useDriveFiles();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [linking, setLinking] = useState(false);

  // Filtrar archivos basado en búsqueda y tipo
  useEffect(() => {
    let files = unlinkedFiles;

    // Filtrar por tipo
    if (filterType !== "all") {
      files = files.filter((file) => file.file_type === filterType);
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      files = files.filter((file) =>
        file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFiles(files);
  }, [unlinkedFiles, searchTerm, filterType]);

  // Resetear estado al abrir/cerrar modal
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSelectedFile(null);
      setFilterType("all");
      setError(null);
      loadUnlinkedFiles();
    }
  }, [isOpen]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleConfirmSelection = async () => {
    if (!selectedFile) return;

    if (depositoId) {
      // Si hay depositoId, vincular automáticamente
      setLinking(true);
      try {
        const result = await linkFileToDeposit(selectedFile.id, depositoId);
        if (result) {
          onFileSelected(result);
          onClose();
        }
      } catch (err) {
        console.error("Error linking file:", err);
      } finally {
        setLinking(false);
      }
    } else {
      // Si no hay depositoId, solo retornar el archivo seleccionado
      onFileSelected(selectedFile);
      onClose();
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar archivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterType === "all"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Todos ({unlinkedFiles.length})
            </button>
            <button
              onClick={() => setFilterType("image")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterType === "image"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Imágenes (
              {unlinkedFiles.filter((f) => f.file_type === "image").length})
            </button>
            <button
              onClick={() => setFilterType("pdf")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterType === "pdf"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              PDFs ({unlinkedFiles.filter((f) => f.file_type === "pdf").length})
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Files List */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: "50vh" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Cargando archivos...
              </span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? "No se encontraron archivos que coincidan con la búsqueda"
                  : "No hay archivos disponibles"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedFile?.id === file.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.file_type)}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.file_name}
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p>Tamaño: {formatFileSize(file.file_size)}</p>
                          <p>Subido: {formatDate(file.created_at)}</p>
                          {file.description && (
                            <p>Descripción: {file.description}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Abrir en Google Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {selectedFile?.id === file.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFile
              ? `Archivo seleccionado: ${selectedFile.file_name}`
              : "Selecciona un archivo"}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 
                       rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirmSelection}
              disabled={!selectedFile || linking}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center space-x-2"
            >
              {linking && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <Link2 className="w-4 h-4" />
              <span>
                {linking
                  ? "Vinculando..."
                  : depositoId
                  ? "Vincular Archivo"
                  : "Seleccionar"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveFilesModal;
