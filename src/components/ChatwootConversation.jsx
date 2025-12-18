import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, X, Loader2, User, Bot, Reply } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatwootConfig } from "../hooks/useChatwootConfig";
import {
  buildChatwootApiUrl,
  getChatwootApiHeaders,
  logApiConfiguration,
} from "../utils/chatwootConfig";

const ChatwootConversation = ({
  conversationId,
  chatwootConfigId,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [contactId, setContactId] = useState(null);
  const [botEnabled, setBotEnabled] = useState(false);
  const [updatingBot, setUpdatingBot] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);

  // Usar el hook para cargar la configuración de Chatwoot
  const {
    config: chatwootConfig,
    loading: configLoading,
    error: configError,
  } = useChatwootConfig(chatwootConfigId);
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(0);

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? "instant" : "smooth",
        block: "end",
      });
    }
  };

  const forceScrollToBottom = () => {
    // Método más agresivo para asegurar que llegue al final
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  };

  const checkIfUserIsAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 50; // 50px de margen
    return scrollTop + clientHeight >= scrollHeight - threshold;
  };

  const handleScroll = () => {
    shouldAutoScrollRef.current = checkIfUserIsAtBottom();
  };

  useEffect(() => {
    // Solo hacer scroll automático si:
    // 1. El usuario está en la parte inferior
    // 2. Hay nuevos mensajes (no es la primera carga o cambio de filtros)
    const hasNewMessages = messages.length > previousMessageCountRef.current;

    if (shouldAutoScrollRef.current && hasNewMessages) {
      scrollToBottom();
    }

    previousMessageCountRef.current = messages.length;
  }, [messages]);

  // Scroll automático al final cuando se cargan los mensajes por primera vez
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      // Estrategia múltiple: primero forzar, luego suavizar
      setTimeout(() => {
        forceScrollToBottom();
        setTimeout(() => {
          scrollToBottom(true); // Scroll instantáneo para asegurar posición
        }, 50);
      }, 100);
    }
  }, [messagesLoading]);

  // Scroll automático cuando se monta el componente por primera vez
  useEffect(() => {
    const isFirstMount = previousMessageCountRef.current === 0;

    if (isFirstMount && !messagesLoading && messages.length > 0) {
      // Múltiples intentos para asegurar que llega al final
      setTimeout(() => {
        forceScrollToBottom();
      }, 200);

      setTimeout(() => {
        forceScrollToBottom();
        scrollToBottom(true);
      }, 400);

      setTimeout(() => {
        scrollToBottom(true);
      }, 600);
    }
  }, [messages, messagesLoading]);

  const fetchConversationDetails = async () => {
    try {
      if (!chatwootConfig) {
        console.log("❌ No hay configuración de Chatwoot disponible");
        return;
      }

      console.log("🔄 Iniciando fetch de detalles de conversación...");
      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${chatwootConfig.account_id}/conversations/${conversationId}`
      );

      console.log("📡 Haciendo fetch a:", apiUrl);
      const headers = getChatwootApiHeaders(chatwootConfig.api_token);
      console.log("📋 Headers:", headers);

      const response = await fetch(apiUrl, { headers });

      console.log("📥 Respuesta recibida:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error en respuesta:", errorText);
        throw new Error(
          `Error ${response.status}: ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("✅ Detalles de conversación obtenidos:", data);

      // Extraer el contact_id y el estado actual del atributo bot
      if (data.meta && data.meta.sender) {
        setContactId(data.meta.sender.id);
        const currentBotValue = data.meta.sender.custom_attributes?.bot;

        // Si no hay valor o no es "On" ni "Off", establecer por defecto como "On"
        if (
          !currentBotValue ||
          (currentBotValue !== "On" && currentBotValue !== "Off")
        ) {
          console.log(
            "🔄 Atributo bot no definido o inválido, estableciendo por defecto como 'On'"
          );
          await updateBotAttributeDirectly(data.meta.sender.id, "On");
          setBotEnabled(true);
        } else {
          setBotEnabled(currentBotValue === "On");
        }

        console.log("👤 Contact ID:", data.meta.sender.id);
        console.log(
          "🤖 Bot status:",
          currentBotValue,
          "-> establecido como:",
          currentBotValue === "On"
            ? "On"
            : !currentBotValue ||
              (currentBotValue !== "On" && currentBotValue !== "Off")
            ? "On (por defecto)"
            : currentBotValue
        );
      }
    } catch (err) {
      console.error("❌ Error detallado cargando conversación:", {
        message: err.message,
        stack: err.stack,
        chatwootConfig: chatwootConfig ? "disponible" : "no disponible",
        conversationId,
      });
      setMessagesError(`Error cargando conversación: ${err.message}`);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      if (!chatwootConfig) {
        setMessagesError("Configuración de Chatwoot no disponible");
        return;
      }

      // Calcular timestamps de la última semana
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      const oneWeekAgoTimestamp = Math.floor(oneWeekAgo.getTime() / 1000);

      // Cargar todos los mensajes de la última semana usando paginación
      let allMessages = [];
      let beforeId = null;
      let hasMore = true;

      while (hasMore) {
        const apiUrl = buildChatwootApiUrl(
          `/api/v1/accounts/${chatwootConfig.account_id}/conversations/${conversationId}/messages${beforeId ? `?before=${beforeId}` : ''}`
        );

        const response = await fetch(apiUrl, {
          headers: getChatwootApiHeaders(chatwootConfig.api_token),
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const messagesPage = data.payload || [];

        if (messagesPage.length > 0) {
          // Filtrar mensajes de la última semana
          const recentMessages = messagesPage.filter(msg => msg.created_at >= oneWeekAgoTimestamp);
          allMessages = allMessages.concat(recentMessages);

          // Si encontramos mensajes más antiguos que la semana, detener
          if (recentMessages.length < messagesPage.length) {
            hasMore = false;
          } else if (messagesPage.length < 20) {
            hasMore = false;
          } else {
            beforeId = messagesPage[0].id;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`✅ Mensajes cargados (última semana): ${allMessages.length}`);

      // Ordenar por fecha y hora de forma ascendente (del más antiguo al más reciente)
      allMessages.sort((a, b) => a.created_at - b.created_at);

      setMessages(allMessages);
      setMessagesError(null);
    } catch (err) {
      console.error("❌ Error al cargar mensajes:", err);
      setMessagesError(err.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [chatwootConfig, conversationId]);

  const updateBotAttributeDirectly = async (contactIdParam, botValue) => {
    if (!chatwootConfig || !contactIdParam) return;

    try {
      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${chatwootConfig.account_id}/contacts/${contactIdParam}`
      );
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: getChatwootApiHeaders(chatwootConfig.api_token),
        body: JSON.stringify({
          custom_attributes: {
            bot: botValue,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      console.log(
        `✅ Atributo bot actualizado a '${botValue}' para contacto ${contactIdParam}`
      );
    } catch (error) {
      console.error("❌ Error actualizando atributo bot por defecto:", error);
    }
  };

  const updateBotAttribute = async (newValue) => {
    if (!chatwootConfig || !contactId) return;

    setUpdatingBot(true);
    try {
      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${chatwootConfig.account_id}/contacts/${contactId}`
      );
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: getChatwootApiHeaders(chatwootConfig.api_token),
        body: JSON.stringify({
          custom_attributes: {
            bot: newValue ? "On" : "Off",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      setBotEnabled(newValue);
      console.log("✅ Atributo bot actualizado a:", newValue ? "On" : "Off");
    } catch (err) {
      console.error("Error al actualizar atributo bot:", err);
      setMessagesError(err.message);
    } finally {
      setUpdatingBot(false);
    }
  };

  const handleBotToggle = () => {
    updateBotAttribute(!botEnabled);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !chatwootConfig) return;

    setSending(true);
    try {
      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${chatwootConfig.account_id}/conversations/${conversationId}/messages`
      );

      // Construir el body del mensaje
      const messageBody = {
        content: newMessage,
        message_type: "outgoing",
        private: false,
      };

      // Si estamos respondiendo a un mensaje, agregar content_attributes
      if (replyingTo && replyingTo.id) {
        messageBody.content_attributes = {
          in_reply_to: replyingTo.id.toString(),
        };
        console.log("📧 Respondiendo al mensaje ID:", replyingTo.id);
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: getChatwootApiHeaders(chatwootConfig.api_token),
        body: JSON.stringify(messageBody),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      console.log("✅ Mensaje enviado correctamente");
      setNewMessage("");
      setReplyingTo(null); // Limpiar la respuesta después de enviar
      // Recargar mensajes inmediatamente después de enviar
      await fetchMessages();
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      setMessagesError(err.message);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // Solo iniciar cuando tengamos la configuración cargada
    if (!chatwootConfig || configLoading) return;

    console.log("🚀 Inicializando ChatwootConversation");
    logApiConfiguration();

    // Cargar detalles de conversación (para obtener contact_id y estado del bot)
    fetchConversationDetails();

    // Cargar mensajes inicialmente
    fetchMessages();

    // Polling cada 3 segundos para nuevos mensajes
    pollingIntervalRef.current = setInterval(() => fetchMessages(), 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, chatwootConfig, configLoading]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  // Agrupar mensajes por fecha
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((msg) => {
      const dateKey = formatDate(msg.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-5xl h-[800px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Conversación de Chatwoot
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {conversationId}
            </p>
          </div>

          {/* Bot Toggle and Close Button */}
          <div className="flex items-center gap-4">
            {/* Bot Toggle */}
            {contactId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Bot:
                </span>
                <button
                  onClick={handleBotToggle}
                  disabled={updatingBot}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    botEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  title={`Bot: ${botEnabled ? "ON" : "OFF"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      botEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-medium ${
                    botEnabled
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {updatingBot ? "..." : botEnabled ? "ON" : "OFF"}
                </span>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-800 to-gray-900"
        >
          {configLoading || messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : configError || messagesError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500 dark:text-red-400 mb-2">
                  {configError
                    ? "Error de configuración"
                    : "Error al cargar mensajes"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {configError || messagesError}
                </p>
                <button
                  onClick={fetchMessages}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  disabled={!!configError}
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">
                No hay mensajes en esta conversación
              </p>
            </div>
          ) : (
            <>
              {Object.entries(messageGroups).map(([date, msgs]) => (
                <div key={date}>
                  {/* Separador de fecha */}
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                      {date}
                    </div>
                  </div>

                  {/* Mensajes del día */}
                  {msgs.map((message) => {
                    // Clasificar mensajes usando múltiples métodos:
                    // 1. message_type puede ser "incoming" (string) o 0 (number)
                    // 2. sender.type puede ser "contact" para clientes o "User"/"Agent" para agentes
                    const isIncoming =
                      message.message_type === "incoming" ||
                      message.message_type === 0 ||
                      message.sender?.type === "contact";

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        className={`flex ${
                          isIncoming ? "justify-start" : "justify-end"
                        } mb-3 group relative`}
                      >
                        <div
                          className={`flex items-end gap-2 max-w-[75%] ${
                            isIncoming ? "flex-row" : "flex-row-reverse"
                          }`}
                        >
                          {/* Avatar */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
                              isIncoming ? "bg-gray-500" : "bg-gray-500"
                            }`}
                          >
                            {isIncoming ? (
                              <Bot className="w-4 h-4 text-white" />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`flex flex-col ${
                              isIncoming ? "items-start" : "items-end"
                            }`}
                          >
                            {/* Sender Name */}
                            {message.sender && (
                              <span
                                className={`text-xs font-medium mb-1 px-1 ${
                                  isIncoming ? "text-gray-400" : "text-gray-400"
                                }`}
                              >
                                {message.sender.name ||
                                  message.sender.email ||
                                  "Usuario"}
                              </span>
                            )}

                            {/* Message Content Card */}
                            <div
                              className={`rounded-2xl px-4 py-3 shadow-md relative ${
                                isIncoming
                                  ? "bg-white text-gray-900 rounded-bl-none"
                                  : "bg-gray-300 text-gray-900 rounded-br-none"
                              }`}
                            >
                              {/* Botón de Responder (solo visible en hover) */}
                              {isIncoming &&
                                hoveredMessageId === message.id && (
                                  <button
                                    onClick={() => setReplyingTo(message)}
                                    className="absolute -top-2 right-2 p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg transition-all"
                                    title="Responder a este mensaje"
                                  >
                                    <Reply className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              {message.content && (
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {message.content}
                                </p>
                              )}

                              {/* Attachments */}
                              {message.attachments &&
                                message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    {message.attachments.map(
                                      (attachment, idx) => (
                                        <div key={idx}>
                                          {attachment.file_type === "image" ? (
                                            <a
                                              href={attachment.data_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="block"
                                            >
                                              <img
                                                src={attachment.data_url}
                                                alt="Imagen adjunta"
                                                className="max-w-2xl max-h-[37rem] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                loading="lazy"
                                              />
                                            </a>
                                          ) : attachment.file_type ===
                                            "file" ? (
                                            <a
                                              href={attachment.data_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`block text-xs underline hover:no-underline ${
                                                isIncoming
                                                  ? "text-blue-600"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              📎{" "}
                                              {attachment.file_name ||
                                                "Ver archivo"}
                                            </a>
                                          ) : (
                                            <a
                                              href={attachment.data_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`block text-xs underline hover:no-underline ${
                                                isIncoming
                                                  ? "text-blue-600"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              📎 Ver archivo
                                            </a>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}

                              {/* Timestamp dentro del mensaje */}
                              <div
                                className={`text-[10px] mt-1 ${
                                  isIncoming ? "text-gray-500" : "text-gray-700"
                                }`}
                              >
                                {formatTime(message.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-gray-200 dark:border-gray-700"
        >
          {/* Preview del mensaje al que se está respondiendo */}
          {replyingTo && (
            <div className="mb-3 bg-gray-100 dark:bg-gray-700 border-l-4 border-blue-500 p-3 rounded-lg flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Reply className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Respondiendo a {replyingTo.sender?.name || "Usuario"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-2">
                  {replyingTo.content || "(Sin contenido de texto)"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                title="Cancelar respuesta"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje..."
              }
              disabled={sending || configLoading || messagesLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                !newMessage.trim() ||
                sending ||
                configLoading ||
                messagesLoading
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ChatwootConversation;
