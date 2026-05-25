import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import yCloudService from "../services/yCloudService.js";
import { apiGet } from "../services/backendApi.js";
import {
  Send,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Image,
  FileText,
  Video,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

const EnviarMensajeYCloud = () => {
  const [configs, setConfigs] = useState([]);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [messageType, setMessageType] = useState("text");

  const [formData, setFormData] = useState({
    // Datos comunes
    to: "",
    from: "",

    // Mensaje de texto
    text: "",
    previewUrl: false,

    // Template
    templateName: "",
    templateLanguage: "es",
    templateComponents: [],

    // Imagen
    imageUrl: "",
    imageCaption: "",

    // Documento
    documentUrl: "",
    documentFilename: "",
    documentCaption: "",

    // Video
    videoUrl: "",
    videoCaption: "",

    // Ubicacion
    latitude: "",
    longitude: "",
    locationName: "",
    locationAddress: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    cargarConfiguraciones();
  }, []);

  const cargarConfiguraciones = async () => {
    try {
      setLoading(true);
      console.log("Cargando configuraciones YCloud...");

      const response = await apiGet("/ycloud/configs/active");
      const data = response.data || [];
      console.log("Datos recibidos:", data);
      setConfigs(data);

      if (data && data.length > 0) {
        setSelectedConfig(data[0]);
        console.log("Configuraciones YCloud cargadas exitosamente");
      } else {
        console.log("No se encontraron configuraciones activas");
        setError("No se encontraron configuraciones de YCloud activas");
      }
    } catch (error) {
      console.error("Error critico en cargarConfiguraciones:", error);
      setError(`Error critico: ${error.message}`);
      setConfigs([]);
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

    if (!selectedConfig) {
      newErrors.config = "Selecciona una configuracion YCloud";
    }

    if (!formData.to?.trim()) {
      newErrors.to = "Numero de destino es requerido";
    } else if (!formData.to.startsWith("+")) {
      newErrors.to = "El numero debe incluir codigo de pais (ej: +521234567890)";
    }

    switch (messageType) {
      case "text":
        if (!formData.text?.trim()) {
          newErrors.text = "El texto del mensaje es requerido";
        }
        break;
      case "template":
        if (!formData.templateName?.trim()) {
          newErrors.templateName = "El nombre del template es requerido";
        }
        break;
      case "image":
        if (!formData.imageUrl?.trim()) {
          newErrors.imageUrl = "La URL de la imagen es requerida";
        }
        break;
      case "document":
        if (!formData.documentUrl?.trim()) {
          newErrors.documentUrl = "La URL del documento es requerida";
        }
        break;
      case "video":
        if (!formData.videoUrl?.trim()) {
          newErrors.videoUrl = "La URL del video es requerida";
        }
        break;
      case "location":
        if (!formData.latitude?.trim() || !formData.longitude?.trim()) {
          newErrors.location = "Latitud y longitud son requeridas";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const enviarMensaje = async () => {
    if (!validarFormulario()) return;

    try {
      setSending(true);
      setResult(null);

      let response;

      const baseData = {
        configId: selectedConfig.id,
        to: formData.to.trim(),
        from: formData.from?.trim() || undefined,
      };

      switch (messageType) {
        case "text":
          response = await yCloudService.sendTextMessage({
            ...baseData,
            text: formData.text,
            previewUrl: formData.previewUrl,
          });
          break;

        case "template":
          response = await yCloudService.sendTemplateMessage({
            ...baseData,
            template: {
              name: formData.templateName,
              language: formData.templateLanguage,
              components: formData.templateComponents,
            },
          });
          break;

        case "image":
          response = await yCloudService.sendImageMessage({
            ...baseData,
            imageUrl: formData.imageUrl,
            caption: formData.imageCaption || undefined,
          });
          break;

        case "document":
          response = await yCloudService.sendDocumentMessage({
            ...baseData,
            documentUrl: formData.documentUrl,
            filename: formData.documentFilename || undefined,
            caption: formData.documentCaption || undefined,
          });
          break;

        case "video":
          response = await yCloudService.sendMessage({
            ...baseData,
            type: "video",
            video: {
              link: formData.videoUrl,
              caption: formData.videoCaption || undefined,
            },
          });
          break;

        case "location":
          response = await yCloudService.sendMessage({
            ...baseData,
            type: "location",
            location: {
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude),
              name: formData.locationName || undefined,
              address: formData.locationAddress || undefined,
            },
          });
          break;

        default:
          throw new Error(`Tipo de mensaje no soportado: ${messageType}`);
      }

      if (response.success) {
        setResult({
          success: true,
          message: "Mensaje enviado exitosamente via YCloud",
          data: response.data,
        });

        // Limpiar formulario
        setFormData((prev) => ({
          ...prev,
          to: "",
          text: "",
          imageUrl: "",
          imageCaption: "",
          documentUrl: "",
          documentFilename: "",
          documentCaption: "",
          videoUrl: "",
          videoCaption: "",
          latitude: "",
          longitude: "",
          locationName: "",
          locationAddress: "",
        }));
      } else {
        setResult({
          success: false,
          message: response.message || "Error desconocido al enviar mensaje",
          data: response.error,
        });
      }
    } catch (error) {
      console.error("Error en enviarMensaje:", error);
      setResult({
        success: false,
        message: `Error enviando mensaje: ${error.message}`,
        data: error,
      });
    } finally {
      setSending(false);
    }
  };

  const agregarComponenteTemplate = () => {
    const tipoComponente = prompt(
      `Selecciona el tipo de componente:
1. header - Encabezado (texto, imagen, video, documento)
2. body - Cuerpo del mensaje (parametros)
3. button - Botones

Escribe: header, body, o button`
    );

    if (!tipoComponente || !["header", "body", "button"].includes(tipoComponente.trim())) {
      alert("Tipo de componente invalido");
      return;
    }

    let component = { type: tipoComponente.trim() };

    switch (tipoComponente.trim()) {
      case "header":
        const headerType = prompt("Tipo de header (text, image, video, document):");
        if (headerType === "text") {
          const text = prompt("Texto del header:");
          component.parameters = [{ type: "text", text }];
        } else if (["image", "video", "document"].includes(headerType)) {
          const link = prompt(`URL del ${headerType}:`);
          component.parameters = [{ type: headerType, [headerType]: { link } }];
        }
        break;

      case "body":
        const numParams = parseInt(prompt("Cuantos parametros tiene el body?") || "0");
        component.parameters = [];
        for (let i = 0; i < numParams; i++) {
          const paramValue = prompt(`Valor del parametro ${i + 1}:`);
          component.parameters.push({ type: "text", text: paramValue });
        }
        break;

      case "button":
        const buttonType = prompt("Tipo de boton (quick_reply, url, copy_code):");
        const subType = prompt("Sub-tipo del boton:");
        const index = prompt("Indice del boton (0, 1, 2...):");
        component.sub_type = subType;
        component.index = parseInt(index);
        if (buttonType === "copy_code") {
          const code = prompt("Codigo a copiar:");
          component.parameters = [{ type: "coupon_code", coupon_code: code }];
        } else if (buttonType === "url") {
          const urlSuffix = prompt("Sufijo de URL:");
          component.parameters = [{ type: "text", text: urlSuffix }];
        }
        break;
    }

    setFormData((prev) => ({
      ...prev,
      templateComponents: [...prev.templateComponents, component],
    }));
  };

  const eliminarComponenteTemplate = (index) => {
    setFormData((prev) => ({
      ...prev,
      templateComponents: prev.templateComponents.filter((_, i) => i !== index),
    }));
  };

  const limpiarFormulario = () => {
    setFormData({
      to: "",
      from: "",
      text: "",
      previewUrl: false,
      templateName: "",
      templateLanguage: "es",
      templateComponents: [],
      imageUrl: "",
      imageCaption: "",
      documentUrl: "",
      documentFilename: "",
      documentCaption: "",
      videoUrl: "",
      videoCaption: "",
      latitude: "",
      longitude: "",
      locationName: "",
      locationAddress: "",
    });
    setErrors({});
    setResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <span className="ml-2 text-gray-600">Cargando configuraciones...</span>
      </div>
    );
  }

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
            Enviar Mensaje YCloud
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Envia mensajes de WhatsApp usando la API de YCloud
          </p>
        </div>
      </div>

      {/* Informacion de la API */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              YCloud WhatsApp API - Send Message Directly
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
              Endpoint:{" "}
              <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">
                POST https://api.ycloud.com/v2/whatsapp/messages/sendDirectly
              </code>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Soporta: texto, templates, imagenes, documentos, videos, ubicacion
              y mensajes interactivos
            </p>
          </div>
        </div>
      </div>

      {/* Configuracion Seleccionada */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Configuracion YCloud
        </h3>

        {configs.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">
              No hay configuraciones YCloud activas.
            </p>
            <button
              onClick={() => window.open("/configuracion-ycloud", "_blank")}
              className="mt-2 text-blue-600 hover:underline"
            >
              Crear configuracion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Configuracion
              </label>
              <select
                value={selectedConfig?.id || ""}
                onChange={(e) => {
                  const config = configs.find((c) => String(c.id) === String(e.target.value));
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
                    Numero Remitente
                  </label>
                  <input
                    type="text"
                    value={selectedConfig.default_from_number || "No definido"}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <div className="flex items-center space-x-2 px-3 py-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      Activo
                    </span>
                  </div>
                </div>
              </>
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

        {/* Tipo de Mensaje */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de Mensaje
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "text", label: "Texto", icon: MessageSquare },
              { id: "template", label: "Template", icon: FileText },
              { id: "image", label: "Imagen", icon: Image },
              { id: "document", label: "Documento", icon: FileText },
              { id: "video", label: "Video", icon: Video },
              { id: "location", label: "Ubicacion", icon: MapPin },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMessageType(id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  messageType === id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Numero de destino */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numero de Destino *
            </label>
            <input
              type="text"
              name="to"
              value={formData.to}
              onChange={handleInputChange}
              placeholder="+521234567890"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.to ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.to && (
              <p className="text-red-500 text-xs mt-1">{errors.to}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numero Remitente (opcional)
            </label>
            <input
              type="text"
              name="from"
              value={formData.from}
              onChange={handleInputChange}
              placeholder={`Usa default: ${
                selectedConfig?.default_from_number || ""
              }`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Campos segun tipo de mensaje */}
        {messageType === "text" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mensaje *
              </label>
              <textarea
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                rows={4}
                placeholder="Escribe tu mensaje aqui..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.text ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.text && (
                <p className="text-red-500 text-xs mt-1">{errors.text}</p>
              )}
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="previewUrl"
                checked={formData.previewUrl}
                onChange={handleInputChange}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Mostrar vista previa de URLs
              </span>
            </label>
          </div>
        )}

        {messageType === "template" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Template *
                </label>
                <input
                  type="text"
                  name="templateName"
                  value={formData.templateName}
                  onChange={handleInputChange}
                  placeholder="ej: order_confirmation"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                    errors.templateName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.templateName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.templateName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Idioma
                </label>
                <select
                  name="templateLanguage"
                  value={formData.templateLanguage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="es">Espanol (es)</option>
                  <option value="es_MX">Espanol Mexico (es_MX)</option>
                  <option value="en">English (en)</option>
                  <option value="en_US">English US (en_US)</option>
                  <option value="pt_BR">Portugues Brasil (pt_BR)</option>
                </select>
              </div>
            </div>

            {/* Componentes del Template */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Componentes del Template
                </label>
                <button
                  type="button"
                  onClick={agregarComponenteTemplate}
                  className="flex items-center space-x-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus className="h-3 w-3" />
                  <span>Agregar</span>
                </button>
              </div>

              {formData.templateComponents.length > 0 && (
                <div className="space-y-2">
                  {formData.templateComponents.map((comp, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded border"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{comp.type}</span>
                        {comp.parameters && (
                          <span className="text-gray-500 ml-2">
                            ({comp.parameters.length} params)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarComponenteTemplate(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {messageType === "image" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL de la Imagen *
              </label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/imagen.jpg"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.imageUrl ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.imageUrl && (
                <p className="text-red-500 text-xs mt-1">{errors.imageUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripcion (opcional)
              </label>
              <input
                type="text"
                name="imageCaption"
                value={formData.imageCaption}
                onChange={handleInputChange}
                placeholder="Descripcion de la imagen"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {messageType === "document" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL del Documento *
              </label>
              <input
                type="url"
                name="documentUrl"
                value={formData.documentUrl}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/documento.pdf"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.documentUrl ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.documentUrl && (
                <p className="text-red-500 text-xs mt-1">{errors.documentUrl}</p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del archivo (opcional)
                </label>
                <input
                  type="text"
                  name="documentFilename"
                  value={formData.documentFilename}
                  onChange={handleInputChange}
                  placeholder="documento.pdf"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripcion (opcional)
                </label>
                <input
                  type="text"
                  name="documentCaption"
                  value={formData.documentCaption}
                  onChange={handleInputChange}
                  placeholder="Descripcion del documento"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {messageType === "video" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL del Video *
              </label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/video.mp4"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.videoUrl ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.videoUrl && (
                <p className="text-red-500 text-xs mt-1">{errors.videoUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripcion (opcional)
              </label>
              <input
                type="text"
                name="videoCaption"
                value={formData.videoCaption}
                onChange={handleInputChange}
                placeholder="Descripcion del video"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {messageType === "location" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Latitud *
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="ej: 19.4326"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                    errors.location ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longitud *
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="ej: -99.1332"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                    errors.location ? "border-red-500" : "border-gray-300"
                  }`}
                />
              </div>
            </div>
            {errors.location && (
              <p className="text-red-500 text-xs">{errors.location}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del lugar (opcional)
                </label>
                <input
                  type="text"
                  name="locationName"
                  value={formData.locationName}
                  onChange={handleInputChange}
                  placeholder="ej: Oficina Central"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Direccion (opcional)
                </label>
                <input
                  type="text"
                  name="locationAddress"
                  value={formData.locationAddress}
                  onChange={handleInputChange}
                  placeholder="ej: Av. Principal #123"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Botones de Accion */}
        <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
          <button
            onClick={limpiarFormulario}
            disabled={sending}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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

export default EnviarMensajeYCloud;
