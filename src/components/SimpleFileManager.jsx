import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useContext,
} from "react";
import {
  X,
  Plus,
  ExternalLink,
  Trash2,
  AlertCircle,
  FileText,
  Link2,
  Image,
  File,
  Hash,
  DollarSign,
  Building2,
  Unlink,
} from "lucide-react";
import { driveFilesService } from "../services/driveFilesService";
import UnlinkedFilesGallery from "./UnlinkedFilesGallery";
import { AuthContext } from "../contexts/AuthContext.jsx";

// Hook para Intersection Observer (lazy loading)
const useIntersectionObserver = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [threshold]);

  return [ref, isIntersecting];
};

// Componente con lazy loading para mejor rendimiento
const LazyVoucherImage = ({ src, alt, className = "" }) => {
  const [containerRef, isVisible] = useIntersectionObserver(0.1);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {isVisible ? (
        <VoucherImage src={src} alt={alt} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
          <FileText
            size={48}
            className="text-gray-300 dark:text-gray-600 mb-2"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Imagen lista para cargar
          </p>
        </div>
      )}
    </div>
  );
};

// Componente optimizado para mostrar preview de imágenes de Google Drive
const VoucherImage = ({ src, alt, className = "" }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadStartTime, setLoadStartTime] = useState(null);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);

  const fallbackUrls = useMemo(() => {
    if (!src) return [];

    if (src.includes("drive.google.com/file/d/")) {
      const fileIdMatch = src.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        return [
          `https://drive.google.com/file/d/${fileId}/preview`,
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
          `https://drive.google.com/uc?export=download&id=${fileId}`,
          `https://img-wrapper.vercel.app/image?url=${encodeURIComponent(
            `https://drive.google.com/file/d/${fileId}/preview`
          )}`,
          src, // URL original como último recurso
        ];
      }
    }
    return [src];
  }, [src]);

  const displayableUrl = fallbackUrls[currentUrlIndex];

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    setCurrentUrlIndex(0);
    setLoadStartTime(Date.now());
  }, [src]);

  // Timeout para evitar cargas infinitas
  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn(
          "Imagen tardando más de 8 segundos en cargar:",
          displayableUrl
        );
        handleImageError();
      }
    }, 8000); // 8 segundos timeout

    return () => clearTimeout(timeout);
  }, [isLoading, displayableUrl]);

  const handleImageLoad = () => {
    const loadTime = Date.now() - loadStartTime;
    console.log(
      `✅ Imagen cargada exitosamente en ${loadTime}ms:`,
      displayableUrl
    );
    setIsLoading(false);
  };

  const handleImageError = () => {
    const loadTime = Date.now() - loadStartTime;
    if (currentUrlIndex < fallbackUrls.length - 1) {
      console.warn(
        `⚠️ Fallback de imagen después de ${loadTime}ms:`,
        displayableUrl
      );
      setCurrentUrlIndex(currentUrlIndex + 1);
      setIsLoading(true);
      setLoadStartTime(Date.now());
    } else {
      console.error(`❌ Todas las URLs fallback fallaron para:`, src);
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setCurrentUrlIndex(0);
    setLoadStartTime(Date.now());
  };

  if (hasError || !displayableUrl) {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
        onClick={handleRetry}
      >
        <FileText size={48} className="text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2 mb-1">
          {hasError ? "Error al cargar la imagen" : "Archivo no disponible"}
        </p>
        <p className="text-xs text-blue-500 dark:text-blue-400 text-center px-2 font-medium">
          🔄 Clic para reintentar
        </p>
        {hasError && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center px-2 mt-1">
            Intentado {currentUrlIndex + 1} de {fallbackUrls.length} URLs
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Cargando imagen...
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Intento {currentUrlIndex + 1} de {fallbackUrls.length}
          </p>
        </div>
      )}
      <img
        src={displayableUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-contain rounded-lg transition-opacity duration-500 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{
          imageRendering: "auto",
          imageOrientation: "from-image",
          transform: "scale(1.3)",
        }}
      />
    </div>
  );
};

/**
 * Componente simple para gestionar archivos de Google Drive vinculados a depósitos
 */
const SimpleFileManager = ({ deposito, onClose, onDepositoUpdated }) => {
  const { currentUser } = useContext(AuthContext);
  const [files, setFiles] = useState([]);
  const [unlinkedFiles, setUnlinkedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newFileUrl, setNewFileUrl] = useState("");
  const [error, setError] = useState("");
  const [showGallery, setShowGallery] = useState(false);
  const [activeTab, setActiveTab] = useState("linked"); // 'linked' o 'available'

  // Verificar si el usuario es admin
  const isAdmin = currentUser?.rol === "admin";

  // Cargar archivos del depósito
  const loadFiles = async () => {
    if (!deposito?.id) {
      console.log("❌ No hay deposito.id:", deposito);
      return;
    }

    console.log("🔍 Cargando archivos para depósito:", deposito.id);
    setLoading(true);
    setError("");

    try {
      const result = await driveFilesService.getFilesByDeposit(deposito.id);
      console.log("📁 Resultado del servicio:", result);

      if (result.success) {
        setFiles(result.data);
        console.log("✅ Archivos cargados:", result.data);
      } else {
        setError(result.error);
        console.error("❌ Error del servicio:", result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error crítico:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar archivos no vinculados (disponibles)
  const loadUnlinkedFiles = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await driveFilesService.getUnlinkedFiles();
      console.log("📂 Archivos no vinculados:", result);

      if (result.success) {
        setUnlinkedFiles(result.data);
        console.log("✅ Archivos no vinculados cargados:", result.data);
      } else {
        setError(result.error);
        console.error(
          "❌ Error cargando archivos no vinculados:",
          result.error
        );
      }
    } catch (err) {
      setError(err.message);
      console.error("💥 Error crítico cargando no vinculados:", err);
    } finally {
      setLoading(false);
    }
  };

  // Agregar nuevo archivo
  const handleAddFile = async () => {
    if (!newFileUrl.trim()) {
      setError("Ingresa una URL válida");
      return;
    }

    if (!newFileUrl.includes("drive.google.com")) {
      setError("La URL debe ser de Google Drive");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await driveFilesService.insertFile({
        file_url: newFileUrl,
        deposito_id: deposito.id,
      });

      if (result.success) {
        setNewFileUrl("");
        await loadFiles();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar archivo (solo admin)
  const handleDeleteFile = async (fileId) => {
    if (!isAdmin) {
      setError("Solo los administradores pueden eliminar archivos");
      return;
    }

    if (!confirm("¿Estás seguro de eliminar este archivo permanentemente?"))
      return;

    setLoading(true);
    try {
      const result = await driveFilesService.deleteFile(fileId);
      if (result.success) {
        await loadFiles();
        await loadUnlinkedFiles(); // Recargar ambas listas
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Desvincular archivo (mantener archivo, solo quitar vinculación)
  const handleUnlinkFile = async (fileId) => {
    if (!confirm("¿Estás seguro de desvincular este archivo del depósito?"))
      return;

    setLoading(true);
    try {
      const result = await driveFilesService.unlinkFile(fileId);
      if (result.success) {
        await loadFiles();
        await loadUnlinkedFiles(); // Recargar ambas listas
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Vincular archivo desde la vista de disponibles
  const handleLinkFile = async (fileId) => {
    if (!deposito?.id) return;

    setLoading(true);
    try {
      const result = await driveFilesService.linkFileToDeposit(
        fileId,
        deposito.id
      );
      if (result.success) {
        await loadFiles();
        await loadUnlinkedFiles(); // Recargar ambas listas
        setActiveTab("linked"); // Cambiar a la pestaña de vinculados

        // Notificar al componente padre que el depósito fue actualizado
        if (onDepositoUpdated) {
          onDepositoUpdated(deposito.id);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección desde galería
  const handleFileFromGallery = async (selectedFile) => {
    setShowGallery(false);

    if (!selectedFile || !deposito?.id) return;

    setLoading(true);
    try {
      const result = await driveFilesService.linkFileToDeposit(
        selectedFile.id,
        deposito.id
      );
      if (result.success) {
        await loadFiles();
        await loadUnlinkedFiles();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar archivos al montar
  useEffect(() => {
    if (deposito?.id) {
      console.log("🔄 useEffect ejecutándose para depósito:", deposito.id);
      loadFiles();
      loadUnlinkedFiles();
    }
  }, [deposito?.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Archivos
              </h2>
            </div>

            {/* Información destacada del depósito */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Nº Operación
                  </span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {deposito?.numero_operacion || "N/A"}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Monto
                  </span>
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {deposito?.moneda}{" "}
                  {deposito?.monto?.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  <Building2 className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Anexo
                  </span>
                </div>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {deposito?.anexo || "Sin anexo"}
                </p>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Cliente:</span>{" "}
              {deposito?.cliente || "N/A"} •{" "}
              <span className="font-medium">Estado:</span>{" "}
              <span
                className={`font-semibold ${
                  deposito?.estado === "validado"
                    ? "text-green-600 dark:text-green-400"
                    : deposito?.estado === "rechazado"
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {deposito?.estado?.charAt(0).toUpperCase() +
                  deposito?.estado?.slice(1) || "N/A"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex px-6">
            <button
              onClick={() => setActiveTab("linked")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "linked"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Archivos Vinculados ({files.length})
            </button>
            <button
              onClick={() => setActiveTab("available")}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "available"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Archivos Disponibles ({unlinkedFiles.length})
            </button>
          </nav>
        </div>

        {/* Agregar nuevo archivo - Solo en pestaña de vinculados */}
        {activeTab === "linked" && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex space-x-2">
              <input
                type="url"
                value={newFileUrl}
                onChange={(e) => setNewFileUrl(e.target.value)}
                placeholder="URL de Google Drive (https://drive.google.com/...)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddFile}
                disabled={loading || !newFileUrl.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Contenido de las pestañas */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{ maxHeight: "70vh" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Cargando...
              </span>
            </div>
          ) : activeTab === "linked" ? (
            // Vista de Archivos Vinculados
            files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                  No hay archivos vinculados
                </h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Agrega archivos usando el formulario de arriba o selecciona de
                  los disponibles
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 
                             p-6 hover:shadow-lg transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Link2 className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            Archivo #{index + 1}
                          </h3>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Vinculado
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {/* Botón desvincular - disponible para todos */}
                        <button
                          onClick={() => handleUnlinkFile(file.id)}
                          className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 
                                   rounded-lg transition-colors"
                          title="Desvincular archivo del depósito"
                        >
                          <Unlink className="w-4 h-4" />
                        </button>

                        {/* Botón eliminar - solo admin */}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 
                                     rounded-lg transition-colors"
                            title="Eliminar archivo permanentemente (Solo Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vista previa más grande del voucher */}
                    <div className="mb-6">
                      <div className="w-full h-[28rem] bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-600">
                        <LazyVoucherImage
                          src={file.file_url}
                          alt={`Voucher ${index + 1}`}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <p
                        className="text-xs text-gray-600 dark:text-gray-300 truncate bg-gray-50 dark:bg-gray-800 p-2 rounded"
                        title={file.file_url}
                      >
                        {file.file_url}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : // Vista de Archivos Disponibles
          unlinkedFiles.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                No hay archivos disponibles
              </h3>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Agrega archivos primero desde el módulo de regularización
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unlinkedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 
                             p-6 hover:shadow-lg transition-all hover:border-orange-300 dark:hover:border-orange-600"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          Archivo #{index + 1}
                        </h3>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                          Disponible para vincular
                        </p>
                      </div>
                    </div>

                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Plus className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>

                  {/* Vista previa más grande del voucher */}
                  <div className="mb-6">
                    <div className="w-full h-[28rem] bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-600">
                      <LazyVoucherImage
                        src={file.file_url}
                        alt={`Voucher disponible ${index + 1}`}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <p
                      className="text-xs text-gray-600 dark:text-gray-300 truncate bg-gray-50 dark:bg-gray-800 p-2 rounded"
                      title={file.file_url}
                    >
                      {file.file_url}
                    </p>
                  </div>

                  <button
                    onClick={() => handleLinkFile(file.id)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-4 
                               bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-base font-semibold
                               shadow-lg hover:shadow-xl"
                  >
                    <Link2 className="w-5 h-5" />
                    <span>Vincular Archivo</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total de archivos: {files.length}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Galería de archivos no vinculados */}
        {showGallery && (
          <UnlinkedFilesGallery
            onFileSelect={handleFileFromGallery}
            onClose={() => setShowGallery(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SimpleFileManager;
