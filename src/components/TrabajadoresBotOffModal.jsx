import React, { useState, useEffect } from "react";
import {
  X,
  Bot,
  BotOff,
  Loader2,
  RefreshCw,
  User,
  Phone,
  Building2,
  MessageCircle,
  ExternalLink,
  MessageSquare,
  PanelRightOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { chatwootService } from "../services/chatwootService";
import {
  buildChatwootApiUrl,
  getChatwootApiHeaders,
  buildChatwootWebUrl,
  getChatwootWebUrl,
} from "../utils/chatwootConfig";
import ChatwootConversation from "./ChatwootConversation.jsx";

const TrabajadoresBotOffModal = ({ onClose }) => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContactForChat, setSelectedContactForChat] = useState(null);
  const [showChatwootModal, setShowChatwootModal] = useState(false);
  const [selectedWorkerForChat, setSelectedWorkerForChat] = useState(null);

  // Función para construir URL del contacto en Chatwoot
  const buildChatwootContactUrl = (accountId, contactId) => {
    const baseUrl = getChatwootWebUrl();
    return `${baseUrl}/app/accounts/${accountId}/contacts/${contactId}`;
  };

  const fetchTrabajadoresConBotOff = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Buscando trabajadores con bot en Off...");

      // 1. Obtener TODAS las configuraciones de Chatwoot
      const { data: configsData, error: configError } = await supabase
        .from("chatwoot_config")
        .select("*")
        .eq("activo", true);

      if (configError) {
        console.error("❌ Error consultando chatwoot_config:", configError);
        throw new Error(
          `Error al consultar configuraciones: ${configError.message}`
        );
      }

      if (!configsData || configsData.length === 0) {
        throw new Error(
          "No se encontró ninguna configuración activa de Chatwoot"
        );
      }

      console.log(
        "✅ Configuraciones Chatwoot encontradas:",
        configsData.length
      );

      // 2. Para cada configuración, obtener sus CONTACTOS
      let allContacts = [];

      for (const config of configsData) {
        try {
          console.log(`📡 Consultando CONTACTOS de: ${config.nombre}`);

          // Obtener contactos con paginación (hasta 5 páginas)
          let configContacts = [];
          const maxPages = 5;

          for (let page = 1; page <= maxPages; page++) {
            // Endpoint de CONTACTOS según documentación Chatwoot
            // GET /api/v1/accounts/{account_id}/contacts
            const endpoint = `/api/v1/accounts/${config.account_id}/contacts?page=${page}`;

            // Usar Edge Function en lugar de fetch directo
            const result = await chatwootService.getChatwootData({
              configId: config.id,
              endpoint: endpoint
            });

            if (!result.success) {
              console.warn(
                `⚠️ Error en ${config.nombre} página ${page}: ${result.message}`
              );
              break;
            }

            const contactsData = result.data;

            // Logging solo en primera página
            if (page === 1) {
              console.log(`📦 Respuesta API CONTACTOS (página ${page}):`, {
                keys: Object.keys(contactsData),
                hasData: !!contactsData.data,
                hasPayload: !!contactsData.payload,
                isArray: Array.isArray(contactsData),
              });
            }

            // La API de contactos puede devolver directamente un array o en .payload
            const contacts = Array.isArray(contactsData)
              ? contactsData
              : contactsData.payload || contactsData.data?.payload || [];

            console.log(`   📄 Página ${page}: ${contacts.length} contactos`);

            if (contacts.length === 0) {
              // No hay más contactos, salir del loop
              break;
            }

            configContacts = configContacts.concat(contacts);
          }

          console.log(
            `👥 ${config.nombre}: ${configContacts.length} contactos totales`
          );
          allContacts = allContacts.concat(configContacts);
        } catch (err) {
          console.error(`❌ Error consultando ${config.nombre}:`, err);
        }
      }

      console.log(
        "👥 Total contactos obtenidos de todos los Chatwoot:",
        allContacts.length
      );

      // 📊 TABLA: Mostrar TODOS los contactos en formato tabla (solo en consola)
      if (allContacts.length > 0) {
        console.log("\n📊 TABLA DE TODOS LOS CONTACTOS:");
        console.log("=".repeat(120));

        const tableData = allContacts.slice(0, 50).map((contact) => ({
          // Mostrar primeros 50
          ID: contact.id,
          Name: contact.name || "N/A",
          Phone: contact.phone_number || "N/A",
          Email: contact.email || "N/A",
          Identifier: contact.identifier || "N/A",
          Bot: contact.custom_attributes?.bot || "N/A",
          HasCustomAttr: !!contact.custom_attributes,
        }));

        console.table(tableData);
        console.log("=".repeat(120));

        // Mostrar estructura JSON del primer contacto
        console.log("\n📋 JSON COMPLETO DEL PRIMER CONTACTO:");
        console.log(JSON.stringify(allContacts[0], null, 2));
        console.log("=".repeat(120));
      }

      // 3. Filtrar contactos con bot en "Off"
      const contactsWithBotOff = allContacts.filter((contact) => {
        const botStatus = contact.custom_attributes?.bot;
        const hasBot = botStatus === "Off";

        if (hasBot) {
          console.log("🤖 Bot Off encontrado:", {
            contactId: contact.id,
            phone: contact.phone_number,
            name: contact.name,
            botStatus,
          });
        }

        return hasBot;
      });

      console.log("🤖 Contactos con bot Off:", contactsWithBotOff.length);

      // 3.1 Para cada contacto con bot Off, obtener sus conversaciones
      const contactsWithConversations = [];
      for (const contact of contactsWithBotOff) {
        try {
          // Buscar la configuración que corresponde a este contacto
          const contactConfig =
            configsData.find((config) =>
              allContacts.some(
                (c) => c.id === contact.id && c.account_id === config.account_id
              )
            ) || configsData[0]; // Fallback al primer config

          if (!contactConfig) {
            console.warn(
              "⚠️ No se encontró configuración para contacto:",
              contact.id
            );
            continue;
          }

          // Obtener conversaciones del contacto usando Edge Function
          const endpoint = `/api/v1/accounts/${contactConfig.account_id}/contacts/${contact.id}/conversations`;

          console.log("📞 Consultando conversaciones para contacto:", {
            contactId: contact.id,
            contactName: contact.name,
            endpoint: endpoint,
          });

          const conversationsResult = await chatwootService.getChatwootData({
            configId: contactConfig.id,
            endpoint: endpoint
          });

          let conversations = [];
          if (conversationsResult.success) {
            const conversationsData = conversationsResult.data;
            conversations = Array.isArray(conversationsData)
              ? conversationsData
              : conversationsData.payload || conversationsData.data || [];

            console.log("💬 Conversaciones encontradas:", {
              contactId: contact.id,
              conversationsCount: conversations.length,
              conversations: conversations.map((c) => ({
                id: c.id,
                status: c.status,
              })),
            });
          } else {
            console.warn("⚠️ Error obteniendo conversaciones:", {
              contactId: contact.id,
              error: conversationsResult.message
            });
          }

          // Agregar información de conversaciones al contacto
          contactsWithConversations.push({
            ...contact,
            conversations: conversations,
            accountId: contactConfig.account_id,
            // Usar la conversación más reciente o la primera disponible
            activeConversationId:
              conversations.length > 0 ? conversations[0].id : null,
          });
        } catch (error) {
          console.error("❌ Error obteniendo conversaciones para contacto:", {
            contactId: contact.id,
            error: error.message,
          });

          // Agregar contacto sin conversaciones para que no se pierda
          contactsWithConversations.push({
            ...contact,
            conversations: [],
            activeConversationId: null,
          });
        }
      }

      console.log(
        "🤖 Contactos con conversaciones procesados:",
        contactsWithConversations.length
      );

      // 4. Extraer todos los teléfonos únicos de los contactos con bot Off
      const phoneMap = new Map(); // Map: cleanPhone -> contact
      contactsWithConversations.forEach((contact) => {
        const phoneNumber =
          contact.phone_number || contact.identifier || contact.name;

        if (phoneNumber) {
          // Limpiar teléfono: remover +, espacios, guiones, paréntesis
          const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, "");
          console.log(
            `📞 Limpieza de teléfono: "${phoneNumber}" → "${cleanPhone}"`
          );
          if (!phoneMap.has(cleanPhone)) {
            phoneMap.set(cleanPhone, contact);
          }
        }
      });

      const uniquePhones = Array.from(phoneMap.keys());
      console.log("📞 Teléfonos únicos a buscar:", uniquePhones.length);
      console.log("📞 Lista de teléfonos limpios:", uniquePhones);

      // 5. Buscar TODOS los trabajadores en la tabla sucursal_personal
      let trabajadoresData = [];
      if (uniquePhones.length > 0) {
        console.log(
          "🔍 Buscando en tabla sucursal_personal con teléfonos:",
          uniquePhones
        );

        console.log("🔎 Ejecutando consulta SQL:", {
          tabla: "sucursal_personal",
          campo_busqueda: "telefono_origen",
          telefonos_buscar: uniquePhones,
        });

        const { data, error: trabajadorError } = await supabase
          .from("sucursal_personal")
          .select(
            `
            id,
            nombre,
            telefono_origen,
            empresa,
            es_responsable,
            estado,
            sucursales:sucursal_id!inner(
              id,
              nombre,
              telefono,
              estado
            )
          `
          )
          .in("telefono_origen", uniquePhones);

        if (trabajadorError) {
          console.error("❌ Error consultando trabajadores:", trabajadorError);
          console.error(
            "❌ Detalles del error:",
            JSON.stringify(trabajadorError, null, 2)
          );
        }

        trabajadoresData = data || [];
        console.log(
          "✅ Trabajadores encontrados en DB:",
          trabajadoresData.length
        );
        console.log(
          "📋 Datos JSON completos:",
          JSON.stringify(trabajadoresData, null, 2)
        );

        // Debug específico para estructura de sucursal
        trabajadoresData.forEach((t, index) => {
          console.log(`🏢 Trabajador ${index + 1} [${t.nombre}]:`, {
            nombre: t.nombre,
            telefono: t.telefono_origen,
            empresa: t.empresa,
            sucursales_completa: t.sucursales,
            sucursales_raw: t.sucursales,
            tiene_sucursal: !!t.sucursales,
            sucursal_estructura: t.sucursales
              ? Object.keys(t.sucursales)
              : "No hay sucursal",
          });
        });
      }

      // 6. Crear mapa de trabajadores por teléfono
      const trabajadorMap = new Map();
      trabajadoresData.forEach((t) => {
        trabajadorMap.set(t.telefono_origen, t);
      });

      // 7. Crear lista final combinando contactos con trabajadores
      const trabajadoresConBotOff = uniquePhones.map((phone) => {
        const contact = phoneMap.get(phone);
        const trabajador = trabajadorMap.get(phone);

        // Construir nombre completo del trabajador
        let nombreCompleto = "";
        if (trabajador) {
          // En sucursal_personal solo existe el campo 'nombre'
          nombreCompleto = trabajador.nombre;
        }

        if (trabajador) {
          // Trabajador encontrado en DB
          console.log(`🔍 Trabajador encontrado para ${phone}:`, {
            nombre: trabajador.nombre,
            sucursal_original: trabajador.sucursales,
            tiene_sucursal: !!trabajador.sucursales,
          });

          const finalTrabajador = {
            ...trabajador,
            nombreCompleto: nombreCompleto || trabajador.nombre,
            // telefono_origen ya existe en sucursal_personal, no necesita mapeo
            botStatus: "Off",
            hasContact: true,
            contactId: contact.id,
            chatwootContactName: contact.name,
            chatwootEmail: contact.email,
            // Usar el accountId del contacto procesado
            chatwootAccountId: contact.accountId || configsData[0]?.account_id,
            // Agregar información de conversaciones
            conversations: contact.conversations || [],
            activeConversationId: contact.activeConversationId,
            // Agregar el chatwootConfigId de la configuración correspondiente
            chatwootConfigId:
              configsData.find(
                (config) =>
                  config.account_id ===
                  (contact.accountId || configsData[0]?.account_id)
              )?.id || configsData[0]?.id,
            // Usar la estructura de sucursal de sucursal_personal
            sucursal: trabajador.sucursales,
          };

          console.log(`🎯 OBJETO FINAL para ${nombreCompleto}:`, {
            telefono: finalTrabajador.telefono_origen,
            sucursal_asignada: finalTrabajador.sucursal,
            sucursal_tipo: typeof finalTrabajador.sucursal,
            sucursal_keys: finalTrabajador.sucursal
              ? Object.keys(finalTrabajador.sucursal)
              : "null",
          });

          return finalTrabajador;
        } else {
          // Trabajador no encontrado, crear registro temporal
          return {
            id: null,
            nombre: contact.name || `Desconocido`,
            nombreCompleto: contact.name || `Desconocido (${phone})`,
            telefono_origen: phone,
            sucursal: null,
            botStatus: "Off",
            hasContact: true,
            contactId: contact.id,
            chatwootContactName: contact.name,
            chatwootEmail: contact.email,
            chatwootAccountId: contact.accountId || configsData[0]?.account_id,
            // Agregar información de conversaciones
            conversations: contact.conversations || [],
            activeConversationId: contact.activeConversationId,
            // Agregar el chatwootConfigId de la configuración correspondiente
            chatwootConfigId:
              configsData.find(
                (config) =>
                  config.account_id ===
                  (contact.accountId || configsData[0]?.account_id)
              )?.id || configsData[0]?.id,
          };
        }
      });

      // Filtrar nulls y duplicados por teléfono
      const trabajadoresUnicos = trabajadoresConBotOff
        .filter((t) => t !== null)
        .reduce((acc, trabajador) => {
          if (
            !acc.find((t) => t.telefono_origen === trabajador.telefono_origen)
          ) {
            acc.push(trabajador);
          }
          return acc;
        }, []);

      console.log(
        "✅ Trabajadores únicos con bot Off:",
        trabajadoresUnicos.length
      );
      setTrabajadores(trabajadoresUnicos);
    } catch (err) {
      console.error("❌ Error cargando trabajadores:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrabajadoresConBotOff();
  };

  useEffect(() => {
    fetchTrabajadoresConBotOff();
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800/50 rounded-lg">
                <BotOff className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Trabajadores con Bot Desactivado
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bots de Chatwoot en estado "Off"
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
                title="Actualizar lista"
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="p-6 overflow-y-auto"
            style={{ maxHeight: "calc(90vh - 140px)" }}
          >
            {loading && !refreshing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Consultando estado de bots en Chatwoot...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Esto puede tomar unos momentos
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md">
                  <p className="text-red-700 dark:text-red-300 text-center">
                    {error}
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : trabajadores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Bot className="w-16 h-16 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  ¡Todos los bots están activos!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  No hay trabajadores con bot desactivado
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total:{" "}
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {trabajadores.length}
                    </span>{" "}
                    trabajador(es) con bot desactivado
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trabajadores.map((trabajador, index) => {
                    // Debug: Ver datos de sucursal para cada trabajador en renderizado
                    console.log(`🎨 Renderizando trabajador ${index + 1}:`, {
                      nombre: trabajador.nombreCompleto,
                      sucursal: trabajador.sucursal,
                      sucursal_existe: !!trabajador.sucursal,
                      sucursal_keys: trabajador.sucursal
                        ? Object.keys(trabajador.sucursal)
                        : "No hay sucursal",
                    });

                    return (
                      <motion.div
                        key={trabajador.id || `temp-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-700 rounded-lg border-2 border-orange-200 dark:border-orange-800 p-4 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full flex-shrink-0">
                              <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3
                                className="font-semibold text-gray-900 dark:text-white truncate"
                                title={trabajador.nombreCompleto}
                              >
                                {trabajador.nombreCompleto}
                              </h3>
                              {trabajador.cargo && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {trabajador.cargo}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full flex-shrink-0">
                            <BotOff className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                              Off
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Sucursal y Empresa */}
                          {console.log(
                            `🎨 RENDERIZANDO ${trabajador.nombreCompleto}:`,
                            {
                              tiene_sucursal: !!trabajador.sucursal,
                              sucursal_data: trabajador.sucursal,
                            }
                          ) || null}
                          {trabajador.sucursal && (
                            <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-300">
                              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate font-medium"
                                  title={trabajador.sucursal.nombre}
                                >
                                  {trabajador.sucursal.nombre}
                                </p>
                                {trabajador.sucursal.telefono && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    Tel: {trabajador.sucursal.telefono}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Teléfono */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-mono">
                              {trabajador.telefono_origen || "Sin teléfono"}
                            </span>
                          </div>

                          {/* Email */}
                          {trabajador.email && (
                            <div
                              className="text-xs text-gray-500 dark:text-gray-400 truncate"
                              title={trabajador.email}
                            >
                              📧 {trabajador.email}
                            </div>
                          )}

                          {/* Botones de Chatwoot */}
                          {trabajador.contactId &&
                            trabajador.chatwootAccountId && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                                  {/* Botón Ver Chat - Solo visible si tiene conversación activa */}
                                  {trabajador.activeConversationId && (
                                    <button
                                      onClick={() => {
                                        setSelectedWorkerForChat(trabajador);
                                        setShowChatwootModal(true);
                                      }}
                                      className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors font-medium"
                                      title="Ver conversación de Chatwoot embebida"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                      <span>Ver Chat</span>
                                    </button>
                                  )}
                                  {/* Botón Ir al Chat - Siempre visible */}
                                  <button
                                    onClick={() => {
                                      const chatwootUrl =
                                        trabajador.activeConversationId
                                          ? buildChatwootWebUrl(
                                              trabajador.chatwootAccountId,
                                              trabajador.activeConversationId
                                            )
                                          : buildChatwootContactUrl(
                                              trabajador.chatwootAccountId,
                                              trabajador.contactId
                                            );
                                      window.open(chatwootUrl, "_blank");
                                    }}
                                    className="flex items-center justify-center gap-2 flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors font-medium"
                                    title={
                                      trabajador.activeConversationId
                                        ? "Abrir conversación en Chatwoot (nueva pestaña)"
                                        : "Abrir contacto en Chatwoot (nueva pestaña)"
                                    }
                                  >
                                    <PanelRightOpen className="h-4 w-4" />
                                    <span>Ir al Chat</span>
                                  </button>
                                </div>
                              </div>
                            )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Última actualización: {new Date().toLocaleTimeString("es-ES")}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de Conversación de Chatwoot */}
      <AnimatePresence>
        {showChatwootModal &&
          selectedWorkerForChat?.activeConversationId &&
          selectedWorkerForChat?.chatwootConfigId && (
            <ChatwootConversation
              conversationId={selectedWorkerForChat.activeConversationId}
              chatwootConfigId={selectedWorkerForChat.chatwootConfigId}
              onClose={() => {
                setShowChatwootModal(false);
                setSelectedWorkerForChat(null);
              }}
            />
          )}
      </AnimatePresence>
    </>
  );
};

export default TrabajadoresBotOffModal;
