import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import DepositDetailModal from "./DepositDetailModal";
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
  Archive,
  Edit,
  Eye,
} from "lucide-react";

const TableView = ({
  deposits,
  onUpdateDeposit,
  empresas,
  bancos,
  cuentas,
  onOpenVoucherWindow,
}) => {
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [specificDate, setSpecificDate] = useState("");
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [modalEditMode, setModalEditMode] = useState("full"); // 'full' or 'fields-only'
  const [isExporting, setIsExporting] = useState(false);

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

    if (filterPeriod !== "all") {
      const now = new Date();
      filtered = filtered.filter((deposit) => {
        const registroDate = new Date(deposit.fecha_registro);
        if (isNaN(registroDate)) return false;

        switch (filterPeriod) {
          case "today":
            return registroDate.toDateString() === now.toDateString();
          case "week": {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(
              now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
            );
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);
            return registroDate >= startOfWeek && registroDate < endOfWeek;
          }
          case "month":
            return (
              registroDate.getMonth() === now.getMonth() &&
              registroDate.getFullYear() === now.getFullYear()
            );
          case "year":
            return registroDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Filtro por fecha específica
    if (specificDate) {
      filtered = filtered.filter((deposit) => {
        if (!deposit.fecha_registro) return false;
        // Extraer solo la parte de la fecha (YYYY-MM-DD) sin hora
        const depositDateOnly = deposit.fecha_registro.split("T")[0];
        return depositDateOnly === specificDate;
      });
    }

    setFilteredDeposits(filtered);
  }, [deposits, searchTerm, filterStatus, filterPeriod, specificDate]);

  const handleEditClick = (deposit) => {
    setModalEditMode("fields-only");
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
          ? "Ya hay una exportación en curso."
          : "No hay depósitos para exportar."
      );
      return;
    }
    setIsExporting(true);
    alert(`Iniciando la descarga de vouchers. Esto puede tardar...`);

    try {
      const zip = new JSZip();
      const imagePromises = filteredDeposits.map(async (deposit) => {
        if (!deposit.imagen_voucher) return null;

        let downloadUrl = deposit.imagen_voucher;

        if (downloadUrl.includes("drive.google.com/file/d/")) {
          const fileIdMatch = downloadUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/);
          if (fileIdMatch && fileIdMatch[1]) {
            const fileId = fileIdMatch[1];
            const googleDriveDirectUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            downloadUrl = `https://img-wrapper.vercel.app/image?url=${encodeURIComponent(
              googleDriveDirectUrl
            )}`;
          }
        }

        try {
          const response = await fetch(downloadUrl);
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          return { deposit, blob: await response.blob() };
        } catch (error) {
          console.error(
            `Error descargando voucher para op ${deposit.numero_operacion}:`,
            error
          );
          return null;
        }
      });

      const results = await Promise.all(imagePromises);
      let filesAdded = 0;
      results.filter(Boolean).forEach(({ deposit, blob }) => {
        // Formatear fecha sin problemas de zona horaria
        const formatearFechaParaArchivo = (fechaString) => {
          if (!fechaString) return "sin-fecha";
          try {
            const [year, month, day] = fechaString.split("T")[0].split("-");
            return `${year}-${month}-${day}`;
          } catch {
            return "sin-fecha";
          }
        };

        const formattedDate = formatearFechaParaArchivo(
          deposit.fecha_registro || deposit.fecha_deposito
        );
        const sucursalFolder =
          deposit.sucursal?.nombre.replace(/[\/\\?%*:|"<>]/g, "_") ||
          "sin-sucursal";

        let extension = "file";
        if (blob.type.startsWith("image/")) {
          extension = blob.type.split("/")[1].split("+")[0];
        } else if (blob.type === "application/pdf") {
          extension = "pdf";
        } else {
          const urlExtMatch = deposit.imagen_voucher.match(
            /\.([a-zA-Z0-9]+)(?:[?#]|$)/
          );
          if (urlExtMatch && urlExtMatch[1]) {
            extension = urlExtMatch[1];
          }
        }
        extension = extension.toLowerCase().replace("jpeg", "jpg");

        const filename = `op_${deposit.numero_operacion}_id_${deposit.id}.${extension}`;
        zip.file(`${formattedDate}/${sucursalFolder}/${filename}`, blob);
        filesAdded++;
      });

      if (filesAdded === 0) {
        alert(
          "No se pudo descargar ningún voucher. Revisa la consola para más detalles."
        );
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = "vouchers_depositos.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error al generar ZIP:", error);
      alert("Ocurrió un error al generar el archivo ZIP.");
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
              <button
                onClick={handleExportVouchers}
                disabled={isExporting}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Descargando...</span>
                  </>
                ) : (
                  <>
                    <Archive size={14} />
                    <span>Exportar Vouchers</span>
                  </>
                )}
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
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              >
                <option value="all">Todo el tiempo</option>
                <option value="today">Hoy</option>
                <option value="week">Esta Semana</option>
                <option value="month">Este Mes</option>
                <option value="year">Este Año</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={specificDate}
                onChange={(e) => {
                  setSpecificDate(e.target.value);
                  // Resetear el filtro de período cuando se selecciona una fecha específica
                  if (e.target.value) {
                    setFilterPeriod("all");
                  }
                }}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
                placeholder="Fecha específica"
              />
              {specificDate && (
                <button
                  onClick={() => setSpecificDate("")}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Motivo Rechazo
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
                      className="px-6 py-4 text-sm text-red-600 dark:text-red-400 max-w-xs truncate"
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
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TableView;
