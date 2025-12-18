import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient.js";
import chatwootService from "../services/chatwootService.js";
import {
  Send,
  MessageSquare,
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";

const EnviarMensajeChatWoot = () => {
  // Función auxiliar para limpiar URLs de ChatWoot
  const cleanChatWootUrl = (url) => {
    if (!url) return url;
    // Remover /app/accounts si está presente para evitar duplicación
    if (url.includes("/app/accounts")) {
      return url.split("/app/accounts")[0];
    }
    return url;
  };

  // Función para obtener la URL de API (siempre URL directa)
  const getApiUrl = (config, endpoint) => {
    const baseUrl = cleanChatWootUrl(config.chatwoot_url);
    return `${baseUrl}/api${endpoint}`;
  };

  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [forceRealSend, setForceRealSend] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    // Parametros requeridos de la API
    conversation_id: "",
    content: "",
    message_type: "outgoing",

    // Parametros opcionales segun la documentacion oficial
    private: false,
    content_type: "text",
    content_attributes: {},
    campaign_id: "",

    // Para WhatsApp Template Messages (segun documentacion oficial)
    use_template: false,
    template_params: {
      name: "",
      category: "MARKETING", // MARKETING, UTILITY, AUTHENTICATION
      language: "en",
      processed_params: {
        body: {},
        header: {
          media_url: "",
          media_type: "image", // image, document, video, text
        },
        buttons: [],
      },
    },
  });

  // Templates predefinidos segun la documentacion
  const templateExamples = {
    order_confirmation: {
      name: "order_confirmation",
      category: "MARKETING",
      language: "en",
      description: "Confirmacion de pedido con imagen",
      example:
        "Hi your order 121212 is confirmed. Please wait for further updates",
    },
    discount_coupon: {
      name: "discount_coupon",
      category: "MARKETING",
      language: "en",
      description: "Cupon de descuento con boton",
      example:
        "Special offer! Get 30% off your next purchase. Use the code below",
    },
  };

  const [errors, setErrors] = useState({});

  // Cargar configuraciones de ChatWoot al montar
  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarTemplatePredefinido = (templateKey) => {
    const template = templateExamples[templateKey];
    if (template) {
      setFormData((prev) => ({
        ...prev,
        content: template.example,
        use_template: true,
        template_params: {
          name: template.name,
          category: template.category,
          language: template.language,
          processed_params: {
            body:
              templateKey === "order_confirmation"
                ? { 1: "121212" }
                : templateKey === "discount_coupon"
                ? { discount_percentage: "30" }
                : {},
            header:
              templateKey === "order_confirmation"
                ? {
                    media_url: "https://picsum.photos/200/300",
                    media_type: "image",
                  }
                : {
                    media_url: "",
                    media_type: "image",
                  },
            buttons:
              templateKey === "discount_coupon"
                ? [
                    {
                      type: "copy_code",
                      parameter: "SAVE20",
                    },
                  ]
                : [],
          },
        },
      }));
    }
  };

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      console.log("🔄 Cargando configuraciones ChatWoot...");

      const { data, error } = await supabase
        .from("chatwoot_config")
        .select("*")
        .eq("activo", true)
        .order("creado_en", { ascending: false });

      if (error) {
        console.error("❌ Error cargando configuraciones:", error);
        setError(`Error al cargar configuraciones: ${error.message}`);
        setConfigs([]);
        return;
      }

      console.log("📦 Datos recibidos:", data);
      setConfigs(data || []);

      if (data && data.length > 0) {
        setSelectedConfig(data[0]);
        console.log(
          "✅ ChatWoot Messenger: Configuraciones cargadas exitosamente"
        );
      } else {
        console.log("⚠️ No se encontraron configuraciones activas");
        setError("No se encontraron configuraciones de ChatWoot activas");
      }
    } catch (error) {
      console.error("💥 Error crítico en cargarConfiguraciones:", error);
      setError(`Error crítico: ${error.message}`);
      setConfigs([]);
    } finally {
      console.log("🏁 Finalizando carga de configuraciones");
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes(".")) {
      // Para campos anidados como template_params.name
      const keys = name.split(".");
      setFormData((prev) => {
        const newData = { ...prev };
        let current = newData;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = type === "checkbox" ? checked : value;
        return newData;
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }

    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validarFormulario = () => {
    const newErrors = {};

    if (!selectedConfig) {
      newErrors.config = "Selecciona una configuracion ChatWoot";
    }

    if (!formData.conversation_id?.trim()) {
      newErrors.conversation_id = "ID de conversacion es requerido";
    }

    if (!formData.content?.trim()) {
      newErrors.content = "El contenido del mensaje es requerido";
    }

    if (formData.use_template && !formData.template_params.name?.trim()) {
      newErrors.template_name =
        "Nombre de template es requerido para mensajes template";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const enviarMensaje = async () => {
    if (!validarFormulario()) return;

    try {
      setSending(true);
      setResult(null);

      // Preparar datos para la Edge Function
      const messageData = {
        configId: selectedConfig.id,
        conversationId: formData.conversation_id,
        content: formData.content,
        messageType: formData.message_type,
        private: formData.private,
        contentType: formData.content_type,
        contentAttributes: formData.content_attributes,
        campaignId: formData.campaign_id || null,
        templateParams:
          formData.use_template && formData.template_params.name
            ? formData.template_params
            : null,
      };

      console.log("📤 Enviando mensaje a ChatWoot vía Edge Function:", {
        configId: messageData.configId,
        conversationId: messageData.conversationId,
        content: messageData.content.substring(0, 50) + "...",
        config: selectedConfig.alias,
      });

      // Detectar si estamos en desarrollo y simular el envío (a menos que se fuerce el envío real)
      if (import.meta.env.DEV && !forceRealSend) {
        // Simular el envío exitoso en desarrollo
        setTimeout(() => {
          setResult({
            success: true,
            message: `✅ SIMULACIÓN DE ENVÍO EXITOSA (Edge Function)

📧 Mensaje principal simulado correctamente:

� Edge Function: send-chatwoot-message
🏷️ Configuración: ${selectedConfig.alias}
💬 Conversación: ${formData.conversation_id}
📝 Contenido: ${messageData.content}
🔧 Tipo: ${messageData.messageType}

🚀 Con Edge Function, NO hay problemas de CORS en producción.`,
            data: {
              simulation: true,
              id: `sim_edge_${Date.now()}`,
              content: messageData.content,
              message_type: messageData.messageType,
              created_at: new Date().toISOString(),
              config_used: selectedConfig.alias,
              conversation_id: messageData.conversationId,
              edge_function: true,
            },
          });
          setSending(false);
        }, 1500); // Simular delay de red
        return;
      }

      // Usar Edge Function (sin CORS)
      const response = await chatwootService.sendMessage(messageData);

      if (response.success) {
        setResult({
          success: true,
          message: "✅ Mensaje enviado exitosamente vía Edge Function",
          data: response.data,
        });

        console.log("✅ Respuesta exitosa de ChatWoot Edge Function:", {
          message_id: response.data?.id,
          status: response.data?.status,
          content: response.data?.content,
          created_at: response.data?.created_at,
          conversation_id: response.data?.conversation_id,
        });

        // Limpiar solo campos específicos, mantener configuración
        setFormData((prev) => ({
          ...prev,
          conversation_id: "",
          content: "",
          campaign_id: "",
          use_template: false,
          template_params: {
            name: "",
            category: "MARKETING",
            language: "en",
            processed_params: {
              body: {},
              header: {
                media_url: "",
                media_type: "image",
              },
              buttons: [],
            },
          },
        }));
      } else {
        setResult({
          success: false,
          message: response.message || "Error desconocido al enviar mensaje",
          data: response.error,
        });
      }
    } catch (error) {
      console.error("💥 Error en enviarMensaje:", error);

      setResult({
        success: false,
        message: `Error enviando mensaje: ${error.message}`,
        data: error,
      });
    } finally {
      setSending(false);
    }
  };

  const enviarMensajePrueba = async () => {
    if (!selectedConfig) {
      setResult({
        success: false,
        message: "Selecciona una configuración ChatWoot primero",
        data: null,
      });
      return;
    }

    const conversationId =
      prompt(`Ingresa el ID de conversación para el mensaje de prueba:

Ejemplo: 123, 456, etc.

Este debe ser un ID de conversación válido en tu cuenta de ChatWoot.`);

    if (!conversationId || !conversationId.trim()) {
      return;
    }

    try {
      setSending(true);
      setResult(null);

      console.log("📤 Enviando mensaje de prueba vía Edge Function:", {
        configId: selectedConfig.id,
        conversationId: conversationId.trim(),
        config: selectedConfig.alias,
      });

      // Detectar si estamos en desarrollo y simular el envío (a menos que se fuerce el envío real)
      if (import.meta.env.DEV && !forceRealSend) {
        // Simular el envío exitoso en desarrollo
        setTimeout(() => {
          setResult({
            success: true,
            message: `✅ SIMULACIÓN DE MENSAJE DE PRUEBA (Edge Function)

📧 Mensaje de prueba simulado correctamente:

� Edge Function: send-chatwoot-message
🏷️ Configuración: ${selectedConfig.alias}
💬 Conversación: ${conversationId.trim()}
📝 Tipo: Mensaje de prueba del sistema

🚀 Con Edge Function, NO hay problemas de CORS.`,
            data: {
              simulation: true,
              id: `sim_test_${Date.now()}`,
              content: "Mensaje de prueba del sistema",
              message_type: "outgoing",
              created_at: new Date().toISOString(),
              config_used: selectedConfig.alias,
              conversation_id: conversationId.trim(),
              edge_function: true,
            },
          });
          setSending(false);
        }, 1500); // Simular delay de red
        return;
      }

      // Usar Edge Function para mensaje de prueba
      const response = await chatwootService.sendTestMessage(
        selectedConfig.id,
        conversationId.trim()
      );

      if (response.success) {
        setResult({
          success: true,
          message:
            "✅ Mensaje de prueba enviado exitosamente vía Edge Function",
          data: response.data,
        });

        console.log("✅ Mensaje de prueba enviado exitosamente:", {
          message_id: response.data?.id,
          status: response.data?.status,
          content: response.data?.content,
        });
      } else {
        setResult({
          success: false,
          message: response.message || "Error desconocido en mensaje de prueba",
          data: response.error,
        });
      }
    } catch (error) {
      console.error("💥 Error en mensaje de prueba:", error);

      setResult({
        success: false,
        message: `Error en mensaje de prueba: ${error.message}`,
        data: error,
      });
    } finally {
      setSending(false);
    }
  };

  const agregarParametroBody = () => {
    const key = prompt(`Ingresa la clave del parámetro:
    
Ejemplos comunes:
- "1", "2", "3"... para parámetros numerados
- "customer_name" para nombre del cliente  
- "order_id" para ID de pedido
- "discount_percentage" para porcentaje de descuento

Clave:`);

    const value = prompt(`Ingresa el valor para "${key}":
    
Ejemplos:
- Para "1": "121212" (número de pedido)
- Para "customer_name": "Juan Pérez"
- Para "discount_percentage": "30"

Valor:`);

    if (key && value) {
      setFormData((prev) => ({
        ...prev,
        template_params: {
          ...prev.template_params,
          processed_params: {
            ...prev.template_params.processed_params,
            body: {
              ...prev.template_params.processed_params.body,
              [key.trim()]: value.trim(),
            },
          },
        },
      }));
    }
  };

  const agregarBoton = () => {
    const tipo = prompt(`Selecciona el tipo de botón:
    1. copy_code - Para código de descuento
    2. url - Para enlaces web
    3. phone_number - Para números telefónicos
    
Escribe: copy_code, url, o phone_number`);

    if (!tipo || !["copy_code", "url", "phone_number"].includes(tipo.trim())) {
      alert("Tipo de botón inválido. Use: copy_code, url, o phone_number");
      return;
    }

    let parametro;
    switch (tipo.trim()) {
      case "copy_code":
        parametro = prompt("Código a copiar (ej: SAVE20, DISCOUNT30):");
        break;
      case "url":
        parametro = prompt("URL completa (ej: https://ejemplo.com):");
        break;
      case "phone_number":
        parametro = prompt("Número telefónico (ej: +1234567890):");
        break;
    }

    if (parametro && parametro.trim()) {
      setFormData((prev) => ({
        ...prev,
        template_params: {
          ...prev.template_params,
          processed_params: {
            ...prev.template_params.processed_params,
            buttons: [
              ...prev.template_params.processed_params.buttons,
              { type: tipo.trim(), parameter: parametro.trim() },
            ],
          },
        },
      }));
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      conversation_id: "",
      content: "",
      message_type: "outgoing",
      private: false,
      content_type: "text",
      content_attributes: {},
      campaign_id: "",
      use_template: false,
      template_params: {
        name: "",
        category: "MARKETING",
        language: "en",
        processed_params: {
          body: {},
          header: {
            media_url: "",
            media_type: "image",
          },
          buttons: [],
        },
      },
    });
    setErrors({});
    setResult(null);
  };

  const probarTemplate = async (templateKey) => {
    if (!selectedConfig) {
      setResult({
        success: false,
        message: "Selecciona una configuracion ChatWoot primero",
        data: null,
      });
      return;
    }

    const conversationId = prompt(`Probar template "${templateKey}":

Ingresa el ID de conversación:
Ejemplo: 123, 456, etc.`);

    if (!conversationId || !conversationId.trim()) {
      return;
    }

    const template = templateExamples[templateKey];
    if (!template) return;

    try {
      setSending(true);
      setResult(null);

      const endpoint = `/v1/accounts/${
        selectedConfig.account_id
      }/conversations/${conversationId.trim()}/messages`;
      const apiUrl = getApiUrl(selectedConfig, endpoint);

      const testPayload = {
        content: template.example,
        message_type: "outgoing",
        private: false,
        content_type: "text",
        template_params: {
          name: template.name,
          category: template.category,
          language: template.language,
          processed_params: {
            body:
              templateKey === "order_confirmation"
                ? { 1: "TEST123" }
                : templateKey === "discount_coupon"
                ? { discount_percentage: "25" }
                : {},
            header:
              templateKey === "order_confirmation"
                ? {
                    media_url: "https://picsum.photos/200/300",
                    media_type: "image",
                  }
                : {
                    media_url: "",
                    media_type: "image",
                  },
            buttons:
              templateKey === "discount_coupon"
                ? [
                    {
                      type: "copy_code",
                      parameter: "TEST25",
                    },
                  ]
                : [],
          },
        },
      };

      console.log("Probando template:", {
        template: templateKey,
        url: apiUrl,
        payload: testPayload,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          api_access_token: selectedConfig.api_token,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(testPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `Template "${templateKey}" enviado exitosamente`,
          data: data,
        });
      } else {
        setResult({
          success: false,
          message: `Error probando template ${response.status}: ${
            data.message || response.statusText
          }`,
          data: data,
        });
      }
    } catch (error) {
      console.error("Error probando template:", error);
      setResult({
        success: false,
        message: `Error probando template: ${error.message}`,
        data: null,
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <span className="ml-2 text-gray-600">Cargando configuraciones...</span>
      </div>
    );
  }

  // Mostrar error si hay algún problema crítico
  if (error && configs.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900 dark:text-red-300 mb-1">
                Error al cargar el componente
              </h3>
              <p className="text-red-700 dark:text-red-400 text-sm mb-3">
                {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  cargarConfiguraciones();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
          <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Enviar Mensaje ChatWoot
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Envía mensajes usando la API oficial de ChatWoot v1
          </p>
        </div>
      </div>

      {/* Información sobre Edge Function */}
      <div className="mb-6 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-green-600 dark:text-green-400">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                ✅ Supabase Edge Function Activada
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                {forceRealSend
                  ? "Envío REAL vía Edge Function - Sin problemas de CORS"
                  : "Modo simulación - En producción usa Edge Function automáticamente"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-green-700 dark:text-green-300">
              Simular
            </span>
            <button
              type="button"
              onClick={() => setForceRealSend(!forceRealSend)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                forceRealSend ? "bg-green-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                  forceRealSend ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-green-700 dark:text-green-300">
              Envío Real
            </span>
          </div>
        </div>
        {forceRealSend && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              🚀 EDGE FUNCTION: Los mensajes se envían vía Supabase sin
              problemas de CORS. Funciona igual en desarrollo y producción.
            </p>
          </div>
        )}
      </div>

      {/* Información de la API */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              API ChatWoot - Create New Message
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              Este formulario utiliza el endpoint oficial:{" "}
              <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                POST
                /api/v1/accounts/[account_id]/conversations/[conversation_id]/messages
              </code>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Compatible con WhatsApp Template Messages pre-aprobados
              <br />
              Soporta mensaje tipo texto, tarjetas, formularios y más
              <br />
              Respuesta incluye ID del mensaje, estado y timestamps
            </p>
          </div>
        </div>
      </div>

      {/* Configuración Seleccionada */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Configuración ChatWoot
        </h3>

        {configs.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              No hay configuraciones ChatWoot activas.
            </p>
            <button
              onClick={() => window.open("/configuracion-chatwoot", "_blank")}
              className="mt-2 text-blue-600 hover:underline"
            >
              Crear configuración
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Configuración
                </label>
                <select
                  value={selectedConfig?.id || ""}
                  onChange={(e) => {
                    const config = configs.find(
                      (c) => c.id === parseInt(e.target.value)
                    );
                    setSelectedConfig(config);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  {configs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.alias}
                    </option>
                  ))}
                </select>
              </div>

              {selectedConfig && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL ChatWoot
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={selectedConfig.chatwoot_url}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                      />
                      <button
                        onClick={() =>
                          window.open(selectedConfig.chatwoot_url, "_blank")
                        }
                        className="p-2 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account ID
                    </label>
                    <input
                      type="text"
                      value={selectedConfig.account_id}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                    />
                  </div>
                </>
              )}
            </div>

            {selectedConfig && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={enviarMensajePrueba}
                  disabled={sending}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>
                    {sending ? "Enviando..." : "Enviar Mensaje de Prueba"}
                  </span>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Envia un mensaje de prueba para verificar la conectividad
                </p>
              </div>
            )}

            {selectedConfig && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Pruebas Rapidas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const id = prompt("ID de conversacion:");
                      if (id) {
                        setFormData((prev) => ({
                          ...prev,
                          conversation_id: id,
                          content: "Hola! Este es un mensaje de prueba simple.",
                          message_type: "outgoing",
                          content_type: "text",
                          use_template: false,
                        }));
                      }
                    }}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Texto Simple</span>
                  </button>

                  <button
                    onClick={() => probarTemplate("order_confirmation")}
                    disabled={sending}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Template Pedido</span>
                  </button>

                  <button
                    onClick={() => probarTemplate("discount_coupon")}
                    disabled={sending}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Template Cupon</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg ${
            result.success
              ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span className="font-medium">{result.message}</span>
          </div>

          {result.data && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm opacity-75">
                Ver respuesta completa
              </summary>
              <pre className="mt-2 text-xs bg-black/10 dark:bg-white/10 p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </motion.div>
      )}

      {/* Formulario Principal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Datos del Mensaje
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Conversation ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID de Conversación *
            </label>
            <input
              type="text"
              name="conversation_id"
              value={formData.conversation_id}
              onChange={handleInputChange}
              placeholder="ej: 123"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.conversation_id ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.conversation_id && (
              <p className="text-red-500 text-xs mt-1">
                {errors.conversation_id}
              </p>
            )}
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Mensaje
            </label>
            <select
              name="message_type"
              value={formData.message_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="outgoing">Saliente (outgoing)</option>
              <option value="incoming">Entrante (incoming)</option>
            </select>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Contenido
            </label>
            <select
              name="content_type"
              value={formData.content_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="text">Texto</option>
              <option value="input_email">Email Input</option>
              <option value="cards">Tarjetas</option>
              <option value="input_select">Select Input</option>
              <option value="form">Formulario</option>
              <option value="article">Artículo</option>
            </select>
          </div>

          {/* Campaign ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Campaign ID (opcional)
            </label>
            <input
              type="number"
              name="campaign_id"
              value={formData.campaign_id}
              onChange={handleInputChange}
              placeholder="ej: 1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Contenido del Mensaje */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contenido del Mensaje *
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            rows={4}
            placeholder="Escribe tu mensaje aquí..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
              errors.content ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.content && (
            <p className="text-red-500 text-xs mt-1">{errors.content}</p>
          )}
        </div>

        {/* Opciones */}
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="private"
              checked={formData.private}
              onChange={handleInputChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Mensaje privado (nota interna)
            </span>
          </label>
        </div>

        {/* Templates Predefinidos */}
        <div className="border-t pt-6 mb-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Templates Predefinidos de ChatWoot
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Selecciona un template oficial de la documentación de ChatWoot para
            WhatsApp
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Object.entries(templateExamples).map(([key, template]) => (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">
                    {template.name}
                  </h5>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      template.category === "MARKETING"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                    }`}
                  >
                    {template.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {template.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 italic mb-3">
                  "{template.example.substring(0, 50)}..."
                </p>

                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cargarTemplatePredefinido(key);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Cargar</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      probarTemplate(key);
                    }}
                    disabled={!selectedConfig || sending}
                    className="flex-1 flex items-center justify-center space-x-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Settings className="h-3 w-3" />
                    )}
                    <span>Probar</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* WhatsApp Template Section */}
        <div className="border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              name="use_template"
              checked={formData.use_template}
              onChange={handleInputChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Usar WhatsApp Template Message
            </label>
          </div>

          {formData.use_template && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre del Template *
                  </label>
                  <input
                    type="text"
                    name="template_params.name"
                    value={formData.template_params.name}
                    onChange={handleInputChange}
                    placeholder="ej: order_confirmation"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                      errors.template_name
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.template_name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.template_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    name="template_params.category"
                    value={formData.template_params.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="UTILITY">UTILITY</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Idioma
                  </label>
                  <select
                    name="template_params.language"
                    value={formData.template_params.language}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="es">Español (es)</option>
                    <option value="en">English (en)</option>
                    <option value="en_US">English US (en_US)</option>
                  </select>
                </div>
              </div>

              {/* Header Media */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Header Media URL (opcional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="url"
                    name="template_params.processed_params.header.media_url"
                    value={
                      formData.template_params.processed_params.header.media_url
                    }
                    onChange={handleInputChange}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <select
                    name="template_params.processed_params.header.media_type"
                    value={
                      formData.template_params.processed_params.header
                        .media_type
                    }
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="text">Texto</option>
                    <option value="image">Imagen</option>
                    <option value="document">Documento</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>

              {/* Body Parameters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Parametros del Body
                  </label>
                  <button
                    type="button"
                    onClick={agregarParametroBody}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Agregar Parametro
                  </button>
                </div>

                {Object.keys(formData.template_params.processed_params.body)
                  .length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border">
                    {Object.entries(
                      formData.template_params.processed_params.body
                    ).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center space-x-2 mb-1"
                      >
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {key}:
                        </span>
                        <span className="text-sm text-gray-800 dark:text-gray-200">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Botones
                  </label>
                  <button
                    type="button"
                    onClick={agregarBoton}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Agregar Boton
                  </button>
                </div>

                {formData.template_params.processed_params.buttons.length >
                  0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded border">
                    {formData.template_params.processed_params.buttons.map(
                      (button, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 mb-1"
                        >
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {button.type}:
                          </span>
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {button.parameter}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            onClick={limpiarFormulario}
            disabled={sending}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="h-4 w-4" />
            <span>Limpiar</span>
          </button>

          <button
            onClick={enviarMensaje}
            disabled={sending || !selectedConfig}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{sending ? "Enviando..." : "Enviar Mensaje"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnviarMensajeChatWoot;
