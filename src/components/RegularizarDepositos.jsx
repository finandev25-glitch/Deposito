import React, { useState, useContext, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Building2,
  User,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import { formatDate } from "../utils/dateFormatters";
import SimpleFileManager from "./SimpleFileManager";
import { apiDelete, apiGet, apiPost } from "../services/backendApi.js";

const RegularizarDepositos = ({ onDepositUpdated }) => {
  const { currentUser } = useContext(AuthContext);

  // Estados para los datos del formulario
  const [formData, setFormData] = useState({
    cliente: "",
    numero_operacion: "",
    monto: "",
    moneda: "PEN",
    fecha_deposito: "",
    estado: "pendiente",
    anexo: "",
    numero_operacion_banco: "",
    empresa_id: "",
    banco_id: "",
    sucursal_id: "",
    trabajador_sucursal_id: "",
    telefono_origen: "",
  });

  // Estados para búsqueda por teléfono
  const [telefonoSearch, setTelefonoSearch] = useState("");
  const [trabajadoresEncontrados, setTrabajadoresEncontrados] = useState([]);
  const [buscandoTelefono, setBuscandoTelefono] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);

  // Estados para los catálogos
  const [empresas, setEmpresas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [filteredCuentas, setFilteredCuentas] = useState([]);
  const [anexoSearch, setAnexoSearch] = useState("");
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState("");
  const [croppedImageName, setCroppedImageName] = useState("");
  const [croppedImagePreview, setCroppedImagePreview] = useState("");
  const [croppedImageError, setCroppedImageError] = useState("");
  const [isExtractingVoucher, setIsExtractingVoucher] = useState(false);

  const handleTelefonoSearchPaste = (event) => {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText) return;

    const cleanedText = pastedText.replace(/\s+/g, "");
    if (cleanedText === pastedText) return;

    event.preventDefault();

    const input = event.currentTarget;
    const start = input.selectionStart ?? telefonoSearch.length;
    const end = input.selectionEnd ?? telefonoSearch.length;
    const nextValue =
      telefonoSearch.slice(0, start) + cleanedText + telefonoSearch.slice(end);

    setTelefonoSearch(nextValue);
    if (nextValue === "") {
      setTrabajadorSeleccionado(null);
    }
  };

  // Estados para tabla de depósitos regularizados
  const [depositosRegularizados, setDepositosRegularizados] = useState([]);
  const [loadingDepositos, setLoadingDepositos] = useState(false);

  // Estados para validación de duplicados
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState({
    checked: false,
    isDuplicate: false,
    message: "",
  });
  const [duplicateDeposits, setDuplicateDeposits] = useState([]);

  // Estados para manejo de archivos
  const [showFileManager, setShowFileManager] = useState(false);
  const [selectedDepositForFiles, setSelectedDepositForFiles] = useState(null);

  // Cargar catálogos y depósitos al iniciar
  useEffect(() => {
    loadCatalogos();
    loadDepositosRegularizados();
  }, []);

  // Filtrar cuentas por búsqueda de anexo
  useEffect(() => {
    if (!anexoSearch) {
      // Eliminar duplicados por anexo
      const uniqueCuentas = cuentas.reduce((acc, current) => {
        const existing = acc.find(
          (item) =>
            item.anexo === current.anexo && item.banco_id === current.banco_id
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      setFilteredCuentas(uniqueCuentas);
    } else {
      const filtered = cuentas.filter((c) => {
        const banco = bancos.find((b) => b.id === c.banco_id);
        const searchText = `${c.anexo} ${
          banco?.abreviatura || ""
        }`.toLowerCase();
        return searchText.includes(anexoSearch.toLowerCase());
      });

      // Eliminar duplicados del resultado filtrado
      const uniqueFiltered = filtered.reduce((acc, current) => {
        const existing = acc.find(
          (item) =>
            item.anexo === current.anexo && item.banco_id === current.banco_id
        );
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);

      setFilteredCuentas(uniqueFiltered);
    }
  }, [anexoSearch, cuentas, bancos]);

  // Buscar trabajadores por teléfono o nombre
  useEffect(() => {
    const buscarTrabajadores = async () => {
      if (telefonoSearch.length < 3) {
        setTrabajadoresEncontrados([]);
        return;
      }

      setBuscandoTelefono(true);
      try {
        const response = await apiGet(
          `/personal/search?q=${encodeURIComponent(telefonoSearch)}&limit=20`,
        );
        setTrabajadoresEncontrados(response.data || []);
      } catch (error) {
        console.error("Error buscando trabajadores:", error);
      } finally {
        setBuscandoTelefono(false);
      }
    };

    const debounce = setTimeout(buscarTrabajadores, 500);
    return () => clearTimeout(debounce);
  }, [telefonoSearch]);

  const loadCatalogos = async () => {
    try {
      const response = await fetch('/api/dashboard/bootstrap');
      if (!response.ok) throw new Error('No se pudieron cargar los catalogos');
      const data = await response.json();

      setEmpresas((data.empresas || []).filter((empresa) => empresa.estado === 'activo'));
      setBancos((data.bancos || []).filter((banco) => banco.estado === 'activo'));
      setCuentas((data.cuentas || []).sort((a, b) => String(a.anexo || '').localeCompare(String(b.anexo || ''))));
    } catch (error) {
      console.error('Error cargando cat?logos:', error);
      setMessage({ type: 'error', text: 'Error cargando cat?logos' });
    }
  };

  const loadDepositosRegularizados = async () => {
    setLoadingDepositos(true);
    try {
      const response = await fetch('/api/depositos?regularized=1&limit=50');
      if (!response.ok) throw new Error('No se pudieron cargar los depositos');
      const data = await response.json();

      setDepositosRegularizados(data.data || []);
    } catch (error) {
      console.error('Error cargando dep?sitos regularizados:', error);
    } finally {
      setLoadingDepositos(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Limpiar números de operación (solo números)
    if (name === "numero_operacion_banco" || name === "numero_operacion") {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/\D/g, "") }));
      return;
    }

    // Si se selecciona un anexo, identificar automáticamente el banco
    if (name === "anexo" && value) {
      const cuentaSeleccionada = cuentas.find((c) => c.anexo === value);
      if (cuentaSeleccionada) {
        setFormData((prev) => ({
          ...prev,
          anexo: value,
          banco_id: cuentaSeleccionada.banco_id,
        }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const loadCroppedImageFile = (file, fallbackName = "imagen_recortada") => {
    if (!file) {
      clearCroppedImage();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCroppedImageError("Selecciona un archivo de imagen válido.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setCroppedImageError("La imagen debe pesar 5 MB o menos.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setCroppedImageDataUrl(dataUrl);
      setCroppedImagePreview(dataUrl);
      setCroppedImageName(file.name || fallbackName);
      setCroppedImageError("");
    };
    reader.onerror = () => {
      setCroppedImageError("No se pudo leer la imagen seleccionada.");
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImagePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));

    if (!imageItem) {
      setCroppedImageError("Pega una imagen desde el portapapeles.");
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      setCroppedImageError("No se pudo leer la imagen pegada.");
      return;
    }

    e.preventDefault();
    loadCroppedImageFile(file, "imagen_pegada");
  };

  const handleCroppedImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    loadCroppedImageFile(file, "imagen_recortada");
    e.target.value = "";
  };

  const clearCroppedImage = () => {
    setCroppedImageDataUrl("");
    setCroppedImageName("");
    setCroppedImagePreview("");
    setCroppedImageError("");
  };

  const handleExtractVoucherData = async () => {
    if (!croppedImageDataUrl) {
      setCroppedImageError("Primero pega una imagen del voucher.");
      return;
    }

    setIsExtractingVoucher(true);
    setCroppedImageError("");

    try {
      const response = await apiPost("/ai/extract-voucher", {
        imageDataUrl: croppedImageDataUrl,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const data = response.data || {};
      setFormData((prev) => ({
        ...prev,
        cliente: data.cliente || prev.cliente,
        numero_operacion:
          data.numero_operacion || data.numero_operacion_banco || prev.numero_operacion,
        numero_operacion_banco:
          data.numero_operacion_banco || data.numero_operacion || prev.numero_operacion_banco,
        monto: data.monto || prev.monto,
        moneda: data.moneda || prev.moneda,
        fecha_deposito: data.fecha_deposito || prev.fecha_deposito,
      }));
      setMessage({
        type: "success",
        text: "Datos extraídos automáticamente desde el voucher.",
      });
    } catch (error) {
      console.error("Error extrayendo voucher con IA:", error);
      setCroppedImageError(
        error.message || "No se pudieron extraer los datos del voucher.",
      );
    } finally {
      setIsExtractingVoucher(false);
    }
  };

  const handleSelectTrabajador = (trabajador) => {
    setFormData((prev) => ({
      ...prev,
      trabajador_sucursal_id: trabajador.id,
      sucursal_id: trabajador.sucursal_id,
      telefono_origen: trabajador.telefono_origen,
    }));
    setTrabajadorSeleccionado(trabajador);
    setTelefonoSearch(trabajador.telefono_origen);
    setTrabajadoresEncontrados([]);
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.numero_operacion_banco)
      errors.push("Número de operación banco");
    if (!formData.cliente) errors.push("Cliente");
    if (!formData.monto || parseFloat(formData.monto) <= 0)
      errors.push("Monto válido");
    if (!formData.moneda) errors.push("Moneda");
    if (!formData.fecha_deposito) errors.push("Fecha de depósito");
    if (!formData.empresa_id) errors.push("Empresa");
    if (!formData.banco_id) errors.push("Banco");
    if (!formData.anexo) errors.push("Anexo/Cuenta");

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      setMessage({
        type: "error",
        text: `Campos requeridos faltantes: ${errors.join(", ")}`,
      });
      return;
    }

    const shouldCheckDuplicates = String(formData.estado || "validado").trim().toLowerCase() === "validado";

    // Solo validar duplicados cuando el depósito se registra como validado
    if (shouldCheckDuplicates) {
      const isDuplicateValid = await checkForDuplicates();
      if (!isDuplicateValid) {
        return; // No continuar si hay duplicados o error
      }
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const depositData = {
        cliente: formData.cliente,
        numero_operacion: formData.numero_operacion_banco, // Usar numero_operacion_banco para ambos campos
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        fecha_deposito: formData.fecha_deposito,
        anexo: formData.anexo,
        numero_operacion_banco: formData.numero_operacion_banco,
        empresa_id: formData.empresa_id,
        banco_id: formData.banco_id,
        sucursal_id: formData.sucursal_id || null,
        trabajador_sucursal_id: formData.trabajador_sucursal_id
          ? parseInt(formData.trabajador_sucursal_id)
          : null,
        telefono_origen: formData.telefono_origen || null,
        observaciones: "**registros manual**",
        estado: formData.estado || "validado",
        validado_por: currentUser.id,
        fecha_validacion: new Date().toISOString(),
        fecha_registro: new Date().toISOString(),
      };

      if (croppedImageDataUrl) {
        depositData.imagen_recortada_data_url = croppedImageDataUrl;
        depositData.imagen_recortada_name = croppedImageName || "imagen_recortada";
      }

      const response = await apiPost("/depositos", depositData);
      if (response.error) throw new Error(response.error);

      setMessage({
        type: "success",
        text: `Depósito regularizado exitosamente`,
      });

      if (typeof onDepositUpdated === "function") {
        onDepositUpdated();
      }

      // Recargar tabla y limpiar solo datos de depósito
      setTimeout(() => {
        loadDepositosRegularizados();
        resetDepositForm();
      }, 1500);
    } catch (error) {
      console.error("Error creando depósito:", error);
      setMessage({
        type: "error",
        text: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeposito = async (depositoId) => {
    if (!confirm("¿Estás seguro de eliminar este depósito regularizado?"))
      return;

    try {
      const response = await apiDelete(`/depositos/${depositoId}`);
      if (response.error) throw new Error(response.error);

      setMessage({ type: "success", text: "Depósito eliminado" });
      loadDepositosRegularizados();
    } catch (error) {
      console.error("Error eliminando depósito:", error);
      setMessage({ type: "error", text: "Error al eliminar depósito" });
    }
  };

  // Reset parcial que mantiene datos de identificación
  const resetDepositForm = () => {
      setFormData((prev) => ({
      ...prev,
      cliente: "",
      numero_operacion: "",
      monto: "",
      fecha_deposito: "",
      estado: "pendiente",
      numero_operacion_banco: "",
      telefono_origen: "",
    }));
    clearCroppedImage();
    setTelefonoSearch("");
    setTrabajadoresEncontrados([]);
    setTrabajadorSeleccionado(null);
    setMessage({ type: "", text: "" });
  };

  // Reset completo de todo el formulario
  const resetForm = () => {
    setFormData({
      cliente: "",
      numero_operacion: "",
      monto: "",
      moneda: "PEN",
      fecha_deposito: "",
      estado: "pendiente",
      anexo: "",
      numero_operacion_banco: "",
      empresa_id: "",
      banco_id: "",
      sucursal_id: "",
      trabajador_sucursal_id: "",
      telefono_origen: "",
    });
    setTelefonoSearch("");
    setTrabajadoresEncontrados([]);
    setTrabajadorSeleccionado(null);
    setAnexoSearch("");
    clearCroppedImage();
    setMessage({ type: "", text: "" });
  };

  // Funciones para manejo de archivos
  const openFileManager = (deposito) => {
    setSelectedDepositForFiles(deposito);
    setShowFileManager(true);
  };

  const closeFileManager = () => {
    setShowFileManager(false);
    setSelectedDepositForFiles(null);
    // Recargar depósitos para actualizar los colores de las filas
    loadDepositosRegularizados();
  };

  // Reset solo los datos de identificación
  const resetIdentificationForm = () => {
    setFormData((prev) => ({
      ...prev,
      cliente: "",
      empresa_id: "",
      anexo: "",
      banco_id: "",
      sucursal_id: "",
      trabajador_sucursal_id: "",
      estado: "pendiente",
    }));
    setTrabajadorSeleccionado(null);
    setTelefonoSearch("");
    setTrabajadoresEncontrados([]);
    setAnexoSearch("");
    clearCroppedImage();
  };

  // Verificación de duplicados antes de guardar
  const checkForDuplicates = async () => {
    console.log("🔍 Iniciando comprobación de duplicados...", {
      numero_operacion_banco: formData.numero_operacion_banco,
      monto: formData.monto,
      moneda: formData.moneda,
    });

    setIsChecking(true);
    setCheckResult({ checked: false, isDuplicate: false, message: "" });

    if (
      !formData.numero_operacion_banco ||
      !formData.monto ||
      !formData.moneda
    ) {
      setCheckResult({
        checked: true,
        isDuplicate: true,
        message:
          "El importe, moneda y número de operación bancaria son necesarios para la comprobación.",
      });
      setIsChecking(false);
      return false;
    }

    try {
      const response = await apiPost("/depositos/check-duplicate", {
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        numero_operacion_banco: formData.numero_operacion_banco,
      });
      const duplicates = response.duplicates || [];

      if (response.error) {
        console.error("❌ Error en consulta backend:", response.error);
        setCheckResult({
          checked: true,
          isDuplicate: true,
          message: `Error al comprobar: ${response.error}`,
        });
        setIsChecking(false);
        return false;
      }

      if (duplicates.length > 0) {
        console.log("⚠️  Duplicados encontrados:", duplicates);
        setDuplicateDeposits(duplicates);
        setCheckResult({
          checked: true,
          isDuplicate: true,
          message: `¡Alerta de Duplicado! Se encontraron ${duplicates.length} depósito(s) con los mismos datos.`,
        });
        setIsChecking(false);
        return false; // No permitir guardar
      } else {
        console.log("✅ No se encontraron duplicados");
        setDuplicateDeposits([]);
        setCheckResult({
          checked: true,
          isDuplicate: false,
          message: "No se encontraron duplicados. Procede a guardar.",
        });
        setIsChecking(false);
        return true; // Permitir guardar
      }
    } catch (error) {
      console.error("💥 Error crítico en comprobación de duplicados:", error);
      setCheckResult({
        checked: true,
        isDuplicate: true,
        message: `Error crítico: ${error.message}`,
      });
      setIsChecking(false);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950 p-4">
      <div className="w-full mx-auto">
        {/* Header Compacto */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-600 rounded-lg">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Regularizar Depósitos
            </h1>
          </div>
        </div>

        {/* Formulario en 2 Cards */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900/95">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 lg:p-5">
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Card 1: Identificación (Empresa, Trabajador, Anexo) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/95 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Identificación
                </h3>
                <button
                  type="button"
                  onClick={resetIdentificationForm}
                  className="text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Limpiar datos de identificación"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Empresa *
                  </label>
                  <select
                    name="empresa_id"
                    value={formData.empresa_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Seleccionar</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Search className="inline w-4 h-4 mr-1" />
                    Anexo *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={anexoSearch}
                      onChange={(e) => setAnexoSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {anexoSearch &&
                      filteredCuentas.length > 0 &&
                      !formData.anexo && (
                        <div className="absolute z-20 mt-0.5 w-full border border-gray-300 dark:border-gray-600 rounded max-h-32 overflow-y-auto bg-white dark:bg-gray-700 shadow-lg">
                          {filteredCuentas.map((c, index) => (
                            <button
                              key={`${c.anexo}-${c.banco_id}-${index}`}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  anexo: c.anexo,
                                  banco_id: c.banco_id,
                                }));
                                setAnexoSearch(c.anexo);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900 dark:text-white">
                                {c.anexo}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400 text-[8px]">
                                {bancos.find((b) => b.id === c.banco_id)
                                  ?.abreviatura || "N/A"}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Banco (auto)
                  </label>
                  <input
                    type="text"
                    value={
                      bancos.find((b) => b.id === formData.banco_id)
                        ?.abreviatura || ""
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                    disabled
                    readOnly
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Search className="inline w-4 h-4 mr-1" />
                    Trabajador
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={telefonoSearch}
                      onChange={(e) => {
                        setTelefonoSearch(e.target.value);
                        if (e.target.value === "") {
                          setTrabajadorSeleccionado(null);
                        }
                      }}
                      onPaste={handleTelefonoSearchPaste}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Nombre o teléfono..."
                    />
                    {buscandoTelefono && (
                      <Loader2 className="absolute right-1 top-0.5 w-2.5 h-2.5 animate-spin text-gray-400" />
                    )}

                    {trabajadoresEncontrados.length > 0 &&
                      !trabajadorSeleccionado && (
                        <div className="absolute z-20 mt-1 w-full border border-gray-300 dark:border-gray-600 rounded max-h-40 overflow-y-auto bg-white dark:bg-gray-700 shadow-lg">
                          {trabajadoresEncontrados.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSelectTrabajador(t)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-b-0"
                            >
                              <div className="font-semibold text-base text-gray-900 dark:text-white">
                                {t.nombre}
                              </div>
                              <div className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                                📞 {t.telefono_origen} • 🏢{" "}
                                {t.sucursal?.nombre || "Sin sucursal"}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                {trabajadorSeleccionado && (
                  <div className="md:col-span-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-blue-900 dark:text-blue-100 truncate">
                            <User className="inline w-5 h-5 mr-1" />
                            {trabajadorSeleccionado.nombre}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300 truncate font-medium">
                            <Phone className="inline w-4 h-4 mr-1" />
                            {trabajadorSeleccionado.telefono_origen}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400 truncate font-medium">
                            <Building2 className="inline w-4 h-4 mr-1" />
                            {trabajadorSeleccionado.sucursal?.nombre ||
                              "Sin sucursal"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTrabajadorSeleccionado(null);
                            setTelefonoSearch("");
                            setFormData((prev) => ({
                              ...prev,
                              trabajador_sucursal_id: "",
                              sucursal_id: "",
                              telefono_origen: "",
                            }));
                          }}
                          className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded flex-shrink-0"
                        >
                          <X className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Datos del Voucher */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/95 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Datos del Voucher
              </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cliente *
                  </label>
                  <input
                    type="text"
                    name="cliente"
                    value={formData.cliente}
                    onChange={handleChange}
                    placeholder="Nombre del cliente"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nro. Operación Banco *
                  </label>
                  <input
                    type="text"
                    name="numero_operacion_banco"
                    value={formData.numero_operacion_banco}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Moneda *
                  </label>
                  <select
                    name="moneda"
                    value={formData.moneda}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="PEN">PEN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha *
                  </label>
                  <div className="flex gap-0.5">
                    <input
                      type="date"
                      name="fecha_deposito"
                      value={formData.fecha_deposito}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split("T")[0];
                        setFormData((prev) => ({
                          ...prev,
                          fecha_deposito: today,
                        }));
                      }}
                      className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      title="Fecha de hoy"
                    >
                      Hoy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="validado">Validado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>

              </div>
            </div>

            </div>

            <div className="lg:col-span-7">
              <div className="h-full rounded-xl border border-slate-200 bg-slate-50/95 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    Voucher y extracción
                  </h3>
                  {croppedImagePreview && (
                    <button
                      type="button"
                      onClick={clearCroppedImage}
                      className="text-xs px-2 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Limpiar imagen"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-3">
                  <div
                    tabIndex={0}
                    onPaste={handleCroppedImagePaste}
                    onClick={(e) => e.currentTarget.focus()}
                    className="flex min-h-[32rem] cursor-text flex-col overflow-hidden rounded-xl border border-slate-200 bg-white outline-none transition-colors hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:border-gray-700 dark:bg-gray-950/50 dark:hover:border-purple-500"
                  >
                    <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-purple-700 dark:border-gray-700 dark:text-purple-300">
                      Haz clic aquí y pega la imagen con Ctrl+V
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center bg-gradient-to-b from-white to-slate-50 p-3 dark:from-gray-950 dark:to-gray-900">
                      {croppedImagePreview ? (
                        <img
                          src={croppedImagePreview}
                          alt="Vista previa de la imagen pegada"
                          className="max-h-[28rem] max-w-full rounded-lg object-contain shadow-sm"
                        />
                      ) : (
                        <div className="max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
                          Pega aquí la captura del voucher. Luego usa el botón de extracción para completar los datos automáticamente.
                        </div>
                      )}
                    </div>
                  </div>

                  {croppedImagePreview && (
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {croppedImageName || "imagen_pegada"}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Lista para subir al storage y extraer datos con IA.
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleExtractVoucherData}
                          disabled={isExtractingVoucher}
                          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isExtractingVoucher ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Extrayendo...
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4" />
                              Extraer datos con IA
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={clearCroppedImage}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Trash2 className="h-4 w-4" />
                          Limpiar imagen
                        </button>
                      </div>
                    </div>
                  )}

                  {croppedImageError && (
                    <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>{croppedImageError}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Message y Botones */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            {message.text && (
              <div
                className={`p-1.5 rounded flex items-start gap-2 text-sm mb-2 ${
                  message.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <p
                  className={
                    message.type === "success"
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }
                >
                  {message.text}
                </p>
              </div>
            )}

            {/* Resultado de verificación de duplicados */}
            {checkResult.checked && (
              <div
                className={`p-3 rounded mt-3 text-sm ${
                  checkResult.isDuplicate
                    ? "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                    : "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {checkResult.isDuplicate ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span className="font-medium">{checkResult.message}</span>
                </div>
                {duplicateDeposits.length > 0 && (
                  <div className="mt-2 text-xs">
                    <div className="font-medium mb-1">
                      Duplicados encontrados:
                    </div>
                    {duplicateDeposits.map((dup) => (
                      <div key={dup.id} className="ml-2">
                        • Dep. #{dup.id} - Op:{" "}
                        {dup.numero_operacion_banco || dup.numero_operacion} -
                        {dup.empresa?.nombre} - {dup.sucursal?.nombre} - Estado:{" "}
                        {dup.estado}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading || isChecking}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={
                  loading ||
                  isChecking ||
                  (String(formData.estado || "validado").trim().toLowerCase() === "validado" &&
                    checkResult.checked &&
                    checkResult.isDuplicate)
                }
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-1 px-4 rounded transition-colors flex items-center justify-center gap-1 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </form>

        {/* Tabla de Depósitos Regularizados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-3 border-b dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Depósitos Regularizados ({depositosRegularizados.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loadingDepositos ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : depositosRegularizados.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400 text-sm">
                No hay depósitos regularizados
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Empresa
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Anexo
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Nro. Op. Banco
                    </th>
                    <th className="px-2 py-1.5 text-right text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Monto
                    </th>
                    <th className="px-2 py-1.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Moneda
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Fecha Depósito
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Banco
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Trabajador
                    </th>
                    <th className="px-2 py-1.5 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Regularizado Por
                    </th>
                    <th className="px-2 py-1.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {depositosRegularizados.map((dep) => (
                    <tr
                      key={dep.id}
                      className={`${
                        !dep.imagen_voucher
                          ? 'bg-orange-200 dark:bg-orange-800/40 hover:bg-orange-300 dark:hover:bg-orange-700/50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <td className="px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                        {dep.empresa?.nombre || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {dep.anexo || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 font-mono">
                        {dep.numero_operacion_banco || dep.numero_operacion}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100 font-semibold">
                        {dep.monto?.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-center text-gray-900 dark:text-gray-100 font-medium">
                        {dep.moneda}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(dep.fecha_deposito)}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                        {dep.banco?.abreviatura || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                        {dep.trabajador?.nombre || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                        {dep.validado_por_usuario?.nombre || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => openFileManager(dep)}
                            className="p-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
                            title="Gestionar Archivos"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeposito(dep.id)}
                            className="p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal para gestionar archivos */}
      {showFileManager && selectedDepositForFiles && (
        <SimpleFileManager
          deposito={selectedDepositForFiles}
          onClose={closeFileManager}
          onDepositoUpdated={onDepositUpdated}
        />
      )}
    </div>
  );
};

export default RegularizarDepositos;
