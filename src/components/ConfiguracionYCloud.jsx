import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient.js";
import yCloudService from "../services/yCloudService.js";
import {
  MessageSquare,
  Save,
  Trash2,
  Plus,
  Settings,
  Key,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Send,
} from "lucide-react";

const ConfiguracionYCloud = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showApiKey, setShowApiKey] = useState({});

  const [formData, setFormData] = useState({
    alias: "",
    descripcion: "",
    api_key: "",
    waba_id: "",
    phone_number_id: "",
    default_from_number: "",
    activo: true,
  });

  // Estados de validacion
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Cargar configuraciones al montar
  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ycloud_config")
        .select("*")
        .order("activo", { ascending: false })
        .order("creado_en", { ascending: false });

      if (error) {
        console.error("Error cargando configuraciones YCloud:", error);

        if (error.code === "PGRST205" || error.code === "42P01") {
          setError(
            "La tabla 'ycloud_config' no existe en la base de datos. Por favor ejecuta la migracion desde el archivo de migraciones SQL."
          );
        }

        return;
      }

      setConfigs(data || []);

      if (data && data.length > 0) {
        console.log(
          "Configuraciones YCloud cargadas exitosamente:",
          data.length
        );
      }
    } catch (error) {
      console.error("Error en cargarConfiguraciones:", error);
      setError(
        "Error al cargar las configuraciones. Por favor, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.alias?.trim()) {
      newErrors.alias = "El alias es requerido";
    }

    if (!formData.api_key?.trim()) {
      newErrors.api_key = "La API Key es requerida";
    } else if (formData.api_key.trim().length < 10) {
      newErrors.api_key = "La API Key debe tener al menos 10 caracteres";
    }

    if (!formData.default_from_number?.trim()) {
      newErrors.default_from_number = "El numero de WhatsApp es requerido";
    } else if (!formData.default_from_number.startsWith("+")) {
      newErrors.default_from_number =
        "El numero debe incluir codigo de pais (ej: +521234567890)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testConnection = async (config) => {
    setTestingConnection(config.id);
    setTestResult(null);

    try {
      // Probar conexion con YCloud API verificando el balance
      const response = await fetch("https://api.ycloud.com/v2/balance", {
        method: "GET",
        headers: {
          "X-API-Key": config.api_key,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `Conexion exitosa con YCloud. Balance: ${data.amount} ${data.currency}`,
        });
      } else {
        const errorData = await response.json();
        setTestResult({
          success: false,
          message: `Error ${response.status}: ${
            errorData.error?.message || response.statusText
          }`,
        });
      }
    } catch (error) {
      let errorMessage = `Error de conexion: ${error.message}`;

      if (error.message.includes("CORS") || error.message.includes("fetch")) {
        errorMessage +=
          "\n\nNota: Este error puede ser debido a restricciones CORS. El envio de mensajes puede funcionar correctamente via Edge Function.";
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const enviarMensajePrueba = async (config) => {
    const toNumber = prompt(
      `Enviar mensaje de prueba desde YCloud

Ingresa el numero de destino (con codigo de pais):
Ejemplo: +521234567890`
    );

    if (!toNumber || !toNumber.trim()) {
      return;
    }

    if (!toNumber.startsWith("+")) {
      alert("El numero debe incluir el codigo de pais (ej: +521234567890)");
      return;
    }

    setTestingConnection(config.id);
    setTestResult(null);

    try {
      const response = await yCloudService.sendTestMessage(
        config.id,
        toNumber.trim()
      );

      if (response.success) {
        setTestResult({
          success: true,
          message: `Mensaje de prueba enviado exitosamente a ${toNumber}`,
        });
      } else {
        setTestResult({
          success: false,
          message: response.message || "Error enviando mensaje de prueba",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const guardarConfiguracion = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      if (formData.activo && !editingConfig) {
        await supabase
          .from("ycloud_config")
          .update({ activo: false })
          .eq("activo", true);
      }

      const configData = {
        alias: formData.alias.trim(),
        descripcion: formData.descripcion?.trim() || null,
        api_key: formData.api_key.trim(),
        waba_id: formData.waba_id?.trim() || null,
        phone_number_id: formData.phone_number_id?.trim() || null,
        default_from_number: formData.default_from_number.trim(),
        activo: formData.activo,
      };

      let result;
      if (editingConfig) {
        result = await supabase
          .from("ycloud_config")
          .update(configData)
          .eq("id", editingConfig.id)
          .select();
      } else {
        result = await supabase
          .from("ycloud_config")
          .insert(configData)
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      await cargarConfiguraciones();
      resetForm();

      console.log(
        `Configuracion YCloud ${
          editingConfig ? "actualizada" : "creada"
        } exitosamente`
      );
    } catch (error) {
      console.error("Error guardando configuracion:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const eliminarConfiguracion = async (config) => {
    if (
      !confirm(`Estas seguro de eliminar la configuracion "${config.alias}"?`)
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("ycloud_config")
        .delete()
        .eq("id", config.id);

      if (error) throw error;

      await cargarConfiguraciones();
      console.log("Configuracion eliminada");
    } catch (error) {
      console.error("Error eliminando configuracion:", error);
      alert(`Error eliminando: ${error.message}`);
    }
  };

  const editarConfiguracion = (config) => {
    setEditingConfig(config);
    setFormData({
      alias: config.alias,
      descripcion: config.descripcion || "",
      api_key: config.api_key,
      waba_id: config.waba_id || "",
      phone_number_id: config.phone_number_id || "",
      default_from_number: config.default_from_number || "",
      activo: config.activo,
    });
    setShowForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setFormData({
      alias: "",
      descripcion: "",
      api_key: "",
      waba_id: "",
      phone_number_id: "",
      default_from_number: "",
      activo: true,
    });
    setEditingConfig(null);
    setShowForm(false);
    setErrors({});
    setTestResult(null);
  };

  const toggleShowApiKey = (configId) => {
    setShowApiKey((prev) => ({
      ...prev,
      [configId]: !prev[configId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Cargando configuraciones...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error de configuracion
              </h3>
              <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    cargarConfiguraciones();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Intentar nuevamente
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Configuracion YCloud
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona las configuraciones de YCloud para envio de WhatsApp
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Configuracion</span>
        </button>
      </div>

      {/* Informacion sobre YCloud */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full">
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              YCloud WhatsApp Business API
            </h3>
            <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              <p>
                Obtén tu API Key desde el{" "}
                <a
                  href="https://www.ycloud.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  Dashboard de YCloud
                </a>{" "}
                en la seccion Developers.
              </p>
              <p className="mt-1">
                Documentacion:{" "}
                <a
                  href="https://docs.ycloud.com/reference"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  docs.ycloud.com/reference
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-4 rounded-lg ${
            testResult.success
              ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <span className="whitespace-pre-line">{testResult.message}</span>
          </div>
        </motion.div>
      )}

      {/* Formulario */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingConfig ? "Editar" : "Nueva"} Configuracion YCloud
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alias *
              </label>
              <input
                type="text"
                name="alias"
                value={formData.alias}
                onChange={handleInputChange}
                placeholder="ej: YCloud Principal"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.alias ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.alias && (
                <p className="text-red-500 text-xs mt-1">{errors.alias}</p>
              )}
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripcion
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="ej: Configuracion para envios de WhatsApp"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key *
              </label>
              <input
                type="password"
                name="api_key"
                value={formData.api_key}
                onChange={handleInputChange}
                placeholder="Tu API Key de YCloud"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.api_key ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.api_key && (
                <p className="text-red-500 text-xs mt-1">{errors.api_key}</p>
              )}
            </div>

            {/* Numero de WhatsApp por defecto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numero de WhatsApp (remitente) *
              </label>
              <input
                type="text"
                name="default_from_number"
                value={formData.default_from_number}
                onChange={handleInputChange}
                placeholder="ej: +521234567890"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.default_from_number
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {errors.default_from_number && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.default_from_number}
                </p>
              )}
            </div>

            {/* WABA ID (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                WABA ID (opcional)
              </label>
              <input
                type="text"
                name="waba_id"
                value={formData.waba_id}
                onChange={handleInputChange}
                placeholder="WhatsApp Business Account ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* Phone Number ID (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number ID (opcional)
              </label>
              <input
                type="text"
                name="phone_number_id"
                value={formData.phone_number_id}
                onChange={handleInputChange}
                placeholder="ID del numero en YCloud"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Activo */}
          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="activo"
                checked={formData.activo}
                onChange={handleInputChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Configuracion activa
              </span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={guardarConfiguracion}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{editingConfig ? "Actualizar" : "Guardar"}</span>
            </button>

            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </motion.div>
      )}

      {/* Lista de Configuraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {configs.map((config) => (
          <motion.div
            key={config.id}
            layout
            className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 ${
              config.activo
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare
                  className={`h-5 w-5 ${
                    config.activo ? "text-green-600" : "text-gray-500"
                  }`}
                />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {config.alias}
                </span>
                {config.activo && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    ACTIVO
                  </span>
                )}
              </div>
            </div>

            {/* Informacion */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Desde: {config.default_from_number || "No definido"}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>API Key: </span>
                <button
                  onClick={() => toggleShowApiKey(config.id)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  {showApiKey[config.id] ? (
                    <>
                      <span className="font-mono text-xs">
                        {config.api_key.substring(0, 20)}...
                      </span>
                      <EyeOff className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>********</span>
                      <Eye className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              {config.waba_id && (
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>WABA: {config.waba_id}</span>
                </div>
              )}

              {config.descripcion && (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  {config.descripcion}
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => testConnection(config)}
                disabled={testingConnection === config.id}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                title="Verificar conexion (balance)"
              >
                {testingConnection === config.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <span>Test API</span>
              </button>

              <button
                onClick={() => enviarMensajePrueba(config)}
                disabled={testingConnection === config.id}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                title="Enviar mensaje de prueba"
              >
                {testingConnection === config.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Test Msg</span>
              </button>

              <button
                onClick={() => editarConfiguracion(config)}
                className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                title="Editar configuracion"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => eliminarConfiguracion(config)}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                title="Eliminar configuracion"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              Creado: {new Date(config.creado_en).toLocaleDateString()}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {configs.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No hay configuraciones YCloud
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Crea tu primera configuracion para empezar a usar YCloud WhatsApp
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Crear Primera Configuracion
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionYCloud;
