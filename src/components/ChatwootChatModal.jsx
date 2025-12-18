import React, { useState, useEffect, useContext } from 'react';
import { X, MessageCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { buildChatwootApiUrl, getChatwootApiHeaders } from '../utils/chatwootConfig';
import { AuthContext } from '../contexts/AuthContext';

const ChatwootChatModal = ({ contactInfo, onClose }) => {
  const { currentUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Cargar la configuración de Chatwoot y las conversaciones del contacto
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener configuración de Chatwoot
        const { data: configData, error: configError } = await supabase
          .from('chatwoot_config')
          .select('*')
          .eq('activo', true)
          .eq('account_id', contactInfo.accountId)
          .single();

        if (configError || !configData) {
          throw new Error('No se pudo cargar la configuración de Chatwoot');
        }

        setConfig(configData);

        // Obtener las conversaciones del contacto
        const apiUrl = buildChatwootApiUrl(
          `/api/v1/accounts/${contactInfo.accountId}/contacts/${contactInfo.contactId}/conversations`
        );

        const response = await fetch(apiUrl, {
          headers: getChatwootApiHeaders(configData.api_token)
        });

        if (!response.ok) {
          throw new Error('Error al cargar las conversaciones');
        }

        const conversationsData = await response.json();
        const convList = Array.isArray(conversationsData)
          ? conversationsData
          : (conversationsData.payload || conversationsData.data?.payload || []);

        setConversations(convList);

        // Si hay conversaciones, seleccionar la primera por defecto
        if (convList.length > 0) {
          setSelectedConversation(convList[0]);
          await loadMessages(convList[0].id, configData);
        }
      } catch (err) {
        console.error('❌ Error cargando conversaciones:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [contactInfo]);

  // Cargar mensajes de una conversación
  const loadMessages = async (conversationId, configToUse = config) => {
    try {
      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${contactInfo.accountId}/conversations/${conversationId}/messages`
      );

      const response = await fetch(apiUrl, {
        headers: getChatwootApiHeaders(configToUse.api_token)
      });

      if (!response.ok) {
        throw new Error('Error al cargar los mensajes');
      }

      const messagesData = await response.json();
      const messagesList = Array.isArray(messagesData)
        ? messagesData
        : (messagesData.payload || messagesData.data?.payload || []);

      setMessages(messagesList);
    } catch (err) {
      console.error('❌ Error cargando mensajes:', err);
      setError(err.message);
    }
  };

  // Enviar un mensaje
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !config) return;

    try {
      setSending(true);

      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${contactInfo.accountId}/conversations/${selectedConversation.id}/messages`
      );

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: getChatwootApiHeaders(config.api_token),
        body: JSON.stringify({
          content: newMessage,
          message_type: 'outgoing',
          private: false,
        })
      });

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }

      // Limpiar el input y recargar mensajes
      setNewMessage('');
      await loadMessages(selectedConversation.id);
    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Actualizar el atributo custom "bot" a "On"
  const handleActivateBot = async () => {
    try {
      setLoading(true);

      const apiUrl = buildChatwootApiUrl(
        `/api/v1/accounts/${contactInfo.accountId}/contacts/${contactInfo.contactId}`
      );

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: getChatwootApiHeaders(config.api_token),
        body: JSON.stringify({
          custom_attributes: {
            bot: 'On'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al activar el bot');
      }

      alert('¡Bot activado exitosamente! Este contacto desaparecerá de la lista al actualizar.');
      onClose();
    } catch (err) {
      console.error('❌ Error activando bot:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {contactInfo.nombre}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {contactInfo.telefono}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Cargando chat...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              </div>
              <a
                href={`https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${contactInfo.accountId}/contacts/${contactInfo.contactId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ExternalLink size={16} />
                Abrir en Chatwoot
              </a>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No hay conversaciones</p>
            </div>
          ) : (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No hay mensajes en esta conversación
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.message_type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.message_type === 'outgoing'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.message_type === 'outgoing'
                              ? 'text-blue-100'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {new Date(msg.created_at * 1000).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    disabled={sending}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Enviar'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Activate Bot Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={handleActivateBot}
              disabled={loading || !config}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Activar Bot
            </button>
            <a
              href={`https://chatwoot-chatwoot.gnfcio.easypanel.host/app/accounts/${contactInfo.accountId}/contacts/${contactInfo.contactId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Abrir en Chatwoot
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatwootChatModal;
