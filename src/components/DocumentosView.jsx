import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileText,
  Search,
  User,
  Building2,
} from "lucide-react";
import { apiGet } from "../services/backendApi.js";

const extractDriveFileId = (url) => {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

const normalizeVoucherPreviewUrl = (src) => {
  const fileId = extractDriveFileId(src);
  if (!fileId) return src || null;

  return `https://drive.google.com/file/d/${fileId}/preview`;
};

const VoucherPreview = ({ src, alt }) => {
  const [loadIndex, setLoadIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  const previewUrls = useMemo(() => {
    if (!src) return [];

    const fileId = extractDriveFileId(src);
    if (!fileId) return [src];

    return [
      `https://drive.google.com/file/d/${fileId}/preview`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      src,
    ];
  }, [src]);

  const currentUrl = previewUrls[loadIndex] || null;

  useEffect(() => {
    setLoadIndex(0);
    setHasError(false);
    setLoading(true);
  }, [src]);

  if (hasError || !currentUrl) {
    return <FileText size={48} className="text-gray-400 dark:text-gray-500" />;
  }

  const handleError = () => {
    if (loadIndex < previewUrls.length - 1) {
      setLoadIndex((value) => value + 1);
      setLoading(true);
      return;
    }

    setHasError(true);
    setLoading(false);
  };

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-xs text-gray-500 dark:text-gray-400">Cargando...</span>
        </div>
      )}
      {currentUrl.includes("/preview") ? (
        <iframe
          key={currentUrl}
          src={currentUrl}
          title={alt}
          className={`w-full h-full border-0 transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setLoading(false)}
          onError={handleError}
          allow="fullscreen"
        />
      ) : (
        <img
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setLoading(false)}
          onError={handleError}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
};

const DocumentosView = () => {
  const [vouchers, setVouchers] = useState([]);
  const [totalVouchers, setTotalVouchers] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState("month");
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const documentsPerPage = 12;
  const monthOptions = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];
  const yearOptions = Array.from({ length: 7 }, (_, index) => {
    const year = now.getFullYear() - 3 + index;
    return String(year);
  });

  const resolvedPeriod = useMemo(() => {
    if (period === "specific-month") {
      return `month:${selectedYear}-${selectedMonth}`;
    }

    if (period === "month") {
      return `month:${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    return period;
  }, [period, selectedYear, selectedMonth]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (resolvedPeriod && resolvedPeriod !== "all") {
          params.set("period", resolvedPeriod);
        }
        if (searchTerm.trim()) {
          params.set("search", searchTerm.trim());
        }
        params.set("page", String(currentPage));
        params.set("pageSize", String(documentsPerPage));

        const query = params.toString();
        const response = await apiGet(`/documents/vouchers${query ? `?${query}` : ""}`);
        setVouchers(response?.data || []);
        setTotalVouchers(Number(response?.total || 0));
      } catch (fetchError) {
        setError(fetchError.message || "No se pudieron cargar los vouchers");
        setVouchers([]);
        setTotalVouchers(0);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchTerm, resolvedPeriod, currentPage, documentsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, resolvedPeriod]);

  const currentVouchers = vouchers;
  const totalPages = Math.ceil(totalVouchers / documentsPerPage);

  const handleViewVoucher = (url) => {
    if (!url) return;

    const width = 900;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`;

    window.open(normalizeVoucherPreviewUrl(url) || url, "VoucherWindow", windowFeatures);
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Galería de Vouchers
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visualiza los vouchers desde backend con filtro por período.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 mb-6">
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

        <div className="w-full lg:w-72">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
          >
            <option value="all">Todos los períodos</option>
            <option value="today">Hoy</option>
            <option value="week">Semana actual</option>
            <option value="month">Mes actual</option>
            <option value="specific-month">Mes específico</option>
          </select>
        </div>
      </div>

      {period === "specific-month" && (
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="w-full md:w-48">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-56">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mes
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Cargando vouchers...
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentVouchers.length > 0 ? (
          currentVouchers.map((deposit) => {
            const isGoogleDrive = deposit.imagen_voucher?.includes("drive.google.com");
            const previewUrl = normalizeVoucherPreviewUrl(deposit.imagen_voucher);

            return (
              <motion.div
                key={deposit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg dark:hover:shadow-blue-500/10 transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    <CreditCard size={12} />
                    <span className="capitalize">Voucher</span>
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleViewVoucher(deposit.imagen_voucher)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Ver en ventana emergente"
                    >
                      <Eye size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    {!isGoogleDrive && (
                      <a
                        href={deposit.imagen_voucher}
                        download={`voucher_op_${deposit.numero_operacion}`}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Descargar"
                      >
                        <Download size={16} className="text-gray-600 dark:text-gray-300" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full h-96 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                    <VoucherPreview src={previewUrl || deposit.imagen_voucher} alt={`Voucher ${deposit.numero_operacion}`} />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-base truncate">
                    Voucher Op: {deposit.numero_operacion}
                  </h3>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {deposit.cliente && (
                    <div className="flex items-center space-x-2">
                      <User size={14} className="text-gray-400 dark:text-gray-500" />
                      <span className="truncate">{deposit.cliente}</span>
                    </div>
                  )}
                  {deposit.sucursal?.nombre && (
                    <div className="flex items-center space-x-2">
                      <Building2 size={14} className="text-gray-400 dark:text-gray-500" />
                      <span className="truncate">{deposit.sucursal.nombre}</span>
                    </div>
                  )}
                  {deposit.monto && (
                    <div className="flex items-center space-x-2">
                      <DollarSign size={14} className="text-gray-400 dark:text-gray-500" />
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
                      <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                      <span>
                        {new Date(String(deposit.fecha_deposito).replace(/-/g, "/")).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              No se encontraron vouchers
            </h3>
            <p className="mt-1 text-base">
              {searchTerm
                ? "Intenta ajustar la búsqueda o el período."
                : "Aún no hay depósitos con vouchers registrados en el período seleccionado."}
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
