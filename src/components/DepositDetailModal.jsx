import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../contexts/AuthContext.jsx";
import useWhatsApp from "../hooks/useWhatsApp.js";
import yCloudService from "../services/yCloudService.js";
import { apiGet, apiPost, apiPut } from "../services/backendApi.js";
import {
  X,
  User,
  Building2,
  CreditCard,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Hash,
  Building,
  Info,
  Search,
  Loader2,
  Ban,
  MessageSquare,
  PanelRightOpen,
  Save,
  Fingerprint,
  Eye,
  AlertTriangle,
  Phone,
  FileDown,
  ExternalLink,
} from "lucide-react";
import RejectionModal from "./RejectionModal";
import GoogleDrivePicker from "./GoogleDrivePicker.jsx";
import ConversationModal from "./ConversationModal.jsx";

const FALLBACK_VOUCHER_PREVIEW =
  "https://placehold.co/600x400/e2e8f0/e2e8f0?text=Voucher";

const getStatusInfo = (estado) => {
  switch (estado) {
    case "pendiente":
      return {
        Icon: Clock,
        label: "Pendiente",
        color:
          "text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/50",
      };
    case "en_validacion":
      return {
        Icon: AlertCircle,
        label: "En Validación",
        color:
          "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50",
      };
    case "validado":
      return {
        Icon: CheckCircle,
        label: "Validado",
        color:
          "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/50",
      };
    case "rechazado":
      return {
        Icon: XCircle,
        label: "Rechazado",
        color: "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50",
      };
    default:
      return {
        Icon: Clock,
        label: "Desconocido",
        color: "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700",
      };
  }
};

const FormRow = ({ icon: Icon, label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 flex items-center">
      <Icon className="h-3 w-3 mr-1.5 text-gray-500 dark:text-gray-400" />
      {label}
    </label>
    {children}
  </div>
);

const CompactFieldCard = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/80">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
    <div className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
      {value || "-"}
    </div>
  </div>
);

const normalizeDateForInput = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split("/");
      return `${year}-${month}-${day}`;
    }
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatSqlMovementDate = (value) => {
  if (!value) return "-";
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "-";

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [year, month, day] = raw.slice(0, 10).split("-");
      return `${day}/${month}/${year}`;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      return raw;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const hasSqlMovementAttentionData = (row) =>
  ["ValidadoPor", "OBSERVACION", "Observacion"].some((field) => {
    const value = row?.[field];
    const text = String(value ?? "").trim();
    return text.length > 0 && text !== "-";
  });

const getReplyMessageIdFromDeposit = (deposit) =>
  deposit?.chatwoot_message_id || null;

const getSqlServerCompanyConfigFromEmpresaId = (empresaId, empresas = []) => {
  const companyId = String(empresaId ?? "").trim();
  const selectedEmpresa = empresas.find((empresa) => String(empresa?.id) === companyId) || null;
  const companyText = String(
    selectedEmpresa?.nombre ||
      selectedEmpresa?.abreviatura ||
      selectedEmpresa?.alias ||
      "",
  ).toLowerCase();

  if (companyText.includes("jch")) {
    return {
      empresa: "1",
      empresaNombre: "JCH COMERCIAL SA",
    };
  }

  if (companyText.includes("evolution")) {
    return {
      empresa: "2",
      empresaNombre: "EVOLUTION CAR SERVICE EIRL",
    };
  }

  if (companyId === "1") {
    return {
      empresa: "1",
      empresaNombre: "JCH COMERCIAL SA",
    };
  }

  if (companyId === "2") {
    return {
      empresa: "2",
      empresaNombre: "EVOLUTION CAR SERVICE EIRL",
    };
  }

  return {
    empresa: "",
    empresaNombre: "",
  };
};

const getSqlServerDefaultRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    fechaInicio: `${year}-01-01`,
    fechaFin: `${year}-${month}-${day}`,
  };
};

const getYYYYMMFromDate = (date, monthOffset = 0) => {
  const base = new Date(date);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
};

const getSqlMovementSelectionLabel = (deposit) => {
  const personal = String(
    deposit?.trabajador?.nombre || deposit?.trabajador_nombre || "",
  ).trim();
  const sucursal = String(
    deposit?.sucursal?.nombre || deposit?.sucursal_nombre || "",
  ).trim();

  return [personal, sucursal].filter(Boolean).join(" - ");
};

const getSqlPeriodRangeFromYYYYMM = (period) => {
  const normalized = String(period || "").trim();
  if (!/^\d{6}$/.test(normalized)) return null;

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const fechaInicio = `${year}-${String(month).padStart(2, "0")}-01`;
  const fechaFin = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

  return { fechaInicio, fechaFin };
};

const SQL_MOVEMENTS_COLUMNS = [
  { key: "FECHA", label: "Fecha", hidden: false },
  { key: "BANCO", label: "Banco", hidden: false },
  { key: "NRO_OPER", label: "Nro. op.", hidden: false },
  { key: "DESCRIPCION", label: "Descripcion", hidden: false },
  { key: "ABONO", label: "Abono", hidden: false },
  { key: "REG", label: "Reg", hidden: false },
  { key: "Sucursal", label: "Sucursal", hidden: false },
  { key: "Contacto", label: "Contacto", hidden: false },
  { key: "ValidadoPor", label: "Validado por", hidden: false },
  { key: "Observacion", label: "Observación", hidden: false },
];

const SQL_CORTADO_COLUMNS = [
  { key: "FECHA", label: "Fecha", hidden: false },
  { key: "BANCO", label: "Banco", hidden: false },
  { key: "NRO_OPER", label: "Nro. operación", hidden: false },
  { key: "DESCRIPCION", label: "Descripcion", hidden: false },
  { key: "CARGO", label: "Cargo", hidden: false },
  { key: "ABONO", label: "Abono", hidden: false },
  { key: "REG", label: "Reg", hidden: false },
  { key: "DIF", label: "Dif", hidden: false },
  { key: "REGISTRO", label: "Registro", hidden: false },
  { key: "GLOSA", label: "GLOSA", hidden: false },
];

const formatSqlDateDDMMYYYY = (value) => {
  if (!value) return "-";
  const raw = String(value).trim();
  if (!raw) return "-";

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return raw;
};

const renderSqlCell = (value, key) => {
  if (value == null || value === "") return "-";
  if (key === "FECHA") return formatSqlDateDDMMYYYY(value);
  if (["ABONO", "REG", "CARGO", "DIF"].includes(key)) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric.toLocaleString("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }
  return String(value);
};

const normalizeSqlServerRow = (row) => {
  if (!row || typeof row !== "object") return row;

  const normalized = { ...row };

  normalized.Observacion =
    row.Observacion ??
    row.OBSERVACION ??
    row.observacion ??
    row.OBSERVACIONES ??
    row.observaciones ??
    "";

  normalized.ValidadoPor =
    row.ValidadoPor ??
    row.VALIDADOPOR ??
    row.validado_por ??
    row.validadoPor ??
    "";

  normalized.Sucursal =
    row.Sucursal ??
    row.SUCURSAL ??
    row.sucursal ??
    row.sucursal_nombre ??
    "";

  normalized.Contacto =
    row.Contacto ??
    row.CONTACTO ??
    row.contacto ??
    row.trabajador_nombre ??
    "";

  return normalized;
};

const DepositDetailModal = ({
  deposit,
  onClose,
  onUpdateDeposit,
  empresas,
  bancos,
  cuentas,
  onOpenVoucherWindow,
  editMode = "full",
  presentationMode = "default",
  replyToWhatsAppMessages = false,
}) => {
  const isCompactPresentation = presentationMode === "compact";
  const shouldUseDuplicateModals = isCompactPresentation;
  const { currentUser } = useContext(AuthContext);
  const isBackendConnected = !!currentUser;

  const [editableData, setEditableData] = useState({
    empresa_id: "",
    banco_id: "",
    anexo: "",
    monto: 0,
    moneda: "PEN",
    numero_operacion_banco: "",
    fecha_deposito: "",
    imagen_voucher: "",
    cliente: "",
    ruc_cliente: "",
    observaciones: "",
    referencia_cliente: "",
  });
  const [filteredAnexos, setFilteredAnexos] = useState([]);

  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState({
    checked: false,
    isDuplicate: false,
    message: "",
  });
  const [duplicateDeposits, setDuplicateDeposits] = useState([]);
  const [isNoDuplicateModalOpen, setIsNoDuplicateModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [duplicateModalMode, setDuplicateModalMode] = useState("none");
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isConversationModalOpen, setIsConversationModalOpen] = useState(false);
  const [isSqlMovementsModalOpen, setIsSqlMovementsModalOpen] = useState(false);
  const [sqlMovementsLoading, setSqlMovementsLoading] = useState(false);
  const [sqlMovementsError, setSqlMovementsError] = useState("");
  const [sqlMovementsActionMessage, setSqlMovementsActionMessage] = useState("");
  const [sqlMovementsRows, setSqlMovementsRows] = useState([]);
  const [sqlMovementsMeta, setSqlMovementsMeta] = useState(null);
  const [sqlCortadoLoading, setSqlCortadoLoading] = useState(false);
  const [sqlCortadoError, setSqlCortadoError] = useState("");
  const [sqlCortadoRows, setSqlCortadoRows] = useState([]);
  const [sqlCortadoMeta, setSqlCortadoMeta] = useState(null);
  const [sqlMovementsSearch, setSqlMovementsSearch] = useState("");
  const [sqlCortadoPeriod, setSqlCortadoPeriod] = useState("");
  const [sqlCortadoNroOperacionFilter, setSqlCortadoNroOperacionFilter] = useState("");
  const [sqlCortadoBancoFilter, setSqlCortadoBancoFilter] = useState("");
  const [sqlCortadoFechaFilter, setSqlCortadoFechaFilter] = useState("");
  const [sqlCortadoImporteFilter, setSqlCortadoImporteFilter] = useState("");
  const [sqlCortadoPage, setSqlCortadoPage] = useState(1);
  const [sqlCortadoPageSize] = useState(100);
  const [sqlCortadoTotalCount, setSqlCortadoTotalCount] = useState(0);
  const [sqlActiveTab, setSqlActiveTab] = useState("movimientos");
  const [sqlSelectedMovement, setSqlSelectedMovement] = useState(null);
  const [sqlSelectionToast, setSqlSelectionToast] = useState("");
  const sqlSelectedMovementId = sqlSelectedMovement?.ID ?? null;
  const isSqlLoading = sqlMovementsLoading || sqlCortadoLoading;
  const [duplicateStoreDataSnapshot, setDuplicateStoreDataSnapshot] = useState("");

  useEffect(() => {
    if (!sqlSelectionToast) return undefined;
    const timeoutId = setTimeout(() => {
      setSqlSelectionToast("");
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [sqlSelectionToast]);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFloatingIframeOpen, setIsFloatingIframeOpen] = useState(false);
  const [compactSearchStatus, setCompactSearchStatus] = useState(
    "Busca por nro. operación o importe en la pestaña activa.",
  );
  const [compactSearchTone, setCompactSearchTone] = useState("neutral");
  const [isCompactSearching, setIsCompactSearching] = useState(false);
  // Estado para mostrar tiempo transcurrido
  const [elapsedTime, setElapsedTime] = useState("");
  const [receivedTime, setReceivedTime] = useState("");

  useEffect(() => {
    setCompactSearchTone("neutral");
  }, [deposit?.id]);

  // Estados para configuración de mensajes
  const [yCloudConfigId, setYCloudConfigId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [yCloudConfigs, setYCloudConfigs] = useState([]);

  const resolveActiveYCloudConfigId = useCallback(async () => {
    if (yCloudConfigId) return yCloudConfigId;

    try {
      const configs = await yCloudService.listActiveConfigs();
      setYCloudConfigs(configs);

      const activeConfigId = configs?.[0]?.id ? String(configs[0].id) : "";
      if (activeConfigId) {
        setYCloudConfigId(activeConfigId);
      }
      return activeConfigId;
    } catch (error) {
      console.error("Error resolviendo configuración activa de YCloud:", error);
      return "";
    }
  }, [yCloudConfigId]);

  // Estado de loading global para botones principales
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para edición de datos del solicitante
  const [editingSolicitante, setEditingSolicitante] = useState(false);
  const [searchTrabajador, setSearchTrabajador] = useState("");
  const [trabajadoresEncontrados, setTrabajadoresEncontrados] = useState([]);
  const [buscandoTrabajador, setBuscandoTrabajador] = useState(false);
  const [solicitanteData, setSolicitanteData] = useState({
    trabajador_id: null,
    trabajador_nombre: "",
    sucursal_id: null,
    sucursal_nombre: "",
    telefono_origen: "",
  });

  const isTypingTarget = useCallback((target) => {
    if (!target) return false;

    if (target.isContentEditable) return true;

    const tagName = target.tagName?.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select";
  }, []);

  // Hook de WhatsApp
  const {
    loading: whatsappLoading,
    error: whatsappError,
    success: whatsappSuccess,
    sendDepositValidatedNotification,
    sendDepositRejectedNotification,
  } = useWhatsApp();

  // Función para formatear teléfono para WhatsApp URL
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.length === 9 && cleaned.startsWith("9")) {
      cleaned = "51" + cleaned;
    }
    return cleaned;
  };

  const formatPhoneForYCloud = (phone) => {
    const formatted = formatPhoneForWhatsApp(phone);
    if (!formatted) return "";
    return formatted.startsWith("+") ? formatted : `+${formatted}`;
  };

  const buildWhatsAppMessageLink = (phone, message) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone || !message) return "";
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const openWhatsAppMessageLink = (phone, message, contextLabel = "mensaje") => {
    const link = buildWhatsAppMessageLink(phone, message);
    if (!link) {
      alert(`No hay número de teléfono disponible para abrir WhatsApp ${contextLabel}.`);
      return false;
    }

    window.open(link, "_blank", "noopener,noreferrer");
    return true;
  };

  const buildYCloudReplyOptions = useCallback(
    (replyMessageId, forceReply = false) => {
      if ((!replyToWhatsAppMessages && !forceReply) || !replyMessageId) {
        return {};
      }

      return {
        context: { message_id: replyMessageId },
        replyToMessageId: replyMessageId,
      };
    },
    [replyToWhatsAppMessages],
  );

  const buildYCloudMessagePayload = useCallback(
    ({ configId, to, text, replyMessageId, forceReply = false }) => ({
      configId,
      to,
      text,
      ...buildYCloudReplyOptions(replyMessageId, forceReply),
    }),
    [buildYCloudReplyOptions],
  );

  // Función para abrir WhatsApp Web
  const openWhatsAppChat = () => {
    const telefono =
      deposit.trabajador?.telefono_origen || deposit.sucursal?.telefono;
    const formattedPhone = formatPhoneForWhatsApp(telefono);
    if (!formattedPhone) {
      alert("No hay número de teléfono disponible");
      return;
    }
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  const buildConfirmationMessage = ({ empresa, banco, fechaDeposito, operacion, moneda, monto }) => {
    const formatearFechaDeposito = (fechaString) => {
      if (!fechaString) return "-";
      const [year, month, day] = String(fechaString).split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    };

    return `🎉 *DEPÓSITO CONFIRMADO*

✅ *Empresa:* ${empresa?.nombre || "-"}
📍 *Sucursal:* ${deposit.sucursal?.nombre || "-"}
🏦 *Banco:* ${banco?.nombre || "-"}
🔢 *Anexo:* ${editableData.anexo}
📅 *Fecha Depósito:* ${formatearFechaDeposito(fechaDeposito)}
🆔 *Operación:* ${operacion || deposit.numero_operacion || "-"}
💰 *Importe:* ${moneda || editableData.moneda || "-"} ${Number(monto || editableData.monto || 0).toFixed(2)}

El depósito ha sido validado y confirmado exitosamente.

_Mensaje automático del sistema de control de depósitos_`;
  };

  const buildRejectionMessage = (reason) => `❌ *DEPÓSITO RECHAZADO*

⚠️ *Su depósito no ha sido aprobado*

📝 *Motivo del rechazo:*
${reason}`;

  const rejectedObservationText = [
    String(deposit?.observaciones || "").trim(),
    String(deposit?.motivo_rechazo || "").trim(),
  ].filter(Boolean);
  const rejectedObservationSummary = rejectedObservationText.join(" • ");

  const getConversationPhoneNumber = useCallback(() => {
    return (
      deposit?.trabajador?.telefono_origen ||
      deposit?.trabajador?.telefono ||
      deposit?.telefono_origen ||
      deposit?.telefono_contacto ||
      deposit?.sucursal?.telefono ||
      ""
    );
  }, [deposit]);

  const openConversationModal = () => {
    if (!getConversationPhoneNumber()) {
      alert("No hay número de teléfono disponible para esta conversación.");
      return;
    }
    setIsConversationModalOpen(true);
  };

  const closeSqlMovementsModal = useCallback(() => {
    setIsSqlMovementsModalOpen(false);
    setSqlMovementsError("");
    setSqlMovementsActionMessage("");
    setSqlCortadoError("");
  }, []);

  const fetchSqlServerRows = useCallback(
    async ({
      endpoint,
      searchValue,
      fechaInicio,
      fechaFin,
      period,
      paginate = true,
      limit = 1000,
      offset = 0,
      filters = {},
    }) => {
      const { empresa, empresaNombre } = getSqlServerCompanyConfigFromEmpresaId(
        editableData.empresa_id,
        empresas,
      );
      if (!empresa) {
        throw new Error("Selecciona una empresa válida en el modal Detalle depósito.");
      }
      const defaultRange = getSqlServerDefaultRange();
      const effectiveFechaInicio = fechaInicio || defaultRange.fechaInicio;
      const effectiveFechaFin = fechaFin || defaultRange.fechaFin;
      const pageSize = Math.max(Number(limit) || 1000, 1);
      let currentOffset = Math.max(Number(offset) || 0, 0);
      let loadedRows = [];
      let lastMeta = null;

      const makeRequest = async (requestOffset) => {
        const params = new URLSearchParams({
          empresa,
          empresaNombre,
        });

        if (searchValue) {
          params.set("searchTerm", searchValue);
        }

        if (filters.nroOperacion) {
          params.set("nroOperacion", filters.nroOperacion);
        }
        if (filters.banco) {
          params.set("banco", filters.banco);
        }
        if (filters.fecha) {
          params.set("fecha", filters.fecha);
        }
        if (filters.importe) {
          params.set("importe", filters.importe);
        }

        if (period) {
          params.set("period", period);
        } else {
          params.set("fechaInicio", effectiveFechaInicio);
          params.set("fechaFin", effectiveFechaFin);
        }

        params.set("limit", String(pageSize));
        params.set("offset", String(requestOffset));

        const response = await apiGet(`/sqlserver/${endpoint}?${params.toString()}`);
        const rows = Array.isArray(response?.data) ? response.data : [];
        return { rows, meta: response?.meta || null };
      };

      if (!paginate) {
        const response = await makeRequest(currentOffset);
        loadedRows = response.rows;
        lastMeta = response.meta;
      } else {
        while (true) {
          const response = await makeRequest(currentOffset);
          const rows = response.rows;
          lastMeta = response.meta;
          loadedRows = loadedRows.concat(rows);

          if (rows.length < pageSize) {
            break;
          }

          currentOffset += pageSize;
        }
      }

      return {
        rows: loadedRows,
        meta: lastMeta
          ? {
              ...lastMeta,
              count: loadedRows.length,
            }
          : { count: loadedRows.length },
      };
    },
    [editableData.empresa_id, empresas],
  );

  const loadSqlMovements = useCallback(
    async (searchOverride = null) => {
      if (!isBackendConnected) {
        setSqlMovementsError("Debes iniciar sesión para consultar los movimientos.");
        return;
      }

      const searchValue =
        searchOverride !== null
          ? String(searchOverride || "").trim()
          : String(sqlMovementsSearch || "").trim();

      setSqlMovementsLoading(true);
      setSqlMovementsError("");

      try {
        const { rows, meta } = await fetchSqlServerRows({
          endpoint: "movimientos-por-identificar",
          searchValue,
        });
        setSqlMovementsRows(rows.map(normalizeSqlServerRow));
        setSqlMovementsMeta(meta);
      } catch (error) {
        console.error("Error consultando movimientos SQL:", error);
        setSqlMovementsRows([]);
        setSqlMovementsMeta(null);
        setSqlMovementsError(error.message || "No se pudieron cargar los movimientos.");
      } finally {
        setSqlMovementsLoading(false);
      }
    },
    [fetchSqlServerRows, isBackendConnected, sqlMovementsSearch],
  );

  const loadSqlCortado = useCallback(
    async (pageOverride = 1) => {
      if (!isBackendConnected) {
        setSqlCortadoError("Debes iniciar sesión para consultar los movimientos.");
        return;
      }

      const period = String(sqlCortadoPeriod || "").trim();
      if (!getSqlPeriodRangeFromYYYYMM(period)) {
        setSqlCortadoError("Selecciona un periodo válido en formato YYYYMM, por ejemplo 202606.");
        return;
      }

      setSqlCortadoLoading(true);
      setSqlCortadoError("");

      try {
        const searchValue = "";
        const safePage = Math.max(Number(pageOverride) || 1, 1);
        const offset = (safePage - 1) * sqlCortadoPageSize;
        const { rows, meta } = await fetchSqlServerRows({
          endpoint: "cortado-vs-registros",
          period,
          searchValue,
          filters: {
            nroOperacion: sqlCortadoNroOperacionFilter.trim(),
            banco: sqlCortadoBancoFilter.trim(),
            fecha: sqlCortadoFechaFilter.trim(),
            importe: sqlCortadoImporteFilter.trim(),
          },
          paginate: false,
          limit: sqlCortadoPageSize,
          offset,
        });
        setSqlCortadoRows(rows.map(normalizeSqlServerRow));
        setSqlCortadoMeta(meta);
        setSqlCortadoPage(safePage);
        setSqlCortadoTotalCount(Number(meta?.totalCount || rows.length || 0));
      } catch (error) {
        console.error("Error consultando cortado SQL:", error);
        setSqlCortadoRows([]);
        setSqlCortadoMeta(null);
        setSqlCortadoTotalCount(0);
        setSqlCortadoError(error.message || "No se pudieron cargar los movimientos.");
      } finally {
        setSqlCortadoLoading(false);
      }
    },
    [
      fetchSqlServerRows,
      isBackendConnected,
      sqlCortadoBancoFilter,
      sqlCortadoFechaFilter,
      sqlCortadoImporteFilter,
      sqlCortadoNroOperacionFilter,
      sqlCortadoPageSize,
      sqlCortadoPeriod,
    ],
  );

  const exportSqlMovementsToExcel = useCallback(async () => {
    const rowsToExport = sqlActiveTab === "cortado" ? sqlCortadoRows : sqlMovementsRows;

    if (!rowsToExport.length) {
      setSqlMovementsError("No hay movimientos para exportar.");
      return;
    }

    try {
      const { utils, writeFile } = await import("xlsx");
      const exportRows =
        sqlActiveTab === "cortado"
          ? rowsToExport.map((row) => ({
              ID: row.ID || "-",
              Periodo: row.PERIODO || "-",
              Banco: row.BANCO || "-",
              CUO: row.CUO || "-",
              Cta: row.CTA || "-",
              Fecha: formatSqlMovementDate(row.FECHA),
              Descripción: row.DESCRIPCION || "-",
              NroOperacion: row.NRO_OPER || "-",
              Cargo: Number(row.CARGO || 0),
              Abono: Number(row.ABONO || 0),
              SD: row.SD || "-",
              Comp: row.COMP || "-",
              Tipo: row.TIPO || "-",
              Doc: row.DOC || "-",
              Area: row.AREA || "-",
              Registro: row.REGISTRO || "-",
              Reg: Number(row.REG || 0),
              Dif: Number(row.DIF || 0),
              Observación: row.OBSERVACION || "-",
            }))
          : rowsToExport.map((row) => ({
              Fecha: formatSqlMovementDate(row.FECHA),
              Banco: row.BANCO || "-",
              "Nro. operación": row.NRO_OPER || row.CUO || "-",
              Descripción: row.DESCRIPCION || "-",
              Abono: Number(row.ABONO || 0),
              Reg: Number(row.REG || 0),
              Sucursal: row.Sucursal || "-",
              Contacto: row.Contacto || "-",
              "Teléfono contacto": row.TelefonoContacto || "-",
              ValidadoPor: row.ValidadoPor || "-",
              "Fecha recibido": formatSqlMovementDate(row.FechaRecibido),
              Observación: row.OBSERVACION || "-",
            }));

      const ws = utils.json_to_sheet(exportRows);
      ws["!cols"] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 18 },
        { wch: 28 },
        { wch: 14 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 20 },
        { wch: 18 },
        { wch: 40 },
      ];

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, sqlActiveTab === "cortado" ? "Cortado" : "Movimientos");

      const exportDate = new Date();
      const suffix = `${exportDate.getFullYear()}${String(exportDate.getMonth() + 1).padStart(2, "0")}${String(
        exportDate.getDate(),
      ).padStart(2, "0")}`;
      const fileName =
        sqlActiveTab === "cortado"
          ? `cortado_vs_registros_${suffix}.xlsx`
          : `movimientos_por_identificar_${suffix}.xlsx`;
      writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exportando movimientos a Excel:", error);
      setSqlMovementsError(error.message || "No se pudo exportar a Excel.");
    }
  }, [sqlActiveTab, sqlCortadoRows, sqlMovementsRows]);

  const exportSqlCortadoToExcel = useCallback(() => {
    if (sqlActiveTab !== "cortado") return;
    return exportSqlMovementsToExcel();
  }, [exportSqlMovementsToExcel, sqlActiveTab]);

  const openSqlMovementsModal = useCallback(() => {
    if (!deposit?.es_antiguo) return;
    setSqlMovementsError("");
    setSqlMovementsActionMessage("");
    setSqlCortadoError("");
    setSqlMovementsRows([]);
    setSqlMovementsMeta(null);
    setSqlCortadoRows([]);
    setSqlCortadoMeta(null);
    setSqlCortadoPeriod("");
    setSqlActiveTab("movimientos");
    setSqlSelectedMovement(null);
    setIsSqlMovementsModalOpen(true);
    void loadSqlMovements("");
  }, [deposit?.es_antiguo, loadSqlMovements]);

  const extractSqlSelectionValues = useCallback((row) => {
    const selectedRow = row || null;
    const selectedNroOperacion = String(
      row?.NRO_OPER ??
        row?.NRO_OPERACION ??
        row?.numero_operacion_banco ??
        row?.numero_operacion ??
        row?.CUO ??
        row?.CUOA ??
        "",
    ).trim();
    const selectedFechaDeposito = normalizeDateForInput(
      row?.FECHA ?? row?.fecha ?? row?.fecha_deposito ?? "",
    );
    const selectedMontoRaw = row?.ABONO ?? 0;
    const selectedMonto =
      typeof selectedMontoRaw === "string"
        ? Number(selectedMontoRaw.replace(/[^\d.-]/g, ""))
        : Number(selectedMontoRaw);

    return {
      selectedRow,
      selectedNroOperacion,
      selectedFechaDeposito,
      selectedMonto,
    };
  }, []);

  const applySqlMovementSelectionToDeposit = useCallback(async (row) => {
    const {
      selectedRow,
      selectedNroOperacion,
      selectedFechaDeposito,
      selectedMonto,
    } = extractSqlSelectionValues(row);

    setSqlSelectedMovement(selectedRow);

    setEditableData((prev) => ({
      ...prev,
      numero_operacion_banco: selectedNroOperacion || prev.numero_operacion_banco,
      fecha_deposito: selectedFechaDeposito || prev.fecha_deposito,
      monto: Number.isFinite(selectedMonto) && selectedMonto > 0 ? selectedMonto : prev.monto,
    }));

    onUpdateDeposit({
      ...deposit,
      numero_operacion_banco:
        selectedNroOperacion || deposit?.numero_operacion_banco || deposit?.numero_operacion || "",
      numero_operacion:
        selectedNroOperacion || deposit?.numero_operacion || deposit?.numero_operacion_banco || "",
      fecha_deposito: selectedFechaDeposito || deposit?.fecha_deposito || null,
      monto: Number.isFinite(selectedMonto) && selectedMonto > 0 ? selectedMonto : deposit?.monto || 0,
    });
  }, [deposit, extractSqlSelectionValues, onUpdateDeposit]);

  const handleSelectSqlMovement = useCallback(async (row) => {
    setSqlSelectedMovement(row || null);
    await applySqlMovementSelectionToDeposit(row);
    setSqlSelectionToast("Campos cargados desde Movimientos por identificar.");
    closeSqlMovementsModal();
  }, [applySqlMovementSelectionToDeposit, closeSqlMovementsModal]);

  const handleSelectSqlCortado = useCallback(async (row) => {
    setSqlSelectedMovement(row || null);
    await applySqlMovementSelectionToDeposit(row);
    setSqlSelectionToast("Campos cargados desde Cortado vs RegistrosConcar.");
    closeSqlMovementsModal();
  }, [applySqlMovementSelectionToDeposit, closeSqlMovementsModal]);

  const persistSelectedSqlTipoIfNeeded = useCallback(async (traceLabel = "sql.persist") => {
    if (!sqlSelectedMovementId) {
      return null;
    }

    if (!isBackendConnected) {
      throw new Error("Debes iniciar sesión para ejecutar la actualización SQL.");
    }

    const tipo = getSqlMovementSelectionLabel(deposit);
    if (!tipo) {
      throw new Error("No se pudo resolver la persona y la sucursal del card.");
    }

    const { empresa, empresaNombre } = getSqlServerCompanyConfigFromEmpresaId(
      editableData.empresa_id,
      empresas,
    );
    if (!empresa) {
      throw new Error("Selecciona una empresa válida en el modal Detalle depósito.");
    }

    console.timeLog(traceLabel, "iniciando actualización SQL CONCAR");
    const response = await apiPost("/sqlserver/cortado-asignar-tipo", {
      empresa,
      empresaNombre,
      id: sqlSelectedMovementId,
      tipo,
    });
    console.timeLog(traceLabel, "respuesta SQL CONCAR recibida", {
      tipo: response?.data?.tipo || tipo,
    });

    const updatedTipo = response?.data?.tipo || tipo;
    setSqlMovementsRows((prev) =>
      prev.map((item) =>
        String(item.ID) === String(sqlSelectedMovementId)
          ? {
              ...item,
              TIPO: updatedTipo,
            }
          : item,
      ),
    );
    setSqlSelectedMovement((prev) =>
      prev && String(prev.ID) === String(sqlSelectedMovementId)
        ? {
            ...prev,
            TIPO: updatedTipo,
          }
        : prev,
    );
    console.timeLog(traceLabel, "estado local actualizado");
    return response;
  }, [deposit, editableData.empresa_id, empresas, isBackendConnected, sqlSelectedMovementId]);

  const sqlActiveVoucherUrl = useMemo(() => {
    const selectedMovementVoucher =
      sqlSelectedMovement?.URL_VOUCHER || sqlSelectedMovement?.url_voucher || "";

    if (sqlActiveTab === "movimientos" && selectedMovementVoucher) {
      return selectedMovementVoucher;
    }

    let voucherUrl = editableData.imagen_voucher || deposit?.imagen_voucher || "";
    if (
      voucherUrl &&
      voucherUrl.includes("drive.google.com/file/d/")
    ) {
      const fileId = voucherUrl.split("/d/")[1].split("/")[0];
      voucherUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return voucherUrl;
  }, [
    deposit?.imagen_voucher,
    editableData.imagen_voucher,
    sqlActiveTab,
    sqlSelectedMovement?.URL_VOUCHER,
    sqlSelectedMovement?.url_voucher,
  ]);

  const executeSqlMovementSelection = useCallback(
    async (row) => {
      if (!row) return;
      await handleSelectSqlMovement(row);
    },
    [handleSelectSqlMovement],
  );

  // Función para buscar trabajadores
  const buscarTrabajadores = async (searchTerm) => {
    if (!isBackendConnected || searchTerm.length < 2) {
      setTrabajadoresEncontrados([]);
      return;
    }

    setBuscandoTrabajador(true);
    try {
      const response = await apiGet('/personal/search?q=' + encodeURIComponent(searchTerm) + '&limit=10');
      setTrabajadoresEncontrados(response.data || []);
    } catch (error) {
      console.error('Error en b?squeda:', error);
    } finally {
      setBuscandoTrabajador(false);
    }
  };

  // Efecto para buscar trabajadores cuando cambia el texto de búsqueda
  useEffect(() => {
    if (editingSolicitante && searchTrabajador) {
      const timeoutId = setTimeout(() => {
        buscarTrabajadores(searchTrabajador);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setTrabajadoresEncontrados([]);
    }
  }, [searchTrabajador, editingSolicitante]);

  // Función para seleccionar trabajador
  const seleccionarTrabajador = (trabajador) => {
    setSolicitanteData({
      trabajador_id: trabajador.id,
      trabajador_nombre: trabajador.nombre,
      sucursal_id: trabajador.sucursal?.id || null,
      sucursal_nombre: trabajador.sucursal?.nombre || "",
      telefono_origen: trabajador.telefono_origen || "",
    });
    setSearchTrabajador(trabajador.nombre);
    setTrabajadoresEncontrados([]);
  };

  // Función para guardar cambios del solicitante
  const guardarCambiosSolicitante = async () => {
    if (!isBackendConnected || !solicitanteData.trabajador_id) {
      alert("Debe seleccionar un trabajador válido");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await apiPut(`/depositos/${deposit.id}`, {
        trabajador_sucursal_id: solicitanteData.trabajador_id,
        sucursal_id: solicitanteData.sucursal_id,
      });

      if (response.error) {
        console.error("Error actualizando solicitante:", response.error);
        alert(`Error al actualizar: ${response.error}`);
        return;
      }

      const trabajadorActualizado = {
        id: solicitanteData.trabajador_id,
        nombre: solicitanteData.trabajador_nombre,
        telefono_origen: solicitanteData.telefono_origen,
      };

      const sucursalActualizada = solicitanteData.sucursal_id
        ? {
            id: solicitanteData.sucursal_id,
            nombre: solicitanteData.sucursal_nombre,
          }
        : null;

      onUpdateDeposit({
        ...deposit,
        trabajador: trabajadorActualizado,
        sucursal: sucursalActualizada,
        trabajador_sucursal_id: solicitanteData.trabajador_id,
        sucursal_id: solicitanteData.sucursal_id,
      });

      setEditingSolicitante(false);
      alert("✅ Datos del solicitante actualizados correctamente");
    } catch (error) {
      console.error("Error guardando cambios:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para cancelar edición del solicitante
  const cancelarEdicionSolicitante = () => {
    setSolicitanteData({
      trabajador_id: deposit.trabajador?.id || null,
      trabajador_nombre: deposit.trabajador?.nombre || "",
      sucursal_id: deposit.sucursal?.id || null,
      sucursal_nombre: deposit.sucursal?.nombre || "",
      telefono_origen: deposit.trabajador?.telefono_origen || "",
    });
    setSearchTrabajador(deposit.trabajador?.nombre || "");
    setEditingSolicitante(false);
    setTrabajadoresEncontrados([]);
  };
  const isFieldsOnlyEdit = editMode === "fields-only";

  const activeEmpresas = empresas.filter((e) => e.estado === "activo");
  const activeBancos = bancos.filter((b) => b.estado === "activo");
  const selectedBanco = useMemo(() => {
    const bancoId = editableData.banco_id || deposit?.banco?.id || "";
    return (
      bancos.find((b) => String(b.id) === String(bancoId)) ||
      deposit?.banco ||
      null
    );
  }, [bancos, deposit?.banco, editableData.banco_id]);

  useEffect(() => {
    if (deposit) {
      setEditableData({
        empresa_id: deposit.empresa?.id || "",
        banco_id: deposit.banco?.id || "",
        anexo: deposit.anexo || "",
        monto: deposit.monto || 0,
        moneda: deposit.moneda || "PEN",
        numero_operacion_banco:
          deposit.numero_operacion_banco || deposit.numero_operacion || "",
        fecha_deposito: normalizeDateForInput(deposit.fecha_deposito),
        imagen_voucher: deposit.imagen_voucher || "",
        cliente: deposit.cliente || "",
        ruc_cliente: deposit.ruc_cliente || "",
        observaciones: deposit.observaciones || "",
        referencia_cliente: deposit.referencia_cliente || "",
      });

      // Inicializar datos del solicitante
      setSolicitanteData({
        trabajador_id: deposit.trabajador?.id || null,
        trabajador_nombre: deposit.trabajador?.nombre || "",
        sucursal_id: deposit.sucursal?.id || null,
        sucursal_nombre: deposit.sucursal?.nombre || "",
        telefono_origen: deposit.trabajador?.telefono_origen || "",
      });
      setCheckResult({ checked: false, isDuplicate: false, message: "" });
      setIsChecking(false);
      setSqlMovementsSearch("");
      setSqlMovementsRows([]);
      setSqlMovementsMeta(null);
      setSqlMovementsError("");
      setIsSqlMovementsModalOpen(false);

    }
  }, [deposit]);

  useEffect(() => {
    if (editableData.empresa_id && editableData.banco_id) {
      const relevantCuentas = cuentas.filter(
        (c) =>
          c.empresa_id === editableData.empresa_id &&
          c.banco_id === editableData.banco_id,
      );
      const anexos = [...new Set(relevantCuentas.map((c) => c.anexo))].filter(
        Boolean,
      );
      setFilteredAnexos(anexos);

      // Solo limpiar el anexo si no está en la lista, pero no asignar automáticamente el primero
      if (editableData.anexo && !anexos.includes(editableData.anexo)) {
        setEditableData((prev) => ({ ...prev, anexo: "" }));
      }
    } else {
      setFilteredAnexos([]);
    }
  }, [editableData.empresa_id, editableData.banco_id, cuentas]);

  // Chatwoot fue desactivado; se conserva el estado solo para compatibilidad temporal.

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    const loadYCloudConfigs = async () => {
      if (!isBackendConnected) return;

      try {
        const response = await apiGet('/ycloud/configs/active');
        const data = response.data || [];
        setYCloudConfigs(data);

        if (data && data.length > 0) {
          setYCloudConfigId(String(data[0].id));
          console.log('? Configuraci?n por defecto:', data[0].alias);
        }
      } catch (error) {
        console.error('Error al cargar configuraciones:', error);
      }
    };

    loadYCloudConfigs();
  }, [isBackendConnected]);

  // Calcular tiempo transcurrido y hora de recibido
  useEffect(() => {
    if (!deposit.fecha_registro) return;

    // Calcular hora de recibido (solo una vez)
    const registeredAt = new Date(deposit.fecha_registro);
    setReceivedTime(
      registeredAt.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );

    // Función para calcular tiempo transcurrido
    const calculateElapsed = () => {
      const now = new Date();
      const diffMs = now - registeredAt;
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);

      setElapsedTime(`${diffMins}:${diffSecs.toString().padStart(2, "0")}`);
    };

    // Calcular inmediatamente
    calculateElapsed();

    // Actualizar cada segundo
    const intervalId = setInterval(calculateElapsed, 1000);

    return () => clearInterval(intervalId);
  }, [deposit.fecha_registro]);

  const handleChange = (e) => {
    setCheckResult({ checked: false, isDuplicate: false, message: "" });
    const { name, value } = e.target;

    // Limpiar el número de operación banco: solo números, sin espacios, letras ni símbolos
    let cleanedValue = value;
    if (name === "numero_operacion_banco") {
      cleanedValue = value.replace(/\D/g, ""); // Eliminar todo lo que NO sea dígito (0-9)
    }

    setEditableData((prev) => {
      // Si cambia el banco, resetear el anexo a vacío para que se seleccione "Seleccionar"
      if (name === "banco_id") {
        return { ...prev, [name]: cleanedValue, anexo: "" };
      }
      return { ...prev, [name]: cleanedValue };
    });
  };

  const handleFileSelectFromPicker = (url) => {
    setEditableData((prev) => ({ ...prev, imagen_voucher: url }));
  };

  const handleCheckDuplicates = async () => {
    console.log("Iniciando comprobación de duplicados...", {
      numero_operacion: editableData.numero_operacion_banco,
      monto: editableData.monto,
      fecha_deposito: editableData.fecha_deposito,
      isBackendConnected,
    });

    if (!canCheckDuplicates) {
      setCheckResult({
        checked: true,
        isDuplicate: true,
        message:
          "Completa empresa, banco, anexo, moneda, importe, nro. de operación y fecha de depósito antes de comprobar duplicados.",
      });
      return;
    }

    setIsChecking(true);
    setCheckResult({ checked: false, isDuplicate: false, message: "" });

      if (!isBackendConnected) {
        console.log("Modo simulado: comprobación de duplicados no disponible");
        setTimeout(() => {
          setCheckResult({
            checked: true,
            isDuplicate: false,
            message: "Comprobación de duplicados no disponible en modo simulado.",
          });
          setDuplicateDeposits([]);
          if (shouldUseDuplicateModals) {
            openDuplicateModal("no_duplicate");
          }
          setIsChecking(false);
        }, 500);
        return;
      }

    try {
      const response = await apiPost('/depositos/check-duplicate', {
        monto: editableData.monto,
        moneda: editableData.moneda,
        numero_operacion_banco: editableData.numero_operacion_banco,
        excludeId: deposit.id,
      });

      const duplicates = response.duplicates || [];

      if (response.error) {
        console.error('Error en consulta backend:', response.error);
        setCheckResult({
          checked: true,
          isDuplicate: true,
          message: 'Error al comprobar: ' + response.error,
        });
        if (shouldUseDuplicateModals) {
          setDuplicateModalMode("none");
          setIsNoDuplicateModalOpen(false);
          setIsDuplicatesModalOpen(false);
        }
        setIsChecking(false);
        return;
      }

      if (duplicates.length > 0) {
        setDuplicateDeposits(duplicates);
        setCheckResult({
          checked: true,
          isDuplicate: true,
          message:
            response.message ||
            `¡Alerta de Duplicado! Se encontraron ${duplicates.length} depósito(s) con los mismos datos.`,
        });
        if (shouldUseDuplicateModals) {
          openDuplicateModal("duplicate");
        }
      } else {
        setDuplicateDeposits([]);
        setCheckResult({
          checked: true,
          isDuplicate: false,
          message: response.message || "No se encontraron duplicados. Puede confirmar el depósito.",
        });
        if (shouldUseDuplicateModals) {
          openDuplicateModal("no_duplicate");
        }
      }
    } catch (criticalError) {
      console.error("Error crítico en comprobación de duplicados:", criticalError);
      setCheckResult({
        checked: true,
        isDuplicate: true,
        message: "Error crítico: " + criticalError.message,
      });
      if (shouldUseDuplicateModals) {
        setDuplicateModalMode("none");
        setIsNoDuplicateModalOpen(false);
        setIsDuplicatesModalOpen(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const buildUpdatePayload = useCallback(
    (extraData) => {
      console.log("🏗️ buildUpdatePayload llamado con extraData:", extraData);

      let finalVoucherUrl = editableData.imagen_voucher || null;
      if (
        finalVoucherUrl &&
        finalVoucherUrl.includes("drive.google.com/file/d/")
      ) {
        const fileId = finalVoucherUrl.split("/d/")[1].split("/")[0];
        finalVoucherUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }

      const finalPayload = {
        ...extraData,
        empresa_id: editableData.empresa_id || null,
        banco_id: editableData.banco_id || null,
        anexo: editableData.anexo || null,
        monto: parseFloat(editableData.monto) || 0,
        moneda: editableData.moneda || "PEN",
        numero_operacion_banco: editableData.numero_operacion_banco || null,
        fecha_deposito: editableData.fecha_deposito || null,
        imagen_voucher: finalVoucherUrl,
        cliente: editableData.cliente || null,
        ruc_cliente: editableData.ruc_cliente || null,
        observaciones: editableData.observaciones || null,
        referencia_cliente: editableData.referencia_cliente || null,
      };

      console.log("🎯 buildUpdatePayload resultado final:", finalPayload);
      return finalPayload;
    },
    [editableData],
  );

  const handleConfirmDeposit = () => {
    console.log("🔄 handleConfirmDeposit ejecutado - Inicio validación", {
      canConfirm,
      checkResult,
      isChecking,
      editableData: {
        empresa_id: editableData.empresa_id,
        banco_id: editableData.banco_id,
        anexo: editableData.anexo,
        moneda: editableData.moneda,
      },
    });

    // Validar campos requeridos
    const camposRequeridos = [];

    if (!editableData.empresa_id) {
      camposRequeridos.push("Empresa");
    }

    if (!editableData.banco_id) {
      camposRequeridos.push("Banco");
    }

    if (!editableData.anexo) {
      camposRequeridos.push("Anexo");
    }

    if (!editableData.moneda) {
      camposRequeridos.push("Moneda");
    }

    // Si faltan campos, mostrar error y no continuar
    if (camposRequeridos.length > 0) {
      const mensaje = `Por favor, seleccione los siguientes campos requeridos: ${camposRequeridos.join(
        ", ",
      )}`;
      alert(mensaje);
      console.error("❌ Validación fallida:", {
        camposRequeridos,
        editableData,
      });
      return;
    }

    console.log("✅ Validación exitosa, confirmando depósito...", {
      empresa_id: editableData.empresa_id,
      banco_id: editableData.banco_id,
      anexo: editableData.anexo,
      moneda: editableData.moneda,
    });

    const payload = buildUpdatePayload({
      estado: "validado",
      motivo_rechazo: null,
      validado_por: currentUser.id,
      fecha_validacion: new Date().toISOString(),
    });

    console.log("📤 Enviando actualización del depósito:", {
      depositId: deposit.id,
      payload: payload,
      onUpdateDeposit: typeof onUpdateDeposit,
    });

    // Actualizar el depósito preservando las relaciones
    onUpdateDeposit({
      ...deposit, // Preservar todo el depósito original (incluyendo relaciones)
      ...payload, // Sobrescribir solo los campos actualizados
    });

    // Enviar confirmación WhatsApp a la sucursal (no bloqueante)
    console.log("📱 INICIO DEBUG WhatsApp - Datos disponibles:", {
      depositSucursal: deposit.sucursal,
      empresasLength: empresas?.length,
      bancosLength: bancos?.length,
      editableData_empresa_id: editableData.empresa_id,
      editableData_banco_id: editableData.banco_id,
    });

    try {
      const empresa = empresas?.find((e) => e.id === editableData.empresa_id);
      const banco = bancos?.find((b) => b.id === editableData.banco_id);

      // Obtener teléfono de la sucursal
      const sucursalTelefono = deposit.sucursal?.telefono;

      console.log("📱 VALIDACION WhatsApp - Elementos encontrados:", {
        empresa: empresa ? { id: empresa.id, nombre: empresa.nombre } : null,
        banco: banco ? { id: banco.id, nombre: banco.nombre } : null,
        sucursalTelefono: sucursalTelefono,
        sucursalNombre: deposit.sucursal?.nombre,
      });

      if (empresa && banco) {
        if (sucursalTelefono) {
          // Preparar datos para el mensaje de WhatsApp
          const depositData = {
            empresa: empresa.nombre,
            sucursalNombre: deposit.sucursal.nombre,
            banco: banco.nombre,
            anexo: editableData.anexo,
            fechaDeposito: editableData.fecha_deposito,
            numeroOperacion:
              editableData.numero_operacion_banco || deposit.numero_operacion,
            monto: editableData.monto,
            moneda: editableData.moneda,
          };

          // Ejecutar en segundo plano para no bloquear la UI
          whatsappService
            .sendDepositConfirmation(depositData, sucursalTelefono)
            .then((result) => {
              if (result.success) {
                console.log("✅ Confirmación enviada a sucursal:", {
                  sucursal: deposit.sucursal.nombre,
                  telefono: result.phone,
                  messageId: result.messageId,
                });
              } else {
                console.warn(
                  "⚠️ No se pudo enviar confirmación a sucursal:",
                  result.error,
                );
              }
            })
            .catch((error) => {
              console.warn(
                "❌ Error enviando confirmación WhatsApp a sucursal:",
                error,
              );
            });
        } else {
          console.warn("⚠️ WhatsApp no enviado: sucursal sin teléfono", {
            sucursal: deposit.sucursal?.nombre,
            empresa: empresa.nombre,
            banco: banco.nombre,
            mensaje:
              "Depósito confirmado correctamente, pero no se pudo enviar WhatsApp porque la sucursal no tiene teléfono registrado.",
          });
        }
      } else {
        console.error("❌ WHATSAPP BLOQUEADO - Faltan datos necesarios:", {
          sucursalTelefono: sucursalTelefono || "❌ FALTA TELEFONO",
          telefonoValido: !!sucursalTelefono,
          empresa: empresa
            ? `✅ ${empresa.nombre}`
            : "❌ EMPRESA NO ENCONTRADA",
          empresaValida: !!empresa,
          banco: banco ? `✅ ${banco.nombre}` : "❌ BANCO NO ENCONTRADO",
          bancoValido: !!banco,
          sucursalCompleta: deposit.sucursal,
          empresaId_buscada: editableData.empresa_id,
          bancoId_buscado: editableData.banco_id,
        });
      }
    } catch (error) {
      console.warn("❌ Error preparando confirmación WhatsApp:", error);
    }

    onClose();
  };

  const handleToggleEsAntiguo = async () => {
    if (isProcessing) return; // Evitar múltiples clics

    setIsProcessing(true);
    const trace = `deposit.revision:${deposit.id}`;
    console.time(trace);
    console.log("▶️ Inicio flujo revisión/antiguo", {
      depositId: deposit.id,
      estadoActual: deposit.estado,
      esAntiguoActual: deposit.es_antiguo,
    });
    const newValue = !deposit.es_antiguo;
    console.log("🏷️ Cambiando marca de antiguo:", {
      depositId: deposit.id,
      estadoActual: deposit.estado,
      esAntiguoActual: deposit.es_antiguo,
      nuevoValor: newValue,
      backendDisponible: true,
    });

    // ACTUALIZACIÓN OPTIMISTA INMEDIATA
    const updatedDeposit = {
      ...deposit,
      es_antiguo: newValue,
    };

    // Actualizar UI inmediatamente
    onUpdateDeposit(updatedDeposit);
    console.log("⚡ UI actualizada optimísticamente");

    try {
      console.log("📤 Enviando UPDATE al backend...");
      const startTime = Date.now();

      const response = await apiPut(`/depositos/${deposit.id}`, {
        es_antiguo: newValue,
      });
      const data = response.data;

      const endTime = Date.now();
      console.log(`⏱️ UPDATE completado en ${endTime - startTime}ms`);

      if (response.error) {
        // Revertir cambio optimista si falla
        console.error("❌ Error actualizando es_antiguo:", response.error);
        console.error("Error completo:", JSON.stringify(response.error, null, 2));
        onUpdateDeposit(deposit); // Revertir al estado original
        alert(`Error al actualizar: ${response.error}`);
        return;
      }

      console.log("✅ Marca de antiguo sincronizada con servidor");
      console.log("📦 Respuesta del backend:", data);

      // Si se marcó como antiguo Y tiene configuración, enviar mensaje automático
      if (newValue && yCloudConfigId) {
        console.log("📨 Enviando mensaje automático de depósito antiguo...");

        const mensajeAntiguo = `⚠️ *Voucher en Revisión*

El depósito es de día(s) anterior(es), se está realizando los cruces de información, apenas se termine se atenderá.

*No volver a enviar el voucher.*

Gracias por su comprensión.`;

        try {
          // Obtener teléfono del trabajador o sucursal
          const telefonoContacto =
            deposit.trabajador?.telefono_origen || deposit.sucursal?.telefono;

          if (telefonoContacto) {
            console.timeLog(trace, "teléfono resuelto");
            const telefonoFormateado = formatPhoneForYCloud(telefonoContacto);

            const replyMessageId = getReplyMessageIdFromDeposit(deposit);
            console.log("📤 Payload revisión", {
              to: telefonoFormateado,
              replyToMessageId: replyMessageId || null,
              configId: yCloudConfigId,
            });

            console.timeLog(trace, "enviando a YCloud");
            const result = await yCloudService.sendTextMessage(
              buildYCloudMessagePayload({
                configId: yCloudConfigId,
                to: telefonoFormateado,
                text: mensajeAntiguo,
                replyMessageId,
                forceReply: true,
              }),
            );
            console.timeLog(trace, "respuesta YCloud", {
              success: result.success,
              messageId: result.data?.id || null,
            });

            if (result.success) {
              console.timeEnd(trace);
              console.log(
                "✅ Mensaje de depósito antiguo enviado:",
                result.data?.id,
                getReplyMessageIdFromDeposit(deposit)
                  ? "(como respuesta)"
                  : "(sin mensaje para responder)",
              );
              alert(`✅ Mensaje enviado:\n\n${mensajeAntiguo}`);
            } else {
              console.timeEnd(trace);
              console.warn(
                "⚠️ No se pudo enviar mensaje de depósito antiguo:",
                result.message,
              );
              alert(`⚠️ No se pudo enviar el mensaje:\n${result.message}`);
            }
          } else {
            console.timeEnd(trace);
            console.warn(
              "⚠️ No hay teléfono disponible para enviar mensaje de depósito antiguo",
            );
            alert(
              "⚠️ Depósito marcado como antiguo, pero no se pudo enviar mensaje (sin teléfono).",
            );
          }
        } catch (error) {
          console.timeEnd(trace);
          console.warn("❌ Error enviando mensaje de depósito antiguo:", error);
          alert(`❌ Error al enviar mensaje:\n${error.message}`);
        }
      }
    } catch (error) {
      console.error("❌ Error inesperado:", error);
      console.error("Stack trace:", error.stack);
      onUpdateDeposit(deposit); // Revertir al estado original
      alert(`Error inesperado: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRejection = async (reason) => {
    return handleConfirmRejectionWithMode(reason, "ycloud");
  };

  const handleConfirmRejectionWithMode = async (reason, mode = "ycloud") => {
    if (isProcessing) return; // Evitar múltiples clics

    setIsProcessing(true);
    const trace = `deposit.reject:${deposit.id}:${mode}`;
    console.time(trace);
    console.log(
      `❌ Rechazando depósito (${mode === "link" ? "link" : "YCloud"}) - NO se requiere validación de campos`,
      {
        depositId: deposit.id,
        motivo: reason,
        validadoPor: currentUser.nombre,
      },
    );

    // Para rechazar, solo actualizamos el estado y motivo, sin modificar otros campos
    // No se requiere empresa, banco, anexo, moneda, etc.
    let finalPayload = {
      estado: "rechazado",
      motivo_rechazo: reason,
      validado_por: currentUser.id,
      fecha_validacion: new Date().toISOString(),
    };

    const telefonoContacto =
      deposit.trabajador?.telefono_origen || deposit.sucursal?.telefono;
    const mensajeRechazo = buildRejectionMessage(reason);

    // Enviar mensaje de rechazo si hay configuración o abrir link de WhatsApp
    if (mode === "link") {
      console.timeEnd(trace);
      const linkOpened = openWhatsAppMessageLink(
        telefonoContacto,
        mensajeRechazo,
        "del rechazo",
      );

      if (linkOpened) {
        console.log("✅ Link de WhatsApp preparado para rechazo");
        alert(`✅ Depósito rechazado. Se abrió WhatsApp con el mensaje listo:\n\n${mensajeRechazo}`);
      } else {
        console.warn("⚠️ No se pudo abrir WhatsApp para el rechazo");
        alert(
          "⚠️ Depósito rechazado, pero no se pudo abrir WhatsApp (sin teléfono).",
        );
      }
    } else {
      try {
        console.timeLog(trace, "resolviendo configuración YCloud");
        const activeYCloudConfigId = await resolveActiveYCloudConfigId();
        console.timeLog(trace, "configuración resuelta", { activeYCloudConfigId });

        console.log("📱 Enviando rechazo:", {
          configId: activeYCloudConfigId || yCloudConfigId,
        });

        if (activeYCloudConfigId && telefonoContacto) {
          const telefonoFormateado = formatPhoneForYCloud(telefonoContacto);
          const replyMessageId = getReplyMessageIdFromDeposit(deposit);
          console.log("📤 Payload rechazo", {
            to: telefonoFormateado,
            replyToMessageId: replyMessageId || null,
            configId: activeYCloudConfigId,
          });

          console.timeLog(trace, "enviando a YCloud");
          const result = await yCloudService.sendTextMessage(
            buildYCloudMessagePayload({
              configId: activeYCloudConfigId,
              to: telefonoFormateado,
              text: mensajeRechazo,
              replyMessageId,
              forceReply: true,
            }),
          );
          console.timeLog(trace, "respuesta YCloud", {
            success: result.success,
            messageId: result.data?.id || null,
          });

          if (result.success) {
            console.timeEnd(trace);
            console.log(
              "✅ Rechazo enviado:",
              result.data?.id,
              replyMessageId ? "(como respuesta)" : "(sin mensaje para responder)",
              result.logInserted ? "(guardado en whatsapp_mensajes_log)" : "(sin log confirmado)",
            );
            alert(`✅ Rechazo enviado:\n\n${mensajeRechazo}`);
          } else {
            console.timeEnd(trace);
            console.warn("⚠️ No se pudo enviar rechazo:", result.message);
            alert(`⚠️ No se pudo enviar el rechazo:\n${result.message}`);
          }
        } else {
          console.timeEnd(trace);
          if (!activeYCloudConfigId) {
            console.warn("⚠️ No hay configuración activa de YCloud para enviar el rechazo");
          }
          if (!telefonoContacto) {
            console.warn("⚠️ No hay teléfono disponible para enviar mensaje de rechazo");
          }
          alert(
            "⚠️ Depósito rechazado, pero no se pudo enviar mensaje (sin configuración activa o sin teléfono).",
          );
        }
      } catch (error) {
        console.timeEnd(trace);
        console.warn("❌ Error enviando rechazo:", error);
        alert(`❌ Error al enviar rechazo:\n${error.message}`);
      }
    }

    // Actualizar el depósito con el payload final preservando las relaciones
    onUpdateDeposit({
      ...deposit, // Preservar todo el depósito original (incluyendo relaciones)
      ...finalPayload, // Sobrescribir solo los campos actualizados
    });

    setIsRejectionModalOpen(false);
    setIsProcessing(false);
    onClose();
  };

  const handleRestoreToPending = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    console.log("↩️ Restaurando depósito a pendiente:", {
      depositId: deposit.id,
      estadoActual: deposit.estado,
    });

    const payload = buildUpdatePayload({
      estado: "pendiente",
      motivo_rechazo: null,
      validado_por: null,
      fecha_validacion: null,
    });

    try {
      const response = await apiPut(`/depositos/${deposit.id}`, payload);
      if (response.error) {
        throw new Error(response.error);
      }

      onUpdateDeposit({
        ...deposit,
        ...payload,
      });

      setCheckResult({ checked: false, isDuplicate: false, message: "" });
      setDuplicateDeposits([]);
      setDuplicateModalMode("none");
      setIsDuplicatesModalOpen(false);
      setIsNoDuplicateModalOpen(false);
      setIsRejectionModalOpen(false);

      alert("✅ Depósito restaurado a pendiente correctamente.");
      onClose();
    } catch (error) {
      console.error("❌ Error restaurando a pendiente:", error);
      alert(`❌ Error al restaurar a pendiente:\n${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDepositWithMessage = async () => {
    const trace = `deposit.confirm:${deposit.id}`;
    console.time(trace);
    if (!checkResult.checked) {
      console.timeEnd(trace);
      alert("Primero debes comprobar duplicados y confirmar que no hay duplicados.");
      return;
    }

    if (checkResult.isDuplicate) {
      console.timeEnd(trace);
      alert("No puedes confirmar mientras el depósito esté marcado como duplicado.");
      return;
    }

    console.log(
      "🔄 handleConfirmDepositWithMessage ejecutado - Inicio validación",
      {
        yCloudConfigId,
        yCloudConfigs: yCloudConfigs.length,
        editableData: {
          empresa_id: editableData.empresa_id,
          banco_id: editableData.banco_id,
          anexo: editableData.anexo,
          moneda: editableData.moneda,
        },
        sucursal: deposit.sucursal,
        trabajador: deposit.trabajador,
        sucursalTelefono:
          deposit.trabajador?.telefono_origen || deposit.sucursal?.telefono,
      },
    );

    // ⭐ ANÁLISIS COMPLETO DE TELÉFONOS - FORZAR LOG
    console.log("🔍 DEBUG - ANÁLISIS COMPLETO DE TELÉFONOS:", {
      deposit_completo: deposit,
      trabajador: deposit.trabajador,
      telefono_origen: deposit.trabajador?.telefono_origen,
      sucursal: deposit.sucursal,
      sucursal_telefono: deposit.sucursal?.telefono,
      telefonoDisponible:
        deposit.trabajador?.telefono_origen || deposit.sucursal?.telefono,
      todas_las_propiedades_deposit: Object.keys(deposit),
      todas_las_propiedades_trabajador: deposit.trabajador
        ? Object.keys(deposit.trabajador)
        : null,
      todas_las_propiedades_sucursal: deposit.sucursal
        ? Object.keys(deposit.sucursal)
        : null,
    });

    // Validar campos requeridos del depósito
    const camposRequeridos = [];

    if (!editableData.empresa_id) {
      camposRequeridos.push("Empresa");
    }

    if (!editableData.banco_id) {
      camposRequeridos.push("Banco");
    }

    if (!editableData.anexo) {
      camposRequeridos.push("Anexo");
    }

    if (!editableData.moneda) {
      camposRequeridos.push("Moneda");
    }

    // Si faltan campos, mostrar error y no continuar
    if (camposRequeridos.length > 0) {
      console.timeEnd(trace);
      const mensaje = `Por favor, complete los siguientes campos requeridos: ${camposRequeridos.join(
        ", ",
      )}`;
      alert(mensaje);
      console.error("❌ Validación fallida:", {
        camposRequeridos,
        editableData,
      });
      return;
    }

    // Verificar si se puede enviar mensaje (opcional)
    const telefonoDisponible =
      deposit.trabajador?.telefono_origen ||
      deposit.trabajador?.telefono ||
      deposit.telefono_contacto ||
      deposit.sucursal?.telefono ||
      "";

    console.log("✅ Validación exitosa, confirmando depósito...", {
      tieneConfig: !!yCloudConfigId,
      tieneTelefono: !!telefonoDisponible,
    });
    console.timeLog(trace, "validación completada");

    const payload = buildUpdatePayload({
      estado: "validado",
      motivo_rechazo: null,
      validado_por: currentUser.id,
      fecha_validacion: new Date().toISOString(),
    });

    console.log("📤 Enviando actualización del depósito:", {
      depositId: deposit.id,
      payload: payload,
    });

    // Enviar confirmación
    setIsSending(true);
    setIsProcessing(true);

    try {
      const empresa = empresas?.find((e) => e.id === editableData.empresa_id);
      const banco = bancos?.find((b) => b.id === editableData.banco_id);

      console.log("🔍 Datos encontrados:", {
        empresa: empresa ? { id: empresa.id, nombre: empresa.nombre } : null,
        banco: banco ? { id: banco.id, nombre: banco.nombre } : null,
      });

      // Siempre actualizar el depósito primero
      onUpdateDeposit({
        ...deposit,
        ...payload,
      });

      console.timeLog(trace, "resolviendo configuración YCloud");
      const activeYCloudConfigId = await resolveActiveYCloudConfigId();
      console.timeLog(trace, "configuración resuelta", { activeYCloudConfigId });

      // Intentar enviar mensaje solo si es posible
      if (activeYCloudConfigId && telefonoDisponible && empresa && banco) {
        const mensajeConfirmacion = buildConfirmationMessage({
          empresa,
          banco,
          fechaDeposito: editableData.fecha_deposito,
          operacion: editableData.numero_operacion_banco || deposit.numero_operacion,
          moneda: editableData.moneda,
          monto: editableData.monto,
        });
        console.timeLog(trace, "mensaje armado", { length: mensajeConfirmacion.length });

        const telefonoFormateado = formatPhoneForYCloud(telefonoDisponible);

        const replyMessageId = getReplyMessageIdFromDeposit(deposit);
        const yCloudPayload = buildYCloudMessagePayload({
          configId: activeYCloudConfigId,
          to: telefonoFormateado,
          text: mensajeConfirmacion,
          replyMessageId,
          forceReply: true,
        });

        console.log("📱 Enviando mensaje de confirmación:", {
          telefono: telefonoFormateado,
          replyTo: replyMessageId || "ninguno",
          configId: activeYCloudConfigId,
        });

        // Enviar mensaje (como respuesta al mensaje original si existe chatwoot_message_id)
        console.timeLog(trace, "enviando a YCloud");
        const result = await yCloudService.sendTextMessage(yCloudPayload);
        console.timeLog(trace, "respuesta YCloud", {
          success: result.success,
          messageId: result.data?.id || null,
        });

        if (result.success) {
          console.log("✅ Mensaje enviado:", result.data?.id);
          void persistSelectedSqlTipoIfNeeded(trace)
            .then(() => console.log("🗃️ SQL post-confirmación completado"))
            .catch((error) => {
              console.error("❌ Error aplicando el ID SQL después de confirmar:", error);
            });
          alert("✅ Depósito confirmado y mensaje enviado exitosamente");
        } else {
          console.warn("⚠️ Error enviando mensaje:", result.message);
          alert(
            `✅ Depósito confirmado. ⚠️ No se pudo enviar mensaje: ${result.message || result.error}`,
          );
        }
      } else {
        console.timeLog(trace, "sin envío de WhatsApp");
        // No se puede enviar mensaje, solo confirmar
        const razones = [];
        if (!activeYCloudConfigId) razones.push("sin configuración de mensajes");
        if (!telefonoDisponible) razones.push("sin teléfono");
        if (!empresa || !banco) razones.push("faltan datos de empresa/banco");

        console.log(
          "✅ Depósito confirmado sin envío de mensaje:",
          razones.join(", "),
        );
        alert(
          `✅ Depósito confirmado exitosamente.${razones.length > 0 ? `\n(No se envió mensaje: ${razones.join(", ")})` : ""}`,
        );
      }
    } catch (error) {
      console.error("❌ Error enviando confirmación:", error);
      console.timeLog(trace, "error en confirmación");

      // Actualizar el depósito preservando relaciones
      onUpdateDeposit({
        ...deposit,
        ...payload,
      });

      alert(`❌ Error enviando mensaje: ${error.message}`);
    } finally {
      setIsSending(false);
      setIsProcessing(false);
      console.timeEnd(trace);
    }

    onClose();
  };

  const handleSaveChanges = () => {
    const payload = {
      empresa_id: editableData.empresa_id || null,
      banco_id: editableData.banco_id || null,
      anexo: editableData.anexo || null,
    };
    onUpdateDeposit({
      ...deposit, // Preservar todo el depósito original (incluyendo relaciones)
      ...payload, // Sobrescribir solo los campos actualizados
    });
    onClose();
  };

  const {
    Icon: StatusIcon,
    label: statusLabel,
    color: statusColor,
  } = getStatusInfo(deposit.estado);

  const compactModalBorderClass =
    deposit.estado === "rechazado"
      ? "border-red-500/70"
      : deposit.estado === "en_validacion"
        ? "border-blue-500/70"
        : deposit.estado === "validado"
          ? "border-emerald-500/70"
          : deposit.estado === "pendiente"
            ? "border-orange-500/70"
            : "border-slate-200";

  const compactModalHeaderClass =
    deposit.estado === "rechazado"
      ? "border-red-200 bg-red-50/95 dark:border-red-900/40 dark:bg-red-950/35"
      : deposit.estado === "en_validacion"
        ? "border-blue-200 bg-blue-50/95 dark:border-blue-900/40 dark:bg-blue-950/35"
        : deposit.estado === "validado"
          ? "border-emerald-200 bg-emerald-50/95 dark:border-emerald-900/40 dark:bg-emerald-950/35"
          : deposit.estado === "pendiente"
            ? "border-orange-200 bg-orange-50/95 dark:border-orange-900/40 dark:bg-orange-950/35"
            : "border-gray-200 bg-white/95 dark:border-gray-800 dark:bg-gray-900/95";

  const compactModalHeaderTitleClass =
    deposit.estado === "rechazado"
      ? "text-red-900 dark:text-red-100"
      : deposit.estado === "en_validacion"
        ? "text-blue-900 dark:text-blue-100"
        : deposit.estado === "validado"
          ? "text-emerald-900 dark:text-emerald-100"
          : deposit.estado === "pendiente"
            ? "text-orange-900 dark:text-orange-100"
            : "text-slate-900 dark:text-slate-100";

  const getCardBorderColor = (cardType) => {
    switch (cardType) {
      case "form":
        return "border-l-slate-500"; // ⚫ Plomo para card formulario
      case "solicitante":
        return "border-l-indigo-500"; // 🔵 Índigo para card solicitante
      default:
        return "border-l-gray-500";
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Generar mensaje automático de rechazo basado en duplicados
  const generateDuplicateRejectionMessage = () => {
    if (!checkResult.isDuplicate || duplicateDeposits.length === 0) {
      return "";
    }

    let message = `DEPÓSITO DUPLICADO - `;

    if (duplicateDeposits.length === 1) {
      const dup = duplicateDeposits[0];
      message += `Este depósito ya se confirmó a la tienda ${
        dup.sucursal?.nombre || "N/A"
      } y Personal: ${dup.trabajador?.nombre || "N/A"}`;
    } else {
      message += `Este depósito ya se confirmó a ${duplicateDeposits.length} tiendas:\n`;
      duplicateDeposits.forEach((dup, index) => {
        message += `${index + 1}. Tienda: ${
          dup.sucursal?.nombre || "N/A"
        }, Personal: ${dup.trabajador?.nombre || "N/A"}\n`;
      });
    }

    return message;
  };

  const canConfirm =
    !isChecking &&
    checkResult.checked &&
    !checkResult.isDuplicate &&
    editableData.empresa_id &&
    editableData.banco_id &&
    editableData.anexo &&
    editableData.moneda;

  // Verificar si el depósito tiene datos de Chatwoot guardados
  // Note: chatwootConversationId is created during confirmation, so we don't require it here
  // Verificar si se puede confirmar
  const canConfirmYCloud =
    !isChecking &&
    checkResult.checked &&
    !checkResult.isDuplicate &&
    editableData.empresa_id &&
    editableData.banco_id &&
    editableData.anexo &&
    editableData.moneda &&
    yCloudConfigId;

  const canCheckDuplicates =
    editableData.empresa_id &&
    editableData.banco_id &&
    editableData.anexo &&
    editableData.moneda &&
    editableData.monto &&
    editableData.numero_operacion_banco &&
    editableData.fecha_deposito;

  // Atajos de teclado para acelerar la confirmación
  useEffect(() => {
    if (!deposit) return undefined;

    const handleKeyboardShortcuts = (event) => {
      if (isTypingTarget(event.target)) return;
      if (isSending || isProcessing) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Enter") return;
      event.preventDefault();
      if (canConfirm) {
        handleConfirmDepositWithMessage();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [
    canConfirm,
    deposit,
    handleConfirmDepositWithMessage,
    isProcessing,
    isSending,
    isTypingTarget,
    onClose,
  ]);

  const isFullEditDisabled =
    deposit.estado !== "pendiente" && deposit.estado !== "en_validacion";

  const canShowConfirmActions = ["pendiente", "en_validacion", "validado"].includes(
    deposit.estado,
  );

  const nroOperacionClasses = useMemo(() => {
    if (
      !editableData.numero_operacion_banco ||
      editableData.numero_operacion_banco.trim() === ""
    ) {
      return "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 dark:border-yellow-700 text-yellow-900 dark:text-yellow-300 focus:ring-yellow-400 placeholder:text-yellow-700/70 dark:placeholder:text-yellow-500/70";
    }
    if (
      editableData.numero_operacion_banco.trim() ===
      deposit.numero_operacion.trim()
    ) {
      return "bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-300 font-semibold focus:ring-emerald-400";
    }
    return "bg-amber-100 dark:bg-amber-900/50 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-300 font-semibold focus:ring-amber-400";
  }, [editableData.numero_operacion_banco, deposit.numero_operacion]);

  let displayVoucherUrl = editableData.imagen_voucher;
  if (
    displayVoucherUrl &&
    displayVoucherUrl.includes("drive.google.com/file/d/")
  ) {
    const fileId = displayVoucherUrl.split("/d/")[1].split("/")[0];
    displayVoucherUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  }

  const formatCompactMoney = (value, currency) => {
    const numericValue = Number(value) || 0;
    return new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  const compactStoreDataRows = useMemo(
    () => [
      { label: "Tienda", value: deposit?.sucursal?.nombre || "-" },
      { label: "Personal", value: deposit?.trabajador?.nombre || "-" },
      { label: "Empresa", value: deposit?.empresa?.abreviatura || deposit?.empresa?.nombre || "-" },
      { label: "Banco", value: selectedBanco?.abreviatura || selectedBanco?.nombre || "-" },
      { label: "Anexo", value: editableData.anexo || deposit?.anexo || "-" },
      { label: "Moneda", value: editableData.moneda || deposit?.moneda || "-" },
      { label: "Nro. op. banco", value: editableData.numero_operacion_banco || deposit?.numero_operacion_banco || "-" },
      { label: "Importe", value: formatCompactMoney(editableData.monto || deposit?.monto, editableData.moneda || deposit?.moneda) },
      { label: "Fecha depósito", value: editableData.fecha_deposito || deposit?.fecha_deposito || "-" },
    ],
    [deposit, editableData, selectedBanco],
  );

  const compactStoreDataText = useMemo(
    () =>
      compactStoreDataRows.map((row) => `${row.label}: ${row.value}`).join("\n"),
    [compactStoreDataRows],
  );
  const compactStoreDataSnapshot = duplicateStoreDataSnapshot || compactStoreDataText;

  const openDuplicateModal = useCallback(
    (mode) => {
      setDuplicateStoreDataSnapshot(compactStoreDataText);
      setDuplicateModalMode(mode);
      setIsNoDuplicateModalOpen(mode === "no_duplicate");
      setIsDuplicatesModalOpen(mode === "duplicate");
    },
    [compactStoreDataText],
  );

  const compactContactRows = useMemo(
    () => [
      { label: "Personal", value: deposit?.trabajador?.nombre || "-" },
      { label: "Sucursal", value: deposit?.sucursal?.nombre || "-" },
      { label: "Teléfono trabajador", value: deposit?.trabajador?.telefono_origen || "-" },
      { label: "Teléfono sucursal", value: deposit?.sucursal?.telefono || "-" },
      { label: "WhatsApp", value: deposit?.trabajador?.telefono_origen || deposit?.sucursal?.telefono || "-" },
    ],
    [deposit],
  );

  const compactVoucherUrl = displayVoucherUrl || deposit?.imagen_voucher || "";
  const compactUsesIframe =
    compactVoucherUrl &&
    (compactVoucherUrl.toLowerCase().includes(".pdf") ||
      compactVoucherUrl.toLowerCase().includes("/preview"));
  const compactSearchStatusClass =
    compactSearchTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200"
      : compactSearchTone === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200"
        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-950/60 dark:text-slate-300";

  const canUseChromeSearch =
    typeof chrome !== "undefined" && typeof chrome.runtime?.sendMessage === "function";

  const normalizeOperationNumber = (value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.replace(/^0+(?=\d)/, "");
  };

  const getCompactSearchPayload = () => ({
    numero_operacion_solicitante: isCompactPresentation
      ? ""
      : normalizeOperationNumber(deposit?.numero_operacion || ""),
    numero_operacion_banco: normalizeOperationNumber(
      editableData.numero_operacion_banco || deposit?.numero_operacion_banco || "",
    ),
    importe: editableData.monto || deposit?.monto || "",
    monto: editableData.monto || deposit?.monto || "",
  });

  const formatAmountWithThousandsComma = (value) => {
    const normalized = String(value || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/,/g, "");
    const numeric = Number(normalized);
    if (Number.isNaN(numeric)) return "";
    return numeric.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const runCompactSearch = useCallback(
    async (searchType) => {
      if (!compactVoucherUrl) {
        setCompactSearchStatus("No hay voucher para buscar.");
        setCompactSearchTone("error");
        return;
      }
      if (!canUseChromeSearch || !chrome.runtime?.sendMessage) {
        setCompactSearchStatus("La búsqueda solo está disponible dentro de la extensión.");
        setCompactSearchTone("error");
        return;
      }

      setIsCompactSearching(true);
      setCheckResult({ checked: false, isDuplicate: false, message: "" });
      setIsNoDuplicateModalOpen(false);
      setIsDuplicatesModalOpen(false);
      setCompactSearchTone("neutral");
      setCompactSearchStatus(
        searchType === "amount"
          ? "Buscando importe en la pestaña activa..."
          : "Buscando nro. operación en la pestaña activa...",
      );

      try {
        const payload = getCompactSearchPayload();
        const response = await chrome.runtime.sendMessage({
          type: "SEARCH_VOUCHER_IN_PAGE",
          depositData: payload,
          searchType,
        });

        if (response?.ok && response?.found) {
          setCompactSearchStatus(
            `Encontrado: ${response.term} (${response.matches} coincidencia${response.matches === 1 ? "" : "s"})`,
          );
          setCompactSearchTone("success");
        } else {
          setCompactSearchStatus(response?.message || "No se encontró coincidencia.");
          setCompactSearchTone("error");
        }
      } catch (error) {
        setCompactSearchStatus(`Error al buscar: ${error.message}`);
        setCompactSearchTone("error");
      } finally {
        setIsCompactSearching(false);
      }
    },
    [canUseChromeSearch, compactVoucherUrl, deposit, editableData.monto, editableData.numero_operacion_banco],
  );
  const sqlMovementsModalPortal =
    typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            {isSqlMovementsModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 p-4"
                onClick={closeSqlMovementsModal}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="flex h-[90vh] w-[98vw] max-w-[98vw] min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {sqlMovementsMeta?.empresaNombre ||
                          getSqlServerCompanyConfigFromEmpresaId(
                            editableData.empresa_id,
                            empresas,
                          ).empresaNombre}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Consulta SQL Server.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeSqlMovementsModal}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-white"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex flex-1 gap-4 overflow-hidden p-4">
                    <div className="flex h-full min-h-[34rem] w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900/40">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-gray-700 dark:bg-gray-800/70 dark:text-slate-400">
                        Voucher
                      </div>
                      <div className="min-h-0 flex-1 p-3">
                        <div className="flex h-full min-h-0 items-stretch">
                          {displayVoucherUrl ? (
                            displayVoucherUrl.includes(".pdf") || displayVoucherUrl.includes("/preview") ? (
                              <iframe src={displayVoucherUrl} title="Voucher PDF" className="h-full w-full rounded-xl border border-slate-200 bg-white dark:border-gray-700" />
                            ) : (
                              <img src={displayVoucherUrl} alt={"Voucher " + (deposit.numero_voucher || deposit.numero_operacion)} className="h-full w-full rounded-xl border border-slate-200 object-contain dark:border-gray-700" />
                            )
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-950 dark:text-slate-400">
                              No hay voucher disponible.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-700 dark:bg-gray-900/40">
                      <div className="border-b border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSqlActiveTab("movimientos")}
                            className={"rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
                              (sqlActiveTab === "movimientos"
                                ? "bg-slate-800 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")}
                          >
                            Movimientos por identificar
                          </button>
                          <button
                            type="button"
                            onClick={() => setSqlActiveTab("cortado")}
                            className={"rounded-full px-3 py-1.5 text-xs font-semibold transition-colors " +
                              (sqlActiveTab === "cortado"
                                ? "bg-slate-800 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")}
                          >
                            Cortado vs RegistrosConcar
                          </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-3">
                          {sqlActiveTab === "cortado" ? (
                            <>
                              <div className="w-[132px] flex-none">
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Periodo del reporte (YYYYMM)
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={6}
                                  value={sqlCortadoPeriod}
                                  onChange={(e) => setSqlCortadoPeriod(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void loadSqlCortado(1);
                                    }
                                  }}
                                  placeholder="Ej. 202606"
                                  className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <div className="w-[150px] flex-none">
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Nro. operación
                                  </label>
                                  <input
                                    type="text"
                                    value={sqlCortadoNroOperacionFilter}
                                    onChange={(e) => setSqlCortadoNroOperacionFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void loadSqlCortado(1);
                                      }
                                    }}
                                    placeholder="Ej. 123456"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                  />
                                </div>
                                <div className="w-[150px] flex-none">
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Banco
                                  </label>
                                  <input
                                    type="text"
                                    value={sqlCortadoBancoFilter}
                                    onChange={(e) => setSqlCortadoBancoFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void loadSqlCortado(1);
                                      }
                                    }}
                                    placeholder="Ej. BCP"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                  />
                                </div>
                                <div className="w-[150px] flex-none">
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Fecha
                                  </label>
                                  <input
                                    type="date"
                                    value={sqlCortadoFechaFilter}
                                    onChange={(e) => setSqlCortadoFechaFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void loadSqlCortado(1);
                                      }
                                    }}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                  />
                                </div>
                                <div className="w-[150px] flex-none">
                                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Importe
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={sqlCortadoImporteFilter}
                                    onChange={(e) => setSqlCortadoImporteFilter(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void loadSqlCortado(1);
                                      }
                                    }}
                                    placeholder="Ej. 1500.00"
                                    step="0.01"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-[50ch] max-w-full flex-none">
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Buscar en movimientos
                              </label>
                              <input
                                type="text"
                                inputMode="text"
                                value={sqlMovementsSearch}
                                onChange={(e) => setSqlMovementsSearch(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void loadSqlMovements(sqlMovementsSearch);
                                  }
                                }}
                                placeholder="Nro. operacion, banco, sucursal, contacto, RUC, observacion..."
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (sqlActiveTab === "cortado") {
                                  void loadSqlCortado(1);
                                } else {
                                  void loadSqlMovements(sqlMovementsSearch);
                                }
                              }}
                              disabled={sqlMovementsLoading || sqlCortadoLoading}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {sqlMovementsLoading || sqlCortadoLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                              {sqlActiveTab === "cortado" ? "Consultar BD" : "Buscar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSqlMovementsSearch("");
                                setSqlCortadoPeriod("");
                                setSqlCortadoNroOperacionFilter("");
                                setSqlCortadoBancoFilter("");
                                setSqlCortadoFechaFilter("");
                                setSqlCortadoImporteFilter("");
                                setSqlCortadoPage(1);
                                setSqlCortadoTotalCount(0);
                                void loadSqlMovements("");
                              }}
                              disabled={sqlMovementsLoading || sqlCortadoLoading}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        {sqlActiveTab === "movimientos" ? (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-700">
                              Desde: {sqlMovementsMeta?.fechaInicio || getSqlServerDefaultRange().fechaInicio}
                            </span>
                            <span className="rounded-full bg-slate-200 px-2 py-1 dark:bg-slate-700">
                              Hasta: {sqlMovementsMeta?.fechaFin || getSqlServerDefaultRange().fechaFin}
                            </span>
                          </div>
                        ) : null}

                        {sqlMovementsActionMessage ? (
                          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
                            {sqlMovementsActionMessage}
                          </div>
                        ) : null}
                        {sqlMovementsError ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                            {sqlMovementsError}
                          </div>
                        ) : null}
                        {sqlCortadoError ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                            {sqlCortadoError}
                          </div>
                        ) : null}
                        {sqlActiveTab === "cortado" && sqlCortadoPeriod && !/^\d{6}$/.test(sqlCortadoPeriod) ? (
                          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                            El periodo debe tener formato YYYYMM, por ejemplo 202606.
                          </div>
                        ) : null}
                      </div>

                      <div className="min-h-0 flex-1 overflow-hidden">
                        {sqlActiveTab === "movimientos" ? (
                          sqlMovementsLoading && sqlMovementsRows.length === 0 ? (
                            <div className="flex h-full items-center justify-center">
                              <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span className="text-sm">Consultando SQL Server...</span>
                              </div>
                            </div>
                          ) : sqlMovementsRows.length === 0 ? (
                            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                              No hay movimientos para mostrar con los filtros actuales.
                            </div>
                          ) : (
                            <div className="h-full overflow-x-auto overflow-y-auto">
                              <table className="w-max min-w-max table-auto border-separate border-spacing-0 whitespace-nowrap">
                                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-gray-800">
                                  <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Fecha</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 w-[15ch] max-w-[15ch]">Banco</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Nro. op.</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Descripcion</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Abono</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Reg</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Sucursal</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Contacto</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Validado por</th>
                                    <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Observación</th>
                                    <th className="sticky right-0 z-20 border-b border-l border-slate-200 bg-slate-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">Accion</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                                  {sqlMovementsRows.map((row, index) => (
                                    <tr
                                      key={String(row.CUO || row.ID || index)}
                                      className={"align-top text-sm transition-colors border-b-2 border-slate-300 dark:border-gray-600 " +
                                        (String(row.REGISTRO || "").trim()
                                          ? "bg-emerald-100/80 text-emerald-950 hover:bg-emerald-200/80 dark:bg-emerald-900/35 dark:text-emerald-50 dark:hover:bg-emerald-800/45"
                                          : hasSqlMovementAttentionData(row)
                                            ? "bg-orange-300/95 text-orange-950 hover:bg-orange-400/95 dark:bg-orange-900/55 dark:text-orange-50 dark:hover:bg-orange-800/60"
                                            : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-gray-800/60")}
                                    >
                                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{formatSqlMovementDate(row.FECHA)}</td>
                                      <td className="w-[15ch] max-w-[15ch] overflow-hidden whitespace-nowrap px-4 py-3 text-ellipsis" title={row.BANCO || "-"}>{row.BANCO || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.NRO_OPER || row.CUO || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-xs">{row.DESCRIPCION || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.ABONO, "PEN")}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.REG, "PEN")}</td>
                                      <td className="whitespace-nowrap px-4 py-3">{row.Sucursal || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3">
                                        <div className="space-y-0.5">
                                          <div>{row.Contacto || "-"}</div>
                                          <div className="text-xs text-current/75">{row.TelefonoContacto || ""}</div>
                                        </div>
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-3">{row.ValidadoPor || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3">{row.Observacion || row.OBSERVACION || "-"}</td>
                                      <td className="sticky right-0 z-10 whitespace-nowrap border-l border-slate-200 bg-inherit px-4 py-3 dark:border-gray-700 dark:bg-inherit">
                                        <button type="button" onClick={() => void executeSqlMovementSelection(row)} className="inline-flex items-center rounded-lg border border-amber-400 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600">Seleccionar</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        ) : (
                          <div className="flex h-full flex-col">
                            {sqlCortadoLoading && sqlCortadoRows.length === 0 ? (
                              <div className="flex h-full items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                  <span className="text-sm">Consultando SQL Server...</span>
                                </div>
                              </div>
                            ) : sqlCortadoRows.length === 0 ? (
                              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                No hay registros para mostrar con los filtros actuales.
                              </div>
                            ) : (
                              <div className="h-full overflow-x-auto overflow-y-auto">
                                <table className="w-max min-w-max table-auto border-separate border-spacing-0 whitespace-nowrap">
                                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-gray-800">
                                    <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Fecha</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Banco</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Nro. op.</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Descripcion</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Cargo</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Abono</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Reg</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700 text-right">Dif</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">Registro</th>
                                      <th className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">GLOSA</th>
                                      <th className="sticky right-0 z-20 border-b border-l border-slate-200 bg-slate-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                                        Accion
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                                    {sqlCortadoRows.map((row, index) => (
                                      <tr
                                        key={String(row.CUO || row.ID || index)}
                                        className={"align-top text-sm transition-colors border-b-2 border-slate-300 dark:border-gray-600 " +
                                          (String(row.REGISTRO || "").trim()
                                            ? "bg-emerald-100/80 text-emerald-950 hover:bg-emerald-200/80 dark:bg-emerald-900/35 dark:text-emerald-50 dark:hover:bg-emerald-800/45"
                                            : Number(row.DIF || 0) !== 0
                                              ? "bg-amber-200/90 text-amber-950 hover:bg-amber-300/90 dark:bg-amber-900/40 dark:text-amber-50 dark:hover:bg-amber-800/50"
                                              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-gray-800/60")}
                                      >
                                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{formatSqlMovementDate(row.FECHA)}</td>
                                      <td className="whitespace-nowrap px-4 py-3">{row.BANCO || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{row.NRO_OPER || row.CUO || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-xs">{row.DESCRIPCION || "-"}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.CARGO, "PEN")}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.ABONO, "PEN")}</td>
                                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.REG, "PEN")}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatCompactMoney(row.DIF, "PEN")}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{row.REGISTRO || "-"}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{row.GLOSA || "-"}</td>
                                        <td className="sticky right-0 z-10 whitespace-nowrap border-l border-slate-200 bg-inherit px-4 py-3 dark:border-gray-700 dark:bg-inherit">
                                          <button
                                            type="button"
                                            onClick={() => void handleSelectSqlCortado(row)}
                                            className="inline-flex items-center rounded-lg border border-amber-400 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
                                          >
                                            Seleccionar
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-slate-300">
                              <div>
                                {sqlCortadoTotalCount
                                  ? "Mostrando " + Math.min((sqlCortadoPage - 1) * sqlCortadoPageSize + 1, sqlCortadoTotalCount) + "-" + Math.min(sqlCortadoPage * sqlCortadoPageSize, sqlCortadoTotalCount) + " de " + sqlCortadoTotalCount
                                  : "Sin resultados"}
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => void loadSqlCortado(Math.max(1, sqlCortadoPage - 1))} disabled={sqlCortadoLoading || sqlCortadoPage <= 1} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">Anterior</button>
                                <span className="min-w-[7rem] text-center font-semibold">P?gina {sqlCortadoPage} / {Math.max(1, Math.ceil((sqlCortadoTotalCount || 0) / sqlCortadoPageSize))}</span>
                                <button type="button" onClick={() => void loadSqlCortado(sqlCortadoPage + 1)} disabled={sqlCortadoLoading || sqlCortadoPage >= Math.max(1, Math.ceil((sqlCortadoTotalCount || 0) / sqlCortadoPageSize))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">Siguiente</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-slate-300">
                    <div>
                      {sqlMovementsMeta?.count != null
                        ? sqlMovementsMeta.count + " movimiento(s) cargado(s)"
                        : "Consulta SQL Server"}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={exportSqlMovementsToExcel} disabled={!sqlMovementsRows.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                        <Save className="h-4 w-4" />
                        Exportar Excel
                      </button>
                      <button type="button" onClick={closeSqlMovementsModal} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                        Cerrar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null;

  if (isCompactPresentation) {
    return (
      <>
        {sqlMovementsModalPortal}
        <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-0">
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`relative flex h-[96vh] w-full min-w-0 max-w-none flex-col overflow-hidden rounded-2xl border bg-[#f8fafc] shadow-2xl dark:bg-gray-950 ${compactModalBorderClass}`}
          >
            <div
              className={`flex items-center justify-between gap-2 border-b px-2 py-1.5 ${compactModalHeaderClass}`}
            >
              <div className="min-w-0">
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${compactModalHeaderTitleClass}`}
                >
                  Ventana de validación
                </div>
                {deposit.estado === "rechazado" &&
                  rejectedObservationText.length > 0 && (
                    <div
                      className="mt-1 flex max-w-full items-start gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-semibold tracking-[0.02em] text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                      title={rejectedObservationSummary}
                    >
                      <div className="shrink-0 uppercase tracking-[0.12em] text-red-600 dark:text-red-300">
                        Obs
                      </div>
                      <div className="min-w-0 whitespace-pre-wrap break-words leading-tight">
                        {rejectedObservationSummary}
                      </div>
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center space-x-2 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusColor}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span>{statusLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Contacto
                </button>
                <button
                  type="button"
                  onClick={openConversationModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                  title="Ver conversación del chat de este depósito"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </button>
                {deposit.estado === "rechazado" && (
                  <button
                    type="button"
                    onClick={handleRestoreToPending}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
                    title="Restaurar depósito a pendiente"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Pendiente
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  title="Cerrar ventana"
                  aria-label="Cerrar ventana"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden px-2 py-2">
              <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/70 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/85 dark:shadow-black/20">
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Empresa
                        </label>
                        <select
                          name="empresa_id"
                          value={editableData.empresa_id}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? false : isFullEditDisabled}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-sm outline-none transition-colors focus:ring-2 ${
                            !editableData.empresa_id
                              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                              : "border-slate-300 bg-white dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <option value="">Seleccionar</option>
                          {activeEmpresas.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.abreviatura || e.AliasEmpresa || e.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Banco
                        </label>
                        <select
                          name="banco_id"
                          value={editableData.banco_id}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? false : isFullEditDisabled}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-sm font-mono outline-none transition-colors focus:ring-2 ${
                            !editableData.banco_id
                              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                              : "border-slate-300 bg-white dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <option value="">Seleccionar</option>
                          {activeBancos.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.abreviatura}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Anexo
                        </label>
                        <select
                          name="anexo"
                          value={editableData.anexo}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? false : filteredAnexos.length === 0 || isFullEditDisabled}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-sm font-mono outline-none transition-colors focus:ring-2 ${
                            !editableData.anexo
                              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                              : "border-slate-300 bg-white dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <option value="">{filteredAnexos.length === 0 ? "N/A" : "Seleccionar"}</option>
                          {filteredAnexos.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Moneda
                        </label>
                        <select
                          name="moneda"
                          value={editableData.moneda}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? true : isFullEditDisabled}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-sm outline-none transition-colors focus:ring-2 ${
                            !editableData.moneda
                              ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                              : "border-slate-300 bg-white dark:border-gray-700 dark:bg-gray-950"
                          }`}
                        >
                          <option value="PEN">Soles (PEN)</option>
                          <option value="USD">Dólares (USD)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          <span>Importe</span>
                          <button
                            type="button"
                            onClick={() => runCompactSearch("amount")}
                            disabled={!compactVoucherUrl || isCompactSearching}
                            className="inline-flex h-6 min-w-[4.75rem] shrink-0 items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-900/50 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50"
                            title="Buscar importe"
                            aria-label="Buscar importe"
                          >
                            <Search className="h-3 w-3" />
                            <span>Buscar</span>
                          </button>
                        </label>
                        <input
                          type="number"
                          name="monto"
                          value={editableData.monto}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? true : isFullEditDisabled}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-mono text-right outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          <span>Nro. op.</span>
                          <button
                            type="button"
                            onClick={() => runCompactSearch("operation")}
                            disabled={!compactVoucherUrl || isCompactSearching}
                            className="inline-flex h-6 min-w-[4.75rem] shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50"
                            title="Buscar nro. operación"
                            aria-label="Buscar nro. operación"
                          >
                            <Search className="h-3 w-3" />
                            <span>Buscar</span>
                          </button>
                        </label>
                        <input
                          type="text"
                          name="numero_operacion_banco"
                          value={editableData.numero_operacion_banco}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? true : isFullEditDisabled}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-sm font-mono outline-none transition-colors focus:ring-2 ${nroOperacionClasses}`}
                          placeholder="pega la operacion"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Fecha depósito
                        </label>
                        <input
                          type="date"
                          name="fecha_deposito"
                          value={editableData.fecha_deposito}
                          onChange={handleChange}
                          disabled={isFieldsOnlyEdit ? true : isFullEditDisabled}
                          className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={handleCheckDuplicates}
                        className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isProcessing || !canCheckDuplicates}
                      >
                        <AlertCircle className="h-4 w-4" />
                        Duplicados
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleEsAntiguo}
                        disabled={isProcessing}
                        className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                          deposit?.es_antiguo
                            ? "bg-slate-700 text-white hover:bg-slate-800"
                            : "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                        {deposit?.es_antiguo ? "Antiguo ✓" : "Antiguo"}
                      </button>
                      {deposit?.es_antiguo && (
                        <button
                          type="button"
                          onClick={openSqlMovementsModal}
                          disabled={isProcessing}
                          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Ver movimientos SQL por identificar"
                        >
                          <Search className="h-4 w-4" />
                          SQL
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsRejectionModalOpen(true)}
                        disabled={isProcessing}
                        className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Ban className="h-4 w-4" />
                        Rechazar
                      </button>
                    </div>

                    <div
                      className={`flex w-full flex-none items-center justify-between gap-3 rounded-xl border px-3 py-2 text-[10px] ${
                        checkResult.checked
                          ? checkResult.isDuplicate
                            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : compactSearchStatusClass
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate whitespace-nowrap">
                          {checkResult.checked
                            ? checkResult.message
                            : isCompactSearching
                              ? "Buscando..."
                              : compactSearchStatus}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              <div className="flex min-h-0 flex-1 self-stretch flex-col rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/70 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/85 dark:shadow-black/20">
                <div className="mb-2 flex items-center justify-between gap-3 flex-none">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-gray-100">
                    {deposit?.cliente || "Sin cliente"}
                  </p>
                  {compactVoucherUrl && (
                    <a
                      href={compactVoucherUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </a>
                  )}
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/80">
                  {!compactVoucherUrl ? (
                    <div className="flex h-full min-h-0 items-center justify-center p-6 text-center text-sm text-slate-300">
                      No hay voucher disponible.
                    </div>
                  ) : compactUsesIframe ? (
                    <div className="absolute inset-0">
                      <iframe
                        src={`${compactVoucherUrl}#toolbar=1&navpanes=1&scrollbar=1&view=Fit`}
                        title="Voucher lateral"
                        className="h-full w-full border-0 bg-black"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0">
                      <img
                        src={compactVoucherUrl}
                        alt={`Voucher ${deposit.numero_voucher || deposit.numero_operacion}`}
                        className="h-full w-full object-contain object-center bg-black"
                      />
                    </div>
                  )}

                </div>

                {/* Cliente y botón abrir quedan arriba para mantener el card compacto */}
              </div>

              {isContactModalOpen && (
                <div
                  className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
                  onClick={() => setIsContactModalOpen(false)}
                >
                  <div
                    className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          Datos del contacto
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Información de la persona y sucursal asociada al depósito.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsContactModalOpen(false)}
                        className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        title="Cerrar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {compactContactRows.map((row) => (
                          <div
                            key={row.label}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800/60"
                          >
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              {row.label}
                            </div>
                            <div className="mt-1 break-words text-sm font-mono text-slate-900 dark:text-slate-100">
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                      {deposit?.trabajador?.telefono_origen || deposit?.sucursal?.telefono ? (
                        <a
                          href={`https://wa.me/${
                            String(
                              deposit?.trabajador?.telefono_origen ||
                                deposit?.sucursal?.telefono ||
                                "",
                            ).replace(/\D/g, "")
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                        >
                          <Phone className="h-4 w-4" />
                          Abrir WhatsApp
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setIsContactModalOpen(false)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {duplicateModalMode === "no_duplicate" && (
                <div
                  className="absolute inset-0 z-[210] flex items-center justify-center bg-black/70 p-4"
                  onClick={() => {
                    setDuplicateModalMode("none");
                    setIsNoDuplicateModalOpen(false);
                  }}
                >
                  <div
                    className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-500 p-2">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            Sin duplicados
                          </h3>
                          <p className="text-sm text-emerald-700 dark:text-emerald-200">
                            No se encontraron coincidencias. Puedes confirmar el depósito.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDuplicateModalMode("none");
                          setIsNoDuplicateModalOpen(false);
                        }}
                        className="rounded-full p-2 text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                        title="Cerrar"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                        <div className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          Datos de la tienda
                        </div>
                        <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 dark:border-slate-700 dark:bg-gray-950/30 dark:text-slate-100">
                          {compactStoreDataSnapshot}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                      <button
                        type="button"
                        onClick={handleConfirmDepositWithMessage}
                        disabled={!canConfirm || isSending || isProcessing}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Confirmar depósito y enviar mensaje por YCloud"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Confirmar con YCloud
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {duplicateModalMode === "duplicate" && (
                <div
                  className="absolute inset-0 z-[210] flex items-center justify-center bg-black/80 p-4"
                  onClick={() => {
                    setDuplicateModalMode("none");
                    setIsDuplicatesModalOpen(false);
                  }}
                >
                  <div
                    className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between border-b border-gray-200 bg-red-50 p-4 dark:border-gray-700 dark:bg-red-900/20">
                      <div className="flex items-center space-x-3">
                        <div className="rounded-lg bg-red-500 p-2">
                          <AlertCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                            Depósitos Duplicados Encontrados
                          </h3>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Se encontraron {duplicateDeposits.length} depósito(s) con datos similares
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setDuplicateModalMode("none");
                          setIsDuplicatesModalOpen(false);
                        }}
                        className="rounded-full p-2 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
                        title="Cerrar"
                      >
                        <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                        <div className="text-sm font-bold text-red-900 dark:text-red-100">
                          Depósitos duplicados encontrados
                        </div>
                        <div className="mt-1 text-sm text-red-700 dark:text-red-200">
                          Se muestran los depósitos encontrados como cards individuales.
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {duplicateDeposits.map((dup, index) => {
                          const statusInfo = getStatusInfo(dup.estado);
                          const StatusIcon = statusInfo.Icon;
                          return (
                            <div
                              key={dup.id || `${dup.numero_operacion_banco || dup.numero_operacion || "dup"}-${index}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                    Duplicado #{index + 1}
                                  </div>
                                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {dup.sucursal?.nombre || "Sin sucursal"}
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusInfo.color}`}>
                                  <StatusIcon className="h-3.5 w-3.5" />
                                  {statusInfo.label}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-2 text-sm">
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Empresa
                                  </div>
                                  <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                                    {dup.empresa?.abreviatura || dup.empresa?.nombre || "-"}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Banco
                                  </div>
                                  <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                                    {dup.banco?.abreviatura || dup.banco?.nombre || "-"}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Nro. operación
                                  </div>
                                  <div className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                                    {dup.numero_operacion_banco || dup.numero_operacion || "-"}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Importe
                                  </div>
                                  <div className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                                    {formatCompactMoney(dup.monto, dup.moneda)}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Fecha depósito
                                  </div>
                                  <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                                    {dup.fecha_deposito || "-"}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Fecha registro
                                  </div>
                                  <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                                    {formatDateTime(dup.fecha_registro)}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70 md:col-span-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                    Personal
                                  </div>
                                  <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                                    {dup.trabajador?.nombre || "-"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <button
                        onClick={() => {
                          setDuplicateModalMode("none");
                          setIsDuplicatesModalOpen(false);
                        }}
                        className="rounded-lg bg-gray-600 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-700"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </motion.div>
          {isRejectionModalOpen && (
            <RejectionModal
              onClose={() => setIsRejectionModalOpen(false)}
              onConfirm={handleConfirmRejection}
              initialReason={generateDuplicateRejectionMessage()}
            />
          )}
          {isPickerOpen && (
            <GoogleDrivePicker
              onClose={() => setIsPickerOpen(false)}
              onFileSelect={handleFileSelectFromPicker}
            />
          )}
          <ConversationModal
            isOpen={isConversationModalOpen}
            onClose={() => setIsConversationModalOpen(false)}
            deposit={deposit}
            phoneNumber={getConversationPhoneNumber()}
          />

        </div>
        </AnimatePresence>
      </>
    );
  }


  return (
    <>
      {sqlMovementsModalPortal}
      {sqlSelectionToast ? (
        <div className="fixed left-1/2 top-4 z-[220] -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-lg dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-100">
          {sqlSelectionToast}
        </div>
      ) : null}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          isCompactPresentation ? "bg-black/45 p-2 md:p-3" : "bg-black/60 dark:bg-black/70 p-4"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`bg-white dark:bg-gray-800 w-full flex flex-col shadow-2xl ${
            isCompactPresentation
              ? "w-full max-w-[1400px] min-w-0 max-h-[96vh] h-[96vh] rounded-2xl"
              : "max-w-7xl max-h-[85vh] h-[85vh] md:max-h-[93vh] md:h-[93vh] rounded-xl"
          }`}
        >
          <div className="flex items-center justify-between p-2 md:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="p-1.5 md:p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm md:text-base font-bold text-gray-900 dark:text-gray-100">
                  Detalle del Depósito
                </h2>
                <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400">
                  Operación (Voucher): {deposit.numero_operacion}
                </p>
                <div className="hidden sm:flex items-center gap-3 mt-1 text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    📅 Recibido:{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {receivedTime}
                    </strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ⏱️ Transcurrido:{" "}
                    <strong className="text-orange-600 dark:text-orange-400">
                      {elapsedTime}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span
                className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}
              >
                <StatusIcon className="h-4 w-4" />
                <span>{statusLabel}</span>
              </span>

              {/* Botón para abrir WhatsApp Web */}
              {(deposit.trabajador?.telefono_origen ||
                deposit.sucursal?.telefono) && (
                <button
                  onClick={openWhatsAppChat}
                  className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Abrir conversación en WhatsApp Web"
                >
                  <Phone className="h-4 w-4" />
                  <span className="hidden md:inline">WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={openConversationModal}
                className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                title="Ver conversación del chat de este depósito"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden md:inline">Chat</span>
              </button>

              {deposit.es_antiguo && (
                <button
                  type="button"
                  onClick={openSqlMovementsModal}
                  className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                  title="Ver movimientos SQL por identificar"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden md:inline">SQL</span>
                </button>
              )}

              {deposit.estado === "rechazado" && (
                <button
                  type="button"
                  onClick={handleRestoreToPending}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  title="Restaurar depósito a pendiente"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden md:inline">Pendiente</span>
                </button>
              )}

              {/* Chatwoot desactivado */}
              {false && (
                  <>
                    <button
                      onClick={() => {}}
                      className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Ver conversación de Chatwoot embebida"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden md:inline">Ver Chat</span>
                    </button>
                    <button
                      onClick={() => {
                        void 0;
                      }}
                      className="flex items-center space-x-2 px-2 md:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Abrir conversación en Chatwoot (nueva pestaña)"
                    >
                      <PanelRightOpen className="h-4 w-4" />
                      <span className="hidden md:inline">Ir al Chat</span>
                    </button>
                  </>
                )}

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {deposit.estado === "rechazado" &&
            rejectedObservationText.length > 0 && (
              <div
                className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-100"
                title={rejectedObservationSummary}
              >
                <div className="flex items-start gap-2">
                  <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
                    Observación del rechazo
                  </div>
                  <div className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-tight">
                    {rejectedObservationSummary}
                  </div>
                </div>
              </div>
            )}

          {/* Iframe de Chatwoot embebido */}

          <div
            className={`flex-1 min-h-0 overflow-y-auto lg:overflow-hidden ${
              isCompactPresentation ? "p-2.5 md:p-3" : "p-4"
            } bg-gray-50/50 dark:bg-gray-900/50`}
          >
            <div className={`grid h-full grid-cols-1 ${isCompactPresentation ? "gap-4 items-stretch lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]" : "gap-6 lg:grid-cols-9"}`}>
              <div className="space-y-3 lg:col-span-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-2">
                <div
                  className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 border-l-4 ${getCardBorderColor(
                    "form",
                  )} rounded-lg p-2 shadow-md dark:shadow-black/30 hover:shadow-lg hover:shadow-slate-500/50 dark:hover:shadow-slate-400/40 transition-shadow duration-300`}
                >
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Datos Editables del Depósito
                  </h4>

                  <div className="grid grid-cols-6 gap-3 mb-4">
                    {/* Primera fila: Empresa (4 cols) + Banco (2 cols) */}
                    <div className="col-span-4">
                      <FormRow icon={Building} label="Empresa">
                        <select
                          name="empresa_id"
                          value={editableData.empresa_id}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? false : isFullEditDisabled
                          }
                          className={`w-full border rounded-lg px-3 py-1.5 focus:ring-2 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400 ${
                            !editableData.empresa_id
                              ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                          }`}
                        >
                          <option value="">Seleccionar</option>
                          {activeEmpresas.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nombre}
                            </option>
                          ))}
                        </select>
                      </FormRow>
                    </div>
                    <div className="col-span-2">
                      <FormRow icon={CreditCard} label="Banco">
                        <select
                          name="banco_id"
                          value={editableData.banco_id}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? false : isFullEditDisabled
                          }
                          className={`w-full border rounded-lg px-3 py-1.5 focus:ring-2 font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400 ${
                            !editableData.banco_id
                              ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                          }`}
                        >
                          <option value="">Seleccionar</option>
                          {activeBancos.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.abreviatura}
                            </option>
                          ))}
                        </select>
                      </FormRow>
                    </div>

                    {/* Segunda fila: Anexo (3 cols) + Fecha Depósito (3 cols) */}
                    <div className="col-span-3">
                      <FormRow icon={Hash} label="Anexo">
                        <select
                          name="anexo"
                          value={editableData.anexo}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit
                              ? false
                              : filteredAnexos.length === 0 ||
                                isFullEditDisabled
                          }
                          className={`w-full border rounded-lg px-3 py-1.5 focus:ring-2 font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400 ${
                            !editableData.anexo
                              ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                          }`}
                        >
                          <option value="">
                            {filteredAnexos.length === 0
                              ? "N/A"
                              : "Seleccionar"}
                          </option>
                          {filteredAnexos.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </FormRow>
                    </div>
                    <div className="col-span-3">
                      <FormRow icon={Calendar} label="Fecha Depósito">
                        <input
                          type="date"
                          name="fecha_deposito"
                          value={editableData.fecha_deposito}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                        />
                      </FormRow>
                    </div>

                    {/* Cuarta fila: Nro. Operación Banco (3 cols) + Nro. Op. Solicitante (3 cols) */}
                    <div className="col-span-3">
                      <FormRow icon={Hash} label="Nro. Operación Banco">
                        <input
                          type="text"
                          name="numero_operacion_banco"
                          value={editableData.numero_operacion_banco}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className={`w-full px-3 py-1.5 border rounded-lg focus:ring-2 font-mono transition-colors duration-200 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400 ${nroOperacionClasses}`}
                          placeholder="pega la operacion segun la web del banco"
                        />
                      </FormRow>
                    </div>
                    <div className="col-span-3">
                      <FormRow icon={Hash} label="Nro. Op. Solicitante">
                        <div className="w-full px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-center">
                          <p className="font-bold text-blue-800 dark:text-blue-200 text-base tracking-wider font-mono">
                            {deposit.numero_operacion}
                          </p>
                        </div>
                      </FormRow>
                    </div>

                    <div className="col-span-3">
                      <FormRow icon={DollarSign} label="Importe">
                        <input
                          type="number"
                          name="monto"
                          value={editableData.monto}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono text-sm text-right disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </FormRow>
                    </div>
                    <div className="col-span-3">
                      <FormRow icon={DollarSign} label="Moneda">
                        <select
                          name="moneda"
                          value={editableData.moneda}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className={`w-full border rounded-lg px-3 py-1.5 focus:ring-2 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400 ${
                            !editableData.moneda
                              ? "bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400"
                          }`}
                        >
                          <option value="PEN">Soles (PEN)</option>
                          <option value="USD">Dólares (USD)</option>
                        </select>
                      </FormRow>
                    </div>

                    <div className="col-span-6">
                      <FormRow icon={User} label="Cliente">
                        <input
                          type="text"
                          name="cliente"
                          value={editableData.cliente}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                          placeholder="Nombre del cliente"
                        />
                      </FormRow>
                    </div>

                    <div className="col-span-6">
                      <FormRow icon={Fingerprint} label="RUC/DNI Cliente">
                        <input
                          type="text"
                          name="ruc_cliente"
                          value={editableData.ruc_cliente}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                          placeholder="RUC o DNI del cliente"
                        />
                      </FormRow>
                    </div>

                    <div className="col-span-6">
                      <FormRow icon={Info} label="Referencia del Cliente">
                        <textarea
                          name="referencia_cliente"
                          rows="2"
                          value={editableData.referencia_cliente}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                          placeholder="Añadir referencia del cliente..."
                        />
                      </FormRow>
                    </div>

                    {/* Campo Observaciones ocultado por petición del usuario 
                    <div className="col-span-6">
                      <FormRow
                        icon={MessageSquare}
                        label="Observaciones (Verificador)"
                      >
                        <textarea
                          name="observaciones"
                          rows="2"
                          value={editableData.observaciones}
                          onChange={handleChange}
                          disabled={
                            isFieldsOnlyEdit ? true : isFullEditDisabled
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700/50 dark:disabled:text-gray-400"
                          placeholder="Añadir notas o comentarios sobre la validación..."
                        />
                      </FormRow>
                    </div>
                    */}
                  </div>

                  {!isFieldsOnlyEdit && (
                    <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                            Verificación de Duplicados
                          </h4>
                        </div>
                        <button
                          onClick={handleCheckDuplicates}
                          disabled={isChecking || !canCheckDuplicates}
                          className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium flex items-center justify-center disabled:bg-yellow-300 w-full sm:w-auto flex-shrink-0 text-sm"
                        >
                          {isChecking ? (
                            <Loader2 className="animate-spin mr-2" size={12} />
                          ) : (
                            <Search className="mr-2" size={12} />
                          )}
                          {isChecking
                            ? "Comprobando..."
                            : "Comprobar Duplicados"}
                        </button>
                      </div>
                      <AnimatePresence>
                        {checkResult.checked && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className={`mt-3 text-sm font-medium p-2.5 rounded-lg ${
                              isChecking
                                ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                : checkResult.isDuplicate
                                  ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                                  : "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {checkResult.isDuplicate ? (
                                  <Info size={12} />
                                ) : isChecking ? (
                                  <Search size={12} />
                                ) : (
                                  <CheckCircle size={12} />
                                )}
                                <span className="whitespace-pre-line">{checkResult.message}</span>
                              </div>
                              {checkResult.isDuplicate &&
                                duplicateDeposits.length > 0 && (
                                  <button
                                    onClick={() => {
                                      openDuplicateModal("duplicate");
                                    }}
                                    className="ml-3 inline-flex items-center space-x-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white flex-shrink-0 hover:bg-red-700"
                                  >
                                    <Eye size={12} />
                                    <span>Ver Duplicados</span>
                                  </button>
                                )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <div
                  className={`w-full bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 border-l-4 ${
                    editingSolicitante
                      ? "border-l-blue-500 dark:border-l-blue-400"
                      : getCardBorderColor("solicitante")
                  } rounded-lg p-2 shadow-md dark:shadow-black/30 hover:shadow-lg hover:shadow-indigo-500/50 dark:hover:shadow-indigo-400/40 transition-shadow duration-300`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Datos del Solicitante
                    </h4>
                    {!editingSolicitante && isBackendConnected && (
                      <button
                        onClick={() => {
                          setEditingSolicitante(true);
                          setSearchTrabajador(deposit.trabajador?.nombre || "");
                        }}
                        disabled={isProcessing}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                        title="Editar datos del solicitante"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Editar</span>
                      </button>
                    )}
                  </div>

                  {editingSolicitante ? (
                    <div className="space-y-3">
                      {/* Campo de búsqueda de trabajador */}
                      <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Buscar Vendedor (nombre o teléfono)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchTrabajador}
                            onChange={(e) =>
                              setSearchTrabajador(e.target.value)
                            }
                            placeholder="Escribe para buscar..."
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoComplete="off"
                          />
                          {buscandoTrabajador && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            </div>
                          )}
                        </div>

                        {/* Lista de trabajadores encontrados */}
                        {trabajadoresEncontrados.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {trabajadoresEncontrados.map((trabajador) => (
                              <button
                                key={trabajador.id}
                                onClick={() =>
                                  seleccionarTrabajador(trabajador)
                                }
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 text-sm"
                              >
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {trabajador.nombre}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  📱 {trabajador.telefono_origen} • 🏢{" "}
                                  {trabajador.sucursal?.nombre ||
                                    "Sin sucursal"}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Datos seleccionados */}
                      {solicitanteData.trabajador_id && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div>
                              <span className="font-medium text-blue-800 dark:text-blue-200">
                                Vendedor:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {solicitanteData.trabajador_nombre}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-blue-800 dark:text-blue-200">
                                Sucursal:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {solicitanteData.sucursal_nombre ||
                                  "Sin sucursal"}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-blue-800 dark:text-blue-200">
                                Teléfono:
                              </span>
                              <span className="ml-2 text-gray-900 dark:text-gray-100">
                                {solicitanteData.telefono_origen}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botones de acción */}
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={cancelarEdicionSolicitante}
                          disabled={isProcessing}
                          className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={guardarCambiosSolicitante}
                          disabled={
                            isProcessing || !solicitanteData.trabajador_id
                          }
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <span>Guardar</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="truncate">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Vendedor
                          </p>
                          <p
                            className="font-semibold text-gray-900 dark:text-gray-100 text-base"
                            title={deposit.trabajador?.nombre}
                          >
                            {deposit.trabajador?.nombre || "-"}
                          </p>
                        </div>
                        <div className="truncate">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Sucursal
                          </p>
                          <p
                            className="font-semibold text-gray-900 dark:text-gray-100 text-base"
                            title={deposit.sucursal?.nombre}
                          >
                            {deposit.sucursal?.nombre || "-"}
                          </p>
                        </div>
                        <div className="truncate">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Fecha de Envío
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                            {formatDateTime(deposit.fecha_registro)}
                          </p>
                        </div>
                        <div className="truncate">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Teléfono
                          </p>
                          {deposit.trabajador?.telefono_origen ? (
                            <a
                              href={`https://wa.me/${deposit.trabajador.telefono_origen.replace(
                                /[^0-9]/g,
                                "",
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400 text-sm hover:text-green-700 dark:hover:text-green-300 transition-colors group"
                              title={`Llamar por WhatsApp: ${deposit.trabajador.telefono_origen}`}
                            >
                              <Phone className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="truncate">
                                {deposit.trabajador.telefono_origen}
                              </span>
                            </a>
                          ) : (
                            <p className="font-semibold text-gray-400 dark:text-gray-500 text-base">
                              -
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Grupo de confirmación en el card */}
                      {canShowConfirmActions && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                          <button
                            onClick={handleConfirmDepositWithMessage}
                            disabled={!canConfirm || isSending || isProcessing}
                            className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm flex items-center justify-center space-x-2 transition-colors"
                            title="Confirmar depósito y enviar mensaje por YCloud"
                          >
                            {isSending ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            <span>
                              {isSending
                                ? "Confirmando..."
                                : "Confirmar con YCloud"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mensaje de campos requeridos debajo del card Datos del Solicitante */}
                {(!editableData.empresa_id ||
                  !editableData.banco_id ||
                  !editableData.anexo ||
                  !editableData.moneda) && (
                  <div className="w-full p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                      ⚠️ Campos requeridos faltantes:
                    </p>
                    <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 ml-4">
                      {!editableData.empresa_id && <li>• Empresa</li>}
                      {!editableData.banco_id && <li>• Banco</li>}
                      {!editableData.anexo && <li>• Anexo</li>}
                      {!editableData.moneda && <li>• Moneda</li>}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 flex flex-col h-full space-y-4">
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700 flex-1 min-h-0 flex flex-col relative overflow-hidden lg:overflow-auto">
                  <div
                    className="flex-1 min-h-0 flex items-center justify-center overflow-hidden lg:overflow-auto pointer-events-none lg:pointer-events-auto"
                    style={{ minHeight: "607px" }}
                  >
                    {displayVoucherUrl &&
                    (displayVoucherUrl.includes(".pdf") ||
                      displayVoucherUrl.includes("/preview")) ? (
                      <div
                        className="flex h-full w-full flex-col overflow-hidden rounded-md"
                        style={{
                          minHeight: "calc(93vh - 150px)",
                          height: "calc(93vh - 150px)",
                        }}
                      >
                        <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-t pointer-events-auto">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              📄 PDF:
                            </span>

                            <button
                              onClick={() => setIsFloatingIframeOpen(true)}
                              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                              title="Abrir iframe flotante"
                            >
                              🔍 Ventana Dedicada
                            </button>
                          </div>
                        </div>
                        <iframe
                          id="pdf-iframe-detail"
                          src={`${displayVoucherUrl}#toolbar=1&navpanes=1&scrollbar=1&view=Fit`}
                          className="w-full flex-1 pointer-events-none lg:pointer-events-auto"
                          title="Voucher"
                          style={{
                            border: "none",
                            minHeight: "calc(93vh - 200px)",
                            height: "calc(93vh - 200px)",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-black/5 dark:bg-black/20">
                        <img
                          src={
                            displayVoucherUrl ||
                            FALLBACK_VOUCHER_PREVIEW
                          }
                          alt={`Voucher ${deposit.numero_voucher}`}
                          className="max-h-full max-w-full object-contain pointer-events-none lg:pointer-events-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-shrink-0 items-center justify-end gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${
              isCompactPresentation ? "rounded-b-2xl p-3" : "rounded-b-xl p-4"
            }`}
          >
            <div className="mr-auto hidden md:block text-xs text-gray-500 dark:text-gray-400">
              Enter: confirmar con mensaje · Esc: cerrar
            </div>
            {isFieldsOnlyEdit ? (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium text-sm"
                >
                  Cancelar
                </button>
                {displayVoucherUrl && (
                  <button
                    onClick={() =>
                      onOpenVoucherWindow(displayVoucherUrl, {
                        fecha_deposito:
                          editableData.fecha_deposito || deposit.fecha_deposito,
                        fechaDeposito:
                          editableData.fecha_deposito || deposit.fecha_deposito,
                        numero_operacion_solicitante: deposit.numero_operacion,
                        numero_operacion_banco:
                          editableData.numero_operacion_banco ||
                          deposit.numero_operacion_banco ||
                          "",
                        importe: editableData.monto || deposit.monto,
                        moneda: editableData.moneda || deposit.moneda,
                        cliente: editableData.cliente || deposit.cliente,
                        estado: deposit.estado,
                        sucursal: deposit.sucursal?.nombre || "",
                        banco:
                          deposit.banco?.abreviatura || deposit.banco?.nombre || "",
                        monto: editableData.monto || deposit.monto,
                        deposit_id: deposit.id,
                      })
                    }
                    className="px-2 md:px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex items-center justify-center space-x-2 text-sm"
                    title="Abrir panel lateral"
                  >
                    <PanelRightOpen size={12} />
                    <span className="hidden md:inline">Panel Lateral</span>
                  </button>
                )}
                <button
                  onClick={handleSaveChanges}
                  className="px-3 md:px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center space-x-2 text-sm"
                >
                  <Save size={12} />
                  <span className="hidden sm:inline">Guardar Cambios</span>
                  <span className="sm:hidden">Guardar</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium text-sm"
                >
                  Cancelar
                </button>
                {displayVoucherUrl && (
                  <button
                    onClick={() =>
                      onOpenVoucherWindow(displayVoucherUrl, {
                        fecha_deposito:
                          editableData.fecha_deposito || deposit.fecha_deposito,
                        fechaDeposito:
                          editableData.fecha_deposito || deposit.fecha_deposito,
                        numero_operacion_solicitante: deposit.numero_operacion,
                        numero_operacion_banco:
                          editableData.numero_operacion_banco ||
                          deposit.numero_operacion_banco ||
                          "",
                        importe: editableData.monto || deposit.monto,
                        moneda: editableData.moneda || deposit.moneda,
                        cliente: editableData.cliente || deposit.cliente,
                        estado: deposit.estado,
                        sucursal: deposit.sucursal?.nombre || "",
                        banco:
                          deposit.banco?.abreviatura || deposit.banco?.nombre || "",
                        monto: editableData.monto || deposit.monto,
                        deposit_id: deposit.id,
                      })
                    }
                    className="px-2 md:px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex items-center justify-center space-x-2 text-sm"
                    title="Abrir panel lateral"
                  >
                    <PanelRightOpen size={12} />
                    <span className="hidden md:inline">Panel Lateral</span>
                  </button>
                )}

                {/* Botón para marcar/desmarcar como antiguo - Solo para pendiente y en_validacion */}
                {(deposit.estado === "pendiente" ||
                  deposit.estado === "en_validacion") && (
                  <button
                    onClick={handleToggleEsAntiguo}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 rounded-md font-medium flex items-center justify-center space-x-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      deposit.es_antiguo
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500"
                    }`}
                    title={
                      deposit.es_antiguo
                        ? "Desmarcar como antiguo"
                        : "Marcar como antiguo"
                    }
                  >
                    <AlertTriangle size={12} />
                    <span>
                      {deposit.es_antiguo ? "Antiguo ✓" : "Marcar Antiguo"}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsRejectionModalOpen(true);
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium flex items-center justify-center space-x-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Ban size={12} />
                  <span>Rechazar</span>
                </button>

                {deposit.estado === "rechazado" && (
                  <button
                    onClick={handleRestoreToPending}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 font-medium flex items-center justify-center space-x-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    title="Restaurar depósito a pendiente"
                  >
                    <Clock size={12} />
                    <span>Volver a pendiente</span>
                  </button>
                )}

                {/* Grupo de confirmación */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleConfirmDepositWithMessage}
                    disabled={!canConfirm || isSending || isProcessing}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm flex items-center justify-center space-x-2"
                    title="Confirmar depósito y enviar mensaje por YCloud"
                  >
                    {isSending ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    <span>
                      {isSending ? "Enviando..." : "Confirmar con YCloud"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Overlay de loading durante procesamiento */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center"
            style={{ pointerEvents: "all" }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Procesando...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Por favor espere mientras se completa la operación
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isRejectionModalOpen && (
        <RejectionModal
          onClose={() => setIsRejectionModalOpen(false)}
          onConfirm={handleConfirmRejection}
          initialReason={generateDuplicateRejectionMessage()}
        />
      )}
      <ConversationModal
        isOpen={isConversationModalOpen}
        onClose={() => setIsConversationModalOpen(false)}
        deposit={deposit}
        phoneNumber={getConversationPhoneNumber()}
      />
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isContactModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4"
                onClick={() => setIsContactModalOpen(false)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Datos del contacto
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Información de la persona y sucursal asociada al depósito.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(false)}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-white"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {compactContactRows.map((row) => (
                        <div
                          key={row.label}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800/60"
                        >
                          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {row.label}
                          </div>
                          <div className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100 break-words">
                            {row.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                    {deposit?.trabajador?.telefono_origen || deposit?.sucursal?.telefono ? (
                      <a
                        href={`https://wa.me/${
                          String(
                            deposit?.trabajador?.telefono_origen ||
                              deposit?.sucursal?.telefono ||
                              "",
                          ).replace(/\D/g, "")
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        <Phone className="h-4 w-4" />
                        Abrir WhatsApp
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(false)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Cerrar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isFloatingIframeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setIsFloatingIframeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-lg w-full max-w-6xl h-[93vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                <h3 className="text-lg font-semibold text-gray-900">
                  📄 Voucher: {deposit?.numero_operacion_banco || "Sin número"}
                </h3>
                <button
                  onClick={() => setIsFloatingIframeOpen(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 p-2">
                <iframe
                  src={displayVoucherUrl}
                  className="w-full h-full border-0 rounded"
                  title="Voucher PDF"
                  style={{
                    minHeight: "calc(93vh - 100px)",
                    height: "calc(93vh - 100px)",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {duplicateModalMode === "no_duplicate" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-4"
            onClick={() => {
              setDuplicateModalMode("none");
              setIsNoDuplicateModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500 p-2">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                      Sin duplicados
                    </h3>
                    <p className="text-sm text-emerald-700 dark:text-emerald-200">
                      No se encontraron coincidencias. Puedes confirmar el depósito.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDuplicateModalMode("none");
                    setIsNoDuplicateModalOpen(false);
                  }}
                  className="rounded-full p-2 text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    Datos de la tienda
                  </div>
                  <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 dark:border-slate-700 dark:bg-gray-950/30 dark:text-slate-100">
                    {compactStoreDataSnapshot}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800/70">
                  <button
                    type="button"
                    onClick={handleConfirmDepositWithMessage}
                    disabled={!canConfirm || isSending || isProcessing}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Confirmar depósito y enviar mensaje por YCloud"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Confirmar con YCloud
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleEsAntiguo}
                    disabled={isProcessing}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      deposit?.es_antiguo
                        ? "bg-slate-700 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    {deposit?.es_antiguo ? "Antiguo ✓" : "Antiguo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateModalMode("none");
                      setIsNoDuplicateModalOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {duplicateModalMode === "duplicate" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4"
            onClick={() => {
              setDuplicateModalMode("none");
              setIsDuplicatesModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100">
                      Depósitos Duplicados Encontrados
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Se encontraron {duplicateDeposits.length} depósito(s) con
                      datos similares
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDuplicateModalMode("none");
                    setIsDuplicatesModalOpen(false);
                  }}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors"
                  title="Cerrar"
                >
                  <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </button>
                </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                  <div className="text-sm font-bold text-red-900 dark:text-red-100">
                    Depósitos duplicados encontrados
                  </div>
                  <div className="mt-1 text-sm text-red-700 dark:text-red-200">
                    Se muestran los depósitos encontrados como cards individuales.
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {duplicateDeposits.map((dup, index) => {
                    const statusInfo = getStatusInfo(dup.estado);
                    const StatusIcon = statusInfo.Icon;
                    return (
                      <div
                        key={dup.id || `${dup.numero_operacion_banco || dup.numero_operacion || "dup"}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Duplicado #{index + 1}
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                              {dup.sucursal?.nombre || "Sin sucursal"}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusInfo.color}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm">
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Empresa
                            </div>
                            <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                              {dup.empresa?.abreviatura || dup.empresa?.nombre || "-"}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Banco
                            </div>
                            <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                              {dup.banco?.abreviatura || dup.banco?.nombre || "-"}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Nro. operación
                            </div>
                            <div className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                              {dup.numero_operacion_banco || dup.numero_operacion || "-"}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Importe
                            </div>
                            <div className="mt-0.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                              {formatCompactMoney(dup.monto, dup.moneda)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Fecha depósito
                            </div>
                            <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                              {dup.fecha_deposito || "-"}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Fecha registro
                            </div>
                            <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                              {formatDateTime(dup.fecha_registro)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-800/70 md:col-span-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Personal
                            </div>
                            <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                              {dup.trabajador?.nombre || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDuplicateModalMode("none");
                    setIsDuplicatesModalOpen(false);
                    setIsRejectionModalOpen(true);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => setIsDuplicatesModalOpen(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Modal de Chatwoot embebido */}
      <AnimatePresence>{false}</AnimatePresence>
    </>
  );
};

export default DepositDetailModal;

