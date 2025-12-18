import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient.js";
import {
  MessageSquare,
  Save,
  Trash2,
  Plus,
  Settings,
  Globe,
  Key,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";

const ConfiguracionChatWoot = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showApiToken, setShowApiToken] = useState({});

  const [formData, setFormData] = useState({
    alias: "",
    descripcion: "",
    chatwoot_url: "",
    api_token: "",
    account_id: "",
    inbox_id: "",
    activo: true,
  });

  // Estados de validación
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
        .from("chatwoot_config")
        .select("*")
        .order("activo", { ascending: false })
        .order("creado_en", { ascending: false });

      if (error) {
        console.error("Error cargando configuraciones ChatWoot:", error);

        // Si la tabla no existe, mostrar mensaje de ayuda
        if (error.code === "PGRST205") {
          setError(
            "La tabla 'chatwoot_config' no existe en la base de datos. Por favor ejecuta la migración desde el archivo 'crear_tabla_chatwoot_manual.sql' en el Dashboard de Supabase."
          );
        }

        return;
      }

      setConfigs(data || []);

      // Mostrar mensaje de éxito si es la primera vez que se carga
      if (data && data.length > 0) {
        console.log(
          "✅ Configuraciones ChatWoot cargadas exitosamente:",
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

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!formData.alias?.trim()) {
      newErrors.alias = "El alias es requerido";
    }

    if (!formData.chatwoot_url?.trim()) {
      newErrors.chatwoot_url = "La URL de ChatWoot es requerida";
    } else if (!isValidUrl(formData.chatwoot_url)) {
      newErrors.chatwoot_url = "URL inválida";
    }

    if (!formData.api_token?.trim()) {
      newErrors.api_token = "El token API es requerido";
    }

    if (!formData.account_id?.trim()) {
      newErrors.account_id = "El Account ID es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return url.startsWith("http://") || url.startsWith("https://");
    } catch {
      return false;
    }
  };

  const testConnection = async (config) => {
    setTestingConnection(config.id);
    setTestResult(null);

    try {
      // Limpiar la URL para evitar duplicación de rutas
      let baseUrl = config.chatwoot_url;
      if (baseUrl.includes("/app/accounts")) {
        baseUrl = baseUrl.split("/app/accounts")[0];
      }

      // Usar siempre la URL directa con headers optimizados
      const testUrl = `${baseUrl}/api/v1/accounts/${config.account_id}/profile`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          api_access_token: config.api_token,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: "Conexión exitosa con ChatWoot",
        });
      } else {
        setTestResult({
          success: false,
          message: `Error ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error) {
      let errorMessage = `Error de conexión: ${error.message}`;

      // Agregar información específica sobre CORS
      if (error.message.includes("CORS") || error.message.includes("fetch")) {
        errorMessage +=
          "\n\n💡 Nota: Este error puede ser debido a restricciones CORS. El envío de mensajes puede funcionar correctamente en producción.";
      }

      setTestResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const guardarConfiguracion = async () => {
    if (!validarFormulario()) return;

    try {
      setSaving(true);

      // Si se está marcando como activo, desactivar otros
      if (formData.activo && !editingConfig) {
        await supabase
          .from("chatwoot_config")
          .update({ activo: false })
          .eq("activo", true);
      }

      const configData = {
        alias: formData.alias.trim(),
        descripcion: formData.descripcion?.trim() || null,
        chatwoot_url: formData.chatwoot_url.trim().replace(/\/$/, ""), // Quitar slash final
        api_token: formData.api_token.trim(),
        account_id: formData.account_id.trim(),
        inbox_id: formData.inbox_id?.trim() || null,
        activo: formData.activo,
      };

      let result;
      if (editingConfig) {
        // Actualizar existente
        result = await supabase
          .from("chatwoot_config")
          .update(configData)
          .eq("id", editingConfig.id)
          .select();
      } else {
        // Crear nuevo
        result = await supabase
          .from("chatwoot_config")
          .insert(configData)
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      // Recargar configuraciones
      await cargarConfiguraciones();

      // Resetear formulario
      resetForm();

      console.log(
        `✅ Configuración ChatWoot ${
          editingConfig ? "actualizada" : "creada"
        } exitosamente`
      );
    } catch (error) {
      console.error("Error guardando configuración:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const eliminarConfiguracion = async (config) => {
    if (
      !confirm(`¿Estás seguro de eliminar la configuración "${config.alias}"?`)
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("chatwoot_config")
        .delete()
        .eq("id", config.id);

      if (error) throw error;

      await cargarConfiguraciones();
      console.log("✅ Configuración eliminada");
    } catch (error) {
      console.error("Error eliminando configuración:", error);
      alert(`Error eliminando: ${error.message}`);
    }
  };

  const editarConfiguracion = (config) => {
    setEditingConfig(config);
    setFormData({
      alias: config.alias,
      descripcion: config.descripcion || "",
      chatwoot_url: config.chatwoot_url,
      api_token: config.api_token,
      account_id: config.account_id,
      inbox_id: config.inbox_id || "",
      activo: config.activo,
    });
    setShowForm(true);
    setErrors({});
  };

  const resetForm = () => {
    setFormData({
      alias: "",
      descripcion: "",
      chatwoot_url: "",
      api_token: "",
      account_id: "",
      inbox_id: "",
      activo: true,
    });
    setEditingConfig(null);
    setShowForm(false);
    setErrors({});
    setTestResult(null);
  };

  const toggleShowToken = (configId) => {
    setShowApiToken((prev) => ({
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
                Error de configuración
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
              Configuración ChatWoot
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona las configuraciones de ChatWoot para envío de mensajes
            </p>
          </div>
        </div>

        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Configuración</span>
        </button>
      </div>

      {/* Nota informativa sobre CORS en desarrollo */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-full">
              <svg
                className="h-4 w-4 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Información sobre pruebas de conexión
            </h3>
            <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              <p>
                Si la prueba de conexión falla debido a CORS, no te preocupes.
                Las funciones de envío de mensajes funcionarán correctamente en
                producción. Puedes guardar la configuración y probar el envío
                directamente.
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
            <span>{testResult.message}</span>
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
              {editingConfig ? "Editar" : "Nueva"} Configuración ChatWoot
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
                placeholder="ej: ChatWoot Principal"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.alias ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.alias && (
                <p className="text-red-500 text-xs mt-1">{errors.alias}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="ej: Configuración para atención al cliente"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {/* URL ChatWoot */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL ChatWoot *
              </label>
              <input
                type="url"
                name="chatwoot_url"
                value={formData.chatwoot_url}
                onChange={handleInputChange}
                placeholder="https://tu-chatwoot.com"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.chatwoot_url ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.chatwoot_url && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.chatwoot_url}
                </p>
              )}
            </div>

            {/* API Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Token *
              </label>
              <input
                type="password"
                name="api_token"
                value={formData.api_token}
                onChange={handleInputChange}
                placeholder="Token de acceso API"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.api_token ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.api_token && (
                <p className="text-red-500 text-xs mt-1">{errors.api_token}</p>
              )}
            </div>

            {/* Account ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account ID *
              </label>
              <input
                type="text"
                name="account_id"
                value={formData.account_id}
                onChange={handleInputChange}
                placeholder="ej: 1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.account_id ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.account_id && (
                <p className="text-red-500 text-xs mt-1">{errors.account_id}</p>
              )}
            </div>

            {/* Inbox ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inbox ID (opcional)
              </label>
              <input
                type="text"
                name="inbox_id"
                value={formData.inbox_id}
                onChange={handleInputChange}
                placeholder="ej: 1"
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
                Configuración activa
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

            {/* Información */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <a
                  href={config.chatwoot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <span>{config.chatwoot_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Account: {config.account_id}</span>
              </div>

              {config.inbox_id && (
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Inbox: {config.inbox_id}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>Token: </span>
                <button
                  onClick={() => toggleShowToken(config.id)}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                >
                  {showApiToken[config.id] ? (
                    <>
                      <span className="font-mono text-xs">
                        {config.api_token}
                      </span>
                      <EyeOff className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>••••••••</span>
                      <Eye className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

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
              >
                {testingConnection === config.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                <span>Test</span>
              </button>

              <button
                onClick={() => editarConfiguracion(config)}
                className="px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => eliminarConfiguracion(config)}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
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
            No hay configuraciones ChatWoot
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Crea tu primera configuración para empezar a usar ChatWoot
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Crear Primera Configuración
          </button>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionChatWoot;
