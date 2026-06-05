import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import DepositDetailModal from "./DepositDetailModal";
import { apiBlob } from "../services/backendApi";
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
  Edit,
  Eye,
} from "lucide-react";

const TableView = ({
  deposits,
  onUpdateDeposit,
  onFetchDepositsByDate,
  onFetchDepositsByPeriod,
  onSelectedDateChange,
  onSelectDate,
  empresas,
  bancos,
  cuentas,
  onOpenVoucherWindow,
  detailPresentationMode = "default",
}) => {
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState(() => {
    // Restaurar filtro de período desde localStorage
    return localStorage.getItem("tableView_filterPeriod") || "all";
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Restaurar mes seleccionado desde localStorage o usar mes actual
    const saved = localStorage.getItem("tableView_selectedMonth");
    if (saved) return saved;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [specificDate, setSpecificDate] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [modalEditMode, setModalEditMode] = useState("full"); // 'full' or 'fields-only'
  const [isExporting, setIsExporting] = useState(false);
  const [exportJob, setExportJob] = useState(null);

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      // Extraer partes de la fecha sin crear objeto Date que cause problemas de timezone
      const [year, month, day] = isoString.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return "-";
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Guardar filtros en localStorage para persistencia
  React.useEffect(() => {
    localStorage.setItem("tableView_filterPeriod", filterPeriod);
  }, [filterPeriod]);

  React.useEffect(() => {
    localStorage.setItem("tableView_selectedMonth", selectedMonth);
  }, [selectedMonth]);

  // useEffect para cargar datos cuando cambia el período a "month"
  React.useEffect(() => {
    if (filterPeriod === "month" && selectedMonth && onFetchDepositsByPeriod) {
      console.log("📅 TableView: Auto-cargando depósitos del mes:", selectedMonth);
      onFetchDepositsByPeriod(`month:${selectedMonth}`);
    }
  }, [filterPeriod]); // Solo cuando cambia filterPeriod, no selectedMonth

  React.useEffect(() => {
    let filtered = deposits;

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (deposit) =>
          (deposit.empresa?.nombre &&
            deposit.empresa.nombre
              .toLowerCase()
              .includes(lowerCaseSearchTerm)) ||
          (deposit.sucursal?.nombre &&
            deposit.sucursal.nombre
              .toLowerCase()
              .includes(lowerCaseSearchTerm)) ||
          (deposit.trabajador?.nombre &&
            deposit.trabajador.nombre
              .toLowerCase()
              .includes(lowerCaseSearchTerm)) ||
          (deposit.anexo &&
            deposit.anexo.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (deposit.monto &&
            deposit.monto.toString().includes(lowerCaseSearchTerm)) ||
          (deposit.numero_operacion &&
            deposit.numero_operacion
              .toLowerCase()
              .includes(lowerCaseSearchTerm)) ||
          (deposit.estado &&
            deposit.estado
              .replace("_", " ")
              .toLowerCase()
              .includes(lowerCaseSearchTerm)) ||
          (deposit.ruc_cliente &&
            deposit.ruc_cliente.toLowerCase().includes(lowerCaseSearchTerm)) ||
          formatDate(deposit.fecha_deposito).includes(lowerCaseSearchTerm) ||
          formatDateTime(deposit.fecha_registro).includes(lowerCaseSearchTerm)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((deposit) => deposit.estado === filterStatus);
    }

    // Ya no filtramos localmente por período porque App.jsx nos envía los datos pre-filtrados
    // Solo mantenemos el filtro local para búsqueda, estado y fecha específica

    // Filtro por fecha específica (solo cuando se selecciona una fecha específica)
    if (specificDate) {
      console.log("📅 TABLE: Aplicando filtro por fecha:", specificDate);
      filtered = filtered.filter((deposit) => {
        if (!deposit.fecha_solo_date) return false;
        return deposit.fecha_solo_date === specificDate;
      });
      console.log(
        `✅ TABLE: ${filtered.length} de ${deposits.length} depósitos filtrados`
      );
    }

    setFilteredDeposits(filtered);
  }, [deposits, searchTerm, filterStatus, specificDate]); // Removimos filterPeriod ya que ahora se maneja en App.jsx

  const handleEditClick = (deposit) => {
    setModalEditMode("full");
    setSelectedDeposit(deposit);
  };

  const handleCloseModal = () => {
    // NO regresar a pendiente - el depósito se queda en su estado actual
    // Esto permite que los depósitos "en_validacion" permanezcan ahí aunque se cierre el modal

    setSelectedDeposit(null);
    setModalEditMode("full"); // Reset mode on close
  };

  const handleExportExcel = () => {
    const dataToExport = filteredDeposits.map((deposit) => {
      const estadoLabels = {
        pendiente: "Pendiente",
        en_validacion: "En Validación",
        validado: "Validado",
        rechazado: "Rechazado",
      };

      return {
        Empresa: deposit.empresa?.nombre || "",
        Sucursal: deposit.sucursal?.nombre || "",
        Contacto: deposit.trabajador?.nombre || "",
        "Teléfono Contacto": deposit.trabajador?.telefono_origen
          ? (deposit.trabajador.telefono_origen.startsWith('51')
              ? deposit.trabajador.telefono_origen.slice(2)
              : deposit.trabajador.telefono_origen)
          : "",
        "Anexo Banco": deposit.anexo || "",
        "Nro Operación Banco": deposit.numero_operacion_banco || "",
        "Fecha Depósito": formatDate(deposit.fecha_deposito),
        Importe: deposit.monto || 0,
        Moneda: deposit.moneda || "",
        Estado: estadoLabels[deposit.estado] || deposit.estado,
        "Motivo Rechazo": deposit.motivo_rechazo || "",
        "Validado Por": deposit.validado_por_usuario?.nombre || "",
        "Fecha Recibido": formatDateTime(deposit.fecha_registro),
        "Nombre Cliente": deposit.cliente || "",
        "RUC/DNI Cliente": deposit.ruc_cliente || "",
        "Ref. Cliente": deposit.referencia_cliente || "",
        "URL Voucher": deposit.imagen_voucher || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Depositos");
    XLSX.writeFile(workbook, "listado_depositos.xlsx");
  };

  const handleExportVouchers = async () => {
    if (isExporting || filteredDeposits.length === 0) {
      alert(
        isExporting
          ? "Ya hay una exportaci?n en curso."
          : "No hay dep?sitos para exportar."
      );
      return;
    }

    const voucherCount = filteredDeposits.filter((deposit) => deposit.imagen_voucher).length;

    if (voucherCount === 0) {
      alert("No hay vouchers v?lidos para exportar.");
      return;
    }

    setIsExporting(true);
    setExportJob({
      jobId: null,
      status: "processing",
      progress: 0,
      total: voucherCount,
      processed: 0,
      filesAdded: 0,
      failures: [],
      error: null,
      message: "Preparando exportaci?n...",
    });

    try {
      setExportJob((prev) => ({
        ...(prev || {}),
        progress: 15,
        message: "Solicitando exportaci?n al backend...",
      }));

      const zipBlob = await apiBlob("/documents/vouchers/export-filtered", {
        method: "POST",
        body: {
          filterPeriod,
          selectedMonth,
          specificDate,
          searchTerm,
          filterStatus,
        },
      });

      if (!zipBlob || zipBlob.size === 0) {
        throw new Error("El backend devolvi? un archivo vac?o.");
      }

      setExportJob((prev) => ({
        ...(prev || {}),
        progress: 90,
        message: "Descarga lista, iniciando archivo...",
      }));

      const link = document.createElement("a");
      const objectUrl = URL.createObjectURL(zipBlob);
      link.href = objectUrl;
      link.download = "vouchers_depositos.zip";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

      setExportJob((prev) => ({
        ...(prev || {}),
        status: "completed",
        progress: 100,
        message: "Descarga completada",
      }));
    } catch (error) {
      console.error("Error al exportar vouchers desde backend:", error);
      setExportJob((prev) => ({
        ...(prev || {}),
        status: "error",
        error: error.message,
        message: error.message || "Ocurri? un error al exportar los vouchers.",
      }));
      alert(error.message || "Ocurri? un error al exportar los vouchers.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewVoucher = (url) => {
    if (!url) {
      alert("Este depósito no tiene un voucher adjunto.");
      return;
    }
    const width = 800;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`;
    window.open(url, "VoucherWindow", windowFeatures);
  };

  const getStatusBadge = (estado) => {
    const config = {
      pendiente: {
        label: "Pendiente",
        icon: Clock,
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
      },
      en_validacion: {
        label: "En Validación",
        icon: AlertCircle,
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
      },
      validado: {
        label: "Validado",
        icon: CheckCircle,
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
      },
      rechazado: {
        label: "Rechazado",
        icon: XCircle,
        color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
      },
    };
    const {
      label,
      icon: Icon,
      color,
    } = config[estado] || {
      label: estado,
      icon: Clock,
      color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}
      >
        <Icon size={12} />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <>
      <div className="h-full p-6 flex flex-col">
        <div className="flex flex-col space-y-4 mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Listado de Depósitos
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Busca y filtra todos los depósitos registrados.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download size={14} />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Buscar en todas las columnas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_validacion">En Validación</option>
                <option value="validado">Validado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value);
                  if (onFetchDepositsByPeriod) {
                    // Si se selecciona "month", enviar el mes seleccionado
                    const period = e.target.value === "month" ? `month:${selectedMonth}` : e.target.value;
                    onFetchDepositsByPeriod(period);
                    console.log(
                      "🔄 TableView: Solicitando depósitos por período:",
                      period
                    );
                  }
                }}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              >
                <option value="all">Todo el tiempo</option>
                <option value="today">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Seleccionar Mes</option>
              </select>
            </div>

            {/* Selector de mes - solo visible cuando filterPeriod es "month" */}
            {filterPeriod === "month" && (
              <div className="flex items-center space-x-2">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    if (onFetchDepositsByPeriod) {
                      onFetchDepositsByPeriod(`month:${e.target.value}`);
                      console.log(
                        "🔄 TableView: Solicitando depósitos del mes:",
                        e.target.value
                      );
                    }
                  }}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  console.log("📅 TABLE: Usuario seleccionó fecha:", newDate);
                  setSpecificDate(newDate);

                  // Comunicar el cambio de fecha a App.jsx
                  if (onSelectDate) {
                    console.log(
                      "📅 TABLE: Solicitando depósitos por fecha al backend hook"
                    );
                    onSelectDate(newDate || null);
                  } else {
                    if (newDate && onFetchDepositsByDate) {
                      console.log(
                        "📅 TABLE: Solicitando depósitos por fecha a App.jsx"
                      );
                      onFetchDepositsByDate(newDate);
                    }
                    if (newDate && onSelectedDateChange) {
                      onSelectedDateChange(newDate);
                    }
                  }

                  // Resetear el filtro de período cuando se selecciona una fecha específica
                  if (newDate) {
                    setFilterPeriod("all");
                  }
                }}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                placeholder="Fecha específica"
              />
              {specificDate && (
                <button
                  onClick={() => {
                    setSpecificDate("");
                    setFilterPeriod("all");
                    console.log(
                      "🧹 TABLE: Limpiando filtros - cargando todos los depósitos"
                    );
                    if (onSelectDate) {
                      onSelectDate(null);
                    } else if (onFetchDepositsByPeriod) {
                      onFetchDepositsByPeriod("all");
                    }
                    if (!onSelectDate && onSelectedDateChange) {
                      onSelectedDateChange(null);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Limpiar fecha"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sucursal - Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Anexo Banco
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nro Operación Banco
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha Depósito
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Importe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20 max-w-20">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Validado por
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha Recibido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    RUC/DNI Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ref. Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    URL Voucher
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDeposits.map((deposit) => (
                  <tr
                    key={deposit.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {deposit.empresa?.nombre || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {deposit.sucursal?.nombre || "-"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {deposit.trabajador?.nombre || "-"}
                        </span>
                        {deposit.trabajador?.telefono_origen && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                            📞 {deposit.trabajador.telefono_origen.startsWith('51')
                              ? deposit.trabajador.telefono_origen.slice(2)
                              : deposit.trabajador.telefono_origen}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {deposit.anexo || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {deposit.numero_operacion_banco || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(deposit.fecha_deposito)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-semibold text-right">
                      {(deposit.monto || 0).toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      {deposit.moneda}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(deposit.estado)}
                    </td>
                    <td
                      className="px-2 py-4 text-xs text-red-600 dark:text-red-400 w-20 max-w-20 truncate align-top"
                      title={
                        deposit.estado === "rechazado"
                          ? deposit.motivo_rechazo
                          : ""
                      }
                    >
                      {deposit.estado === "rechazado"
                        ? deposit.motivo_rechazo
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {deposit.validado_por_usuario?.nombre || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(deposit.fecha_registro)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      {deposit.cliente || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {deposit.ruc_cliente || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {deposit.referencia_cliente || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {deposit.imagen_voucher ? (
                        <a
                          href={deposit.imagen_voucher}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-xs"
                          title={deposit.imagen_voucher}
                        >
                          {deposit.imagen_voucher.length > 40
                            ? `${deposit.imagen_voucher.substring(0, 40)}...`
                            : deposit.imagen_voucher}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Debug para verificar datos */}
                        {console.log("DEBUG Depósito:", {
                          id: deposit.id,
                          observaciones: deposit.observaciones,
                          esManual: deposit.observaciones?.includes(
                            "**registros manual**"
                          ),
                          imagen_voucher: deposit.imagen_voucher,
                          tieneImagen: !!deposit.imagen_voucher,
                        })}

                        {/* Botón Ver Voucher - TEMPORAL: solo con imagen para debug */}
                        {deposit.imagen_voucher && (
                          <button
                            onClick={() =>
                              handleViewVoucher(deposit.imagen_voucher)
                            }
                            className="inline-flex items-center space-x-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 text-sm font-medium transition-colors"
                            title="Ver voucher del registro manual"
                          >
                            <Eye size={14} />
                            <span>Ver Voucher</span>
                          </button>
                        )}

                        {/* Botón Editar - siempre visible */}
                        <button
                          onClick={() => handleEditClick(deposit)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                          title="Editar depósito"
                        >
                          <Edit
                            size={14}
                            className="text-gray-600 dark:text-gray-300"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeposits.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p>No se encontraron depósitos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {exportJob && isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Exportando vouchers
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.min(100, Math.max(0, Math.round(exportJob.progress || 0)))}%
                </span>
              </div>

              <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, exportJob.progress || 0))}%` }}
                />
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>{exportJob.message || "Preparando exportación..."}</p>
                <p>
                  Procesados: {exportJob.processed || 0} / {exportJob.total || 0}
                </p>
                <p>Archivos incluidos: {exportJob.filesAdded || 0}</p>
                {Array.isArray(exportJob.failures) && exportJob.failures.length > 0 && (
                  <p className="text-amber-600 dark:text-amber-400">
                    Fallas parciales: {exportJob.failures.length}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDeposit && (
          <DepositDetailModal
            deposit={selectedDeposit}
            onClose={handleCloseModal}
            onUpdateDeposit={onUpdateDeposit}
            empresas={empresas}
            bancos={bancos}
            cuentas={cuentas}
            onOpenVoucherWindow={onOpenVoucherWindow}
            editMode={modalEditMode}
            presentationMode={detailPresentationMode}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TableView;

