import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Phone,
  MessageCircle,
  Search,
  User,
  Mail,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { chatwootService } from "../services/chatwootService";
import {
  buildChatwootApiUrl,
  getChatwootApiHeaders,
} from "../utils/chatwootConfig";
import ChatwootConversation from "./ChatwootConversation";

const ContactosModal = ({ onClose }) => {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showChatwootModal, setShowChatwootModal] = useState(false);
  const [selectedContactForChat, setSelectedContactForChat] = useState(null);

  useEffect(() => {
    fetchAllContactos();
  }, []);

  const fetchAllContactos = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("🔍 Obteniendo configuraciones de Chatwoot...");

      // 1. Obtener configuraciones de Chatwoot activas
      const { data: configsData, error: configsError } = await supabase
        .from("chatwoot_config")
        .select("*")
        .eq("activo", true);

      if (configsError) {
        console.error("❌ Error obteniendo configuraciones:", configsError);
        console.error("❌ Código de error:", configsError.code);
        console.error("❌ Mensaje:", configsError.message);
        console.error("❌ Detalles:", configsError.details);
        setError(`Error al obtener configuraciones de Chatwoot: ${configsError.message}. Verifica que las políticas RLS estén correctamente configuradas.`);
        setLoading(false);
        return;
      }

      console.log(`✅ Configuraciones encontradas: ${configsData?.length || 0}`);
      console.log("📋 Datos de configuraciones:", configsData);

      if (!configsData || configsData.length === 0) {
        setError("No hay configuraciones de Chatwoot activas. Ve a Configuración → ChatWoot para crear una.");
        setLoading(false);
        return;
      }

      // 2. Obtener contactos de todas las configuraciones (SIN FILTRAR POR BOT)
      const allContactsFromChatwoot = [];

      for (const config of configsData) {
        console.log(
          `📞 Obteniendo contactos para account ${config.account_id}...`
        );

        try {
          // Obtener contactos con paginación (hasta 10 páginas para obtener todos)
          let configContacts = [];
          const maxPages = 10;

          for (let page = 1; page <= maxPages; page++) {
            const endpoint = `/api/v1/accounts/${config.account_id}/contacts?page=${page}`;

            // Usar Edge Function en lugar de fetch directo
            const result = await chatwootService.getChatwootData({
              configId: config.id,
              endpoint: endpoint
            });

            if (!result.success) {
              console.warn(
                `⚠️ Error obteniendo contactos para ${config.account_id} página ${page}:`,
                result.message
              );
              break;
            }

            const contactsResult = result.data;

            // La API de contactos puede devolver directamente un array o en .payload
            const contacts = Array.isArray(contactsResult)
              ? contactsResult
              : contactsResult.payload || contactsResult.data?.payload || [];

            console.log(`   📄 Página ${page}: ${contacts.length} contactos`);

            if (contacts.length === 0) {
              // No hay más contactos, salir del loop
              break;
            }

            configContacts.push(...contacts);
          }

          console.log(
            `✅ Total contactos obtenidos para ${config.account_id}:`,
            configContacts.length
          );

          if (configContacts.length > 0) {
            // Procesar todos los contactos (sin filtrar por bot)
            for (const contact of configContacts) {
              // Obtener conversaciones para cada contacto usando Edge Function
              try {
                const endpoint = `/api/v1/accounts/${config.account_id}/contacts/${contact.id}/conversations`;

                const conversationsResult = await chatwootService.getChatwootData({
                  configId: config.id,
                  endpoint: endpoint
                });

                let conversations = [];
                let activeConversationId = null;

                if (conversationsResult.success) {
                  const conversationsData = conversationsResult.data;
                  conversations = conversationsData.payload || conversationsData || [];

                  // Buscar conversación activa (open)
                  const activeConversation = conversations.find(
                    (conv) => conv.status === "open"
                  );
                  if (activeConversation) {
                    activeConversationId = activeConversation.id;
                  }
                }

                // Limpiar número de teléfono para normalizar
                const cleanPhone = contact.phone_number?.replace(
                  /[\s\-\(\)\+]/g,
                  ""
                );

                allContactsFromChatwoot.push({
                  ...contact,
                  accountId: config.account_id,
                  chatwootConfigId: config.id,
                  conversations,
                  activeConversationId,
                  cleanPhone,
                  configName: config.alias || `Config ${config.account_id}`,
                });
              } catch (convError) {
                console.warn(
                  `⚠️ Error obteniendo conversaciones para contacto ${contact.id}:`,
                  convError
                );
                allContactsFromChatwoot.push({
                  ...contact,
                  accountId: config.account_id,
                  chatwootConfigId: config.id,
                  conversations: [],
                  activeConversationId: null,
                  cleanPhone: contact.phone_number?.replace(
                    /[\s\-\(\)\+]/g,
                    ""
                  ),
                  configName: config.alias || `Config ${config.account_id}`,
                });
              }
            }
          }
        } catch (configFetchError) {
          console.warn(
            `⚠️ Error procesando configuración ${config.account_id}:`,
            configFetchError
          );
        }
      }

      console.log(
        `📋 Total de contactos de Chatwoot: ${allContactsFromChatwoot.length}`
      );

      // 3. Obtener números únicos para buscar en BD
      const uniquePhones = [
        ...new Set(
          allContactsFromChatwoot
            .map((contact) => contact.cleanPhone)
            .filter(Boolean)
        ),
      ];

      console.log(`📱 Números únicos para buscar: ${uniquePhones.length}`);

      // 4. Crear mapa de contactos por teléfono
      const phoneMap = new Map();
      allContactsFromChatwoot.forEach((contact) => {
        if (contact.cleanPhone) {
          phoneMap.set(contact.cleanPhone, contact);
        }
      });

      // 5. Buscar trabajadores en la base de datos
      let trabajadoresData = [];

      if (uniquePhones.length > 0) {
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
          });
        });
      }

      // 6. Crear mapa de trabajadores por teléfono
      const trabajadorMap = new Map();
      trabajadoresData.forEach((t) => {
        trabajadorMap.set(t.telefono_origen, t);
      });

      // 7. Crear lista final combinando contactos con trabajadores
      const contactosFinal = uniquePhones.map((phone) => {
        const contact = phoneMap.get(phone);
        const trabajador = trabajadorMap.get(phone);

        if (trabajador) {
          // Contacto encontrado en BD con datos de trabajador
          const finalContacto = {
            ...trabajador,
            nombreCompleto: trabajador.nombre,
            telefono_origen: phone,
            hasContact: true,
            contactId: contact.id,
            chatwootContactName: contact.name,
            chatwootEmail: contact.email,
            chatwootAccountId: contact.accountId || configsData[0]?.account_id,
            conversations: contact.conversations || [],
            activeConversationId: contact.activeConversationId,
            chatwootConfigId:
              configsData.find(
                (config) =>
                  config.account_id ===
                  (contact.accountId || configsData[0]?.account_id)
              )?.id || configsData[0]?.id,
            sucursal: trabajador.sucursales,
            configName: contact.configName,
          };

          console.log(`🎯 CONTACTO FINAL para ${trabajador.nombre}:`, {
            telefono: finalContacto.telefono_origen,
            sucursal_asignada: finalContacto.sucursal,
            tiene_conversaciones: finalContacto.conversations.length,
            conversacion_activa: !!finalContacto.activeConversationId,
          });

          return finalContacto;
        } else {
          // Contacto no encontrado en BD, usar solo datos de Chatwoot
          return {
            id: null,
            nombre: contact.name || `Desconocido`,
            nombreCompleto: contact.name || `Desconocido (${phone})`,
            telefono_origen: phone,
            sucursal: null,
            hasContact: true,
            contactId: contact.id,
            chatwootContactName: contact.name,
            chatwootEmail: contact.email,
            chatwootAccountId: contact.accountId || configsData[0]?.account_id,
            conversations: contact.conversations || [],
            activeConversationId: contact.activeConversationId,
            chatwootConfigId:
              configsData.find(
                (config) =>
                  config.account_id ===
                  (contact.accountId || configsData[0]?.account_id)
              )?.id || configsData[0]?.id,
            configName: contact.configName,
          };
        }
      });

      // 8. Filtrar duplicados por teléfono
      const contactosUnicos = contactosFinal.reduce((acc, contacto) => {
        if (
          contacto &&
          !acc.find((t) => t.telefono_origen === contacto.telefono_origen)
        ) {
          acc.push(contacto);
        }
        return acc;
      }, []);

      console.log(`🎉 Total contactos finales: ${contactosUnicos.length}`);
      setContactos(contactosUnicos);
    } catch (err) {
      console.error("❌ Error en fetchAllContactos:", err);
      setError(`Error al cargar contactos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar si es trabajador registrado
  const esTrabajadorRegistrado = (contacto) => {
    return contacto.id !== null && contacto.sucursal;
  };

  // Filtrar contactos basado en búsqueda
  const filteredContactos = contactos.filter((contacto) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      contacto.nombreCompleto?.toLowerCase().includes(searchLower) ||
      contacto.chatwootContactName?.toLowerCase().includes(searchLower) ||
      contacto.chatwootEmail?.toLowerCase().includes(searchLower) ||
      contacto.telefono_origen?.includes(searchTerm) ||
      contacto.sucursal?.nombre?.toLowerCase().includes(searchLower)
    );
  });

  // Separar contactos en trabajadores registrados y no registrados
  const trabajadoresRegistrados = filteredContactos.filter(
    esTrabajadorRegistrado
  );
  const contactosNoRegistrados = filteredContactos.filter(
    (contacto) => !esTrabajadorRegistrado(contacto)
  );

  const handleOpenChat = async (contacto) => {
    try {
      // Si ya tiene conversación activa, abrir directamente
      if (contacto.activeConversationId) {
        setSelectedContactForChat(contacto);
        setShowChatwootModal(true);
        return;
      }

      // Si no tiene conversación activa, obtener todas las conversaciones del contacto
      console.log('📞 Obteniendo conversaciones para contacto:', contacto.contactId);

      const { data: configData } = await supabase
        .from('chatwoot_config')
        .select('*')
        .eq('id', contacto.chatwootConfigId)
        .single();

      if (!configData) {
        console.error('❌ No se encontró configuración de Chatwoot');
        alert('Error: No se encontró la configuración de Chatwoot');
        return;
      }

      // Obtener conversaciones del contacto usando Edge Function
      const endpoint = `/api/v1/accounts/${contacto.chatwootAccountId}/contacts/${contacto.contactId}/conversations`;

      const result = await chatwootService.getChatwootData({
        configId: configData.id,
        endpoint: endpoint
      });

      if (!result.success) {
        throw new Error('Error al obtener conversaciones');
      }

      const conversationsData = result.data;
      const conversations = Array.isArray(conversationsData)
        ? conversationsData
        : conversationsData.payload || conversationsData.data || [];

      console.log('💬 Conversaciones encontradas:', conversations.length);

      // Si hay conversaciones, usar la primera (más reciente)
      if (conversations.length > 0) {
        const updatedContacto = {
          ...contacto,
          activeConversationId: conversations[0].id,
          conversations: conversations,
        };
        setSelectedContactForChat(updatedContacto);
        setShowChatwootModal(true);
      } else {
        // No hay conversaciones, mostrar mensaje
        alert('Este contacto no tiene conversaciones. Por favor, abre Chatwoot para iniciar una conversación.');
      }
    } catch (error) {
      console.error('❌ Error al abrir chat:', error);
      alert('Error al cargar la conversación. Por favor, intenta nuevamente.');
    }
  };

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Todos los Contactos
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {loading
                      ? "Cargando..."
                      : `${filteredContactos.length} total | ${trabajadoresRegistrados.length} registrados | ${contactosNoRegistrados.length} externos`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="ml-3 text-gray-600 dark:text-gray-300">
                  Cargando contactos...
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={fetchAllContactos}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredContactos.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-300">
                  {searchTerm
                    ? "No se encontraron contactos con ese criterio"
                    : "No hay contactos disponibles"}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sección Trabajadores Registrados */}
                {trabajadoresRegistrados.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Trabajadores Registrados (
                        {trabajadoresRegistrados.length})
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {trabajadoresRegistrados.map((contacto) => (
                        <ContactCard
                          key={`trabajador-${contacto.chatwootAccountId}-${
                            contacto.contactId || contacto.id
                          }`}
                          contacto={contacto}
                          onOpenChat={handleOpenChat}
                          esTrabajadorRegistrado={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección Contactos Externos */}
                {contactosNoRegistrados.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Contactos Externos ({contactosNoRegistrados.length})
                      </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {contactosNoRegistrados.map((contacto) => (
                        <ContactCard
                          key={`externo-${contacto.chatwootAccountId}-${
                            contacto.contactId || contacto.id
                          }`}
                          contacto={contacto}
                          onOpenChat={handleOpenChat}
                          esTrabajadorRegistrado={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
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
          selectedContactForChat?.chatwootConfigId &&
          selectedContactForChat?.activeConversationId && (
            <ChatwootConversation
              conversationId={selectedContactForChat.activeConversationId}
              contactName={
                selectedContactForChat.nombreCompleto ||
                selectedContactForChat.chatwootContactName
              }
              chatwootConfigId={selectedContactForChat.chatwootConfigId}
              onClose={() => {
                setShowChatwootModal(false);
                setSelectedContactForChat(null);
              }}
            />
          )}

        {/* Modal de advertencia cuando no hay conversación activa */}
        {showChatwootModal &&
          selectedContactForChat &&
          !selectedContactForChat.activeConversationId && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
              onClick={() => {
                setShowChatwootModal(false);
                setSelectedContactForChat(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md"
              >
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sin Conversación Activa
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Este contacto no tiene conversaciones activas. Abre Chatwoot
                    para iniciar una nueva conversación.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const url = `https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${selectedContactForChat.chatwootAccountId}/contacts/${selectedContactForChat.contactId}`;
                        window.open(url, "_blank");
                        setShowChatwootModal(false);
                        setSelectedContactForChat(null);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Abrir en Chatwoot
                    </button>
                    <button
                      onClick={() => {
                        setShowChatwootModal(false);
                        setSelectedContactForChat(null);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </>
  );
};

// Componente reutilizable para las tarjetas de contacto
const ContactCard = ({ contacto, onOpenChat, esTrabajadorRegistrado }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl p-4 hover:shadow-lg transition-all duration-200 ${
        esTrabajadorRegistrado
          ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
          : "border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20"
      }`}
    >
      {/* Badge de categoría */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            esTrabajadorRegistrado
              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
              : "bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
          }`}
        >
          {esTrabajadorRegistrado ? "👤 Trabajador" : "🔗 Externo"}
        </span>
      </div>

      {/* Información del contacto */}
      <div className="space-y-3">
        {/* Nombre */}
        <div className="flex items-start space-x-3">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {contacto.nombreCompleto ||
                contacto.chatwootContactName ||
                "Sin nombre"}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {contacto.configName}
            </p>
          </div>
        </div>

        {/* Sucursal (solo para trabajadores registrados) */}
        {esTrabajadorRegistrado && contacto.sucursal && (
          <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p
                className="truncate font-medium"
                title={contacto.sucursal.nombre}
              >
                {contacto.sucursal.nombre}
              </p>
              {contacto.sucursal.telefono && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Tel: {contacto.sucursal.telefono}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Email */}
        {contacto.chatwootEmail && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{contacto.chatwootEmail}</span>
          </div>
        )}

        {/* Teléfono */}
        {contacto.telefono_origen && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="font-mono">{contacto.telefono_origen}</span>
          </div>
        )}

        {/* Estado de conversaciones */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {contacto.conversations && contacto.conversations.length > 0 ? (
            <span className="flex items-center">
              <MessageCircle className="w-3 h-3 mr-1" />
              {contacto.conversations.length} conversación(es)
              {contacto.activeConversationId && (
                <span className="ml-1 px-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded">
                  Activa
                </span>
              )}
            </span>
          ) : (
            "Sin conversaciones"
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
        {/* Botón Ver Chat en Modal */}
        <button
          onClick={() => onOpenChat(contacto)}
          className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {contacto.activeConversationId ? "Ver Chat Activo" : "Ver Chat"}
        </button>

        {/* Botón Abrir en Chatwoot (nueva pestaña) - Siempre visible */}
        {contacto.contactId && (
          <button
            onClick={async () => {
              try {
                // Si tiene conversación activa, abrir esa conversación
                if (contacto.activeConversationId) {
                  const url = `https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${contacto.chatwootAccountId}/inbox-view/conversation/${contacto.activeConversationId}`;
                  window.open(url, "_blank");
                  return;
                }

                // Si tiene conversaciones, abrir la primera
                if (contacto.conversations && contacto.conversations.length > 0) {
                  const url = `https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${contacto.chatwootAccountId}/inbox-view/conversation/${contacto.conversations[0].id}`;
                  window.open(url, "_blank");
                  return;
                }

                // Si no tiene conversaciones, intentar obtenerlas de la API
                const { data: configData } = await supabase
                  .from('chatwoot_config')
                  .select('*')
                  .eq('id', contacto.chatwootConfigId)
                  .single();

                if (!configData) {
                  alert('No se pudo obtener la configuración de Chatwoot');
                  return;
                }

                const endpoint = `/api/v1/accounts/${contacto.chatwootAccountId}/contacts/${contacto.contactId}/conversations`;

                const result = await chatwootService.getChatwootData({
                  configId: configData.id,
                  endpoint: endpoint
                });

                if (!result.success) {
                  throw new Error('Error al obtener conversaciones');
                }

                const conversationsData = result.data;
                const conversations = conversationsData.payload || conversationsData || [];

                if (conversations.length > 0) {
                  // Tiene conversaciones, abrir la primera
                  const url = `https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${contacto.chatwootAccountId}/inbox-view/conversation/${conversations[0].id}`;
                  window.open(url, "_blank");
                } else {
                  // No tiene conversaciones, mostrar alerta
                  alert(`El contacto ${contacto.nombreCompleto || contacto.chatwootContactName} no tiene conversaciones.`);
                }
              } catch (error) {
                console.error('Error al abrir Chatwoot:', error);
                alert('Error al abrir Chatwoot. Por favor, intenta nuevamente.');
              }
            }}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center gap-2"
            title="Abrir en Chatwoot"
          >
            <ExternalLink className="w-4 h-4" />
            {(contacto.activeConversationId || (contacto.conversations && contacto.conversations.length > 0))
              ? "Abrir Conversación"
              : "Abrir en Chatwoot"}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ContactosModal;
