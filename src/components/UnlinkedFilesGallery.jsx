import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  ExternalLink,
  Plus,
  AlertCircle,
  RefreshCw,
  Link2,
  Image,
  File,
  X,
} from "lucide-react";
import { driveFilesService } from "../services/driveFilesService";

/**
 * Componente para mostrar archivos no vinculados en formato de cards
 * Similar al estilo de DocumentosView
 */
const UnlinkedFilesGallery = ({ onFileSelect, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Cargar archivos no vinculados
  const loadUnlinkedFiles = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("🔄 Cargando archivos no vinculados...");
      const result = await driveFilesService.getUnlinkedFiles();

      if (result.success) {
        setFiles(result.data);
        console.log("✅ Archivos no vinculados cargados:", result.data);
      } else {
        setError(result.error);
        console.error("❌ Error cargando archivos:", result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error crítico:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar archivos por búsqueda
  const filteredFiles = files.filter((file) =>
    file.file_url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cargar archivos al montar
  useEffect(() => {
    loadUnlinkedFiles();
  }, []);

  // Manejar selección de archivo
  const handleSelectFile = (file) => {
    setSelectedFile(file);
  };

  // Confirmar selección
  const handleConfirmSelection = () => {
    if (selectedFile && onFileSelect) {
      onFileSelect(selectedFile);
    }
  };

  // Determinar tipo de archivo por URL
  const getFileType = (url) => {
    if (
      url.includes("image") ||
      url.includes("jpg") ||
      url.includes("png") ||
      url.includes("jpeg")
    ) {
      return "image";
    }
    if (url.includes("pdf")) {
      return "pdf";
    }
    return "document";
  };

  // Obtener ícono por tipo
  const getFileIcon = (url) => {
    const type = getFileType(url);
    switch (type) {
      case "image":
        return <Image className="w-8 h-8 text-blue-500" />;
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />;
      default:
        return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Galería de Archivos Disponibles
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Selecciona un archivo para vincular al depósito
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadUnlinkedFiles}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar archivos por URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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

        {/* Galería de archivos */}
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
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                {searchTerm
                  ? "No se encontraron archivos"
                  : "No hay archivos disponibles"}
              </h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {searchTerm
                  ? "Intenta con otros términos de búsqueda"
                  : "Agrega archivos primero desde el módulo de regularización"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-gray-700 rounded-lg border-2 transition-all cursor-pointer hover:shadow-lg ${
                    selectedFile?.id === file.id
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                  onClick={() => handleSelectFile(file)}
                >
                  {/* Header del card */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          {getFileIcon(file.file_url)}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Archivo #{index + 1}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Google Drive
                          </p>
                        </div>
                      </div>

                      {selectedFile?.id === file.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vista previa */}
                  <div className="p-4">
                    <div className="w-full h-32 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-600 mb-3">
                      <div className="text-center">
                        {getFileIcon(file.file_url)}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {getFileType(file.file_url).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* URL truncada */}
                    <div className="mb-3">
                      <p
                        className="text-xs text-gray-600 dark:text-gray-300 truncate"
                        title={file.file_url}
                      >
                        {file.file_url}
                      </p>
                    </div>

                    {/* Botón de vista previa */}
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 
                               border border-gray-300 dark:border-gray-600 rounded-lg 
                               hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver en Drive</span>
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedFile ? (
              <span>
                Archivo seleccionado: #
                {filteredFiles.findIndex((f) => f.id === selectedFile.id) + 1}
              </span>
            ) : (
              <span>Total: {filteredFiles.length} archivos disponibles</span>
            )}
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
              disabled={!selectedFile}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center space-x-2"
            >
              <Link2 className="w-4 h-4" />
              <span>Seleccionar Archivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnlinkedFilesGallery;
