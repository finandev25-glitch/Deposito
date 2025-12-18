import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Download,
  Eye,
  Calendar,
  Building2,
  User,
  CreditCard,
  DollarSign,
} from "lucide-react";

// Componente interno para manejar la lógica de visualización de imágenes de forma robusta.
const VoucherImage = ({ src, alt }) => {
  const [hasError, setHasError] = useState(false);

  // Convierte la URL de Google Drive a un formato de imagen directa usando un proxy.
  const displayableUrl = useMemo(() => {
    if (!src) return null;

    if (src.includes("drive.google.com/file/d/")) {
      const fileIdMatch = src.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        // Esta es la URL de vista/descarga directa de Google Drive.
        const googleDriveDirectUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        // Usamos un proxy para evitar problemas de CORS/hotlinking que impiden la carga.
        return `https://img-wrapper.vercel.app/image?url=${encodeURIComponent(
          googleDriveDirectUrl
        )}`;
      }
    }

    // Para otras URLs de imágenes directas.
    return src;
  }, [src]);

  // Reinicia el estado de error si la URL de origen cambia.
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Si hay un error al cargar la imagen o no hay URL, muestra un ícono de archivo.
  if (hasError || !displayableUrl) {
    return <FileText size={48} className="text-gray-400 dark:text-gray-500" />;
  }

  // Intenta renderizar la imagen. Si falla, el `onError` cambiará el estado.
  return (
    <img
      src={displayableUrl}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
      crossOrigin="anonymous"
    />
  );
};

const DocumentosView = ({ deposits }) => {
  const [filteredVouchers, setFilteredVouchers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const documentsPerPage = 12;

  useEffect(() => {
    const vouchers = deposits
      ? deposits.filter((dep) => dep.imagen_voucher)
      : [];
    let filtered = vouchers;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();

      const formatDateForSearch = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString.replace(/-/g, "/"));
        return date.toLocaleDateString("es-ES");
      };

      filtered = filtered.filter(
        (dep) =>
          (dep.numero_operacion &&
            dep.numero_operacion.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (dep.cliente &&
            dep.cliente.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (dep.sucursal?.nombre &&
            dep.sucursal.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (dep.monto && dep.monto.toString().includes(lowerCaseSearchTerm)) ||
          (dep.fecha_deposito &&
            formatDateForSearch(dep.fecha_deposito).includes(
              lowerCaseSearchTerm
            ))
      );
    }

    setFilteredVouchers(filtered);
    setCurrentPage(1);
  }, [deposits, searchTerm]);

  const handleViewVoucher = (url) => {
    if (!url) return;
    const width = 800;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`;

    window.open(url, "VoucherWindow", windowFeatures);
  };

  const getTypeBadge = () => {
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300`}
      >
        <CreditCard size={12} />
        <span className="capitalize">Voucher</span>
      </span>
    );
  };

  const indexOfLastDoc = currentPage * documentsPerPage;
  const indexOfFirstDoc = indexOfLastDoc - documentsPerPage;
  const currentVouchers = filteredVouchers.slice(
    indexOfFirstDoc,
    indexOfLastDoc
  );
  const totalPages = Math.ceil(filteredVouchers.length / documentsPerPage);

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Galería de Vouchers
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visualiza todos los vouchers de depósitos registrados.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nro. operación, cliente, sucursal, importe, fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentVouchers.length > 0 ? (
          currentVouchers.map((deposit) => {
            const isGoogleDrive =
              deposit.imagen_voucher?.includes("drive.google.com");

            return (
              <motion.div
                key={deposit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-blue-500/10 transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  {getTypeBadge()}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleViewVoucher(deposit.imagen_voucher)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Ver en ventana emergente"
                    >
                      <Eye
                        size={16}
                        className="text-gray-600 dark:text-gray-300"
                      />
                    </button>
                    {!isGoogleDrive && (
                      <a
                        href={deposit.imagen_voucher}
                        download={`voucher_op_${deposit.numero_operacion}`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Descargar"
                      >
                        <Download
                          size={16}
                          className="text-gray-600 dark:text-gray-300"
                        />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full h-96 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                    <VoucherImage
                      src={deposit.imagen_voucher}
                      alt={`Voucher ${deposit.numero_operacion}`}
                    />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-base truncate">
                    Voucher Op: {deposit.numero_operacion}
                  </h3>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {deposit.cliente && (
                    <div className="flex items-center space-x-2">
                      <User
                        size={14}
                        className="text-gray-400 dark:text-gray-500"
                      />
                      <span className="truncate">{deposit.cliente}</span>
                    </div>
                  )}
                  {deposit.sucursal?.nombre && (
                    <div className="flex items-center space-x-2">
                      <Building2
                        size={14}
                        className="text-gray-400 dark:text-gray-500"
                      />
                      <span className="truncate">
                        {deposit.sucursal.nombre}
                      </span>
                    </div>
                  )}
                  {deposit.monto && (
                    <div className="flex items-center space-x-2">
                      <DollarSign
                        size={14}
                        className="text-gray-400 dark:text-gray-500"
                      />
                      <span>
                        {deposit.monto.toLocaleString("es-ES", {
                          style: "currency",
                          currency: deposit.moneda,
                        })}
                      </span>
                    </div>
                  )}
                  {deposit.fecha_deposito && (
                    <div className="flex items-center space-x-2">
                      <Calendar
                        size={14}
                        className="text-gray-400 dark:text-gray-500"
                      />
                      <span>
                        {new Date(
                          deposit.fecha_deposito.replace(/-/g, "/")
                        ).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
            <FileText
              size={48}
              className="mx-auto text-gray-300 dark:text-gray-600"
            />
            <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              No se encontraron vouchers
            </h3>
            <p className="mt-1 text-base">
              {searchTerm
                ? "Intenta ajustar los filtros de búsqueda."
                : "Aún no hay depósitos con vouchers registrados."}
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-base border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
            >
              Anterior
            </button>

            <span className="text-base text-gray-600 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-base border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentosView;
