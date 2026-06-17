import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  ChevronDown,
  CalendarDays,
  Reply,
  X,
} from "lucide-react";
import yCloudService from "../services/yCloudService.js";
import { formatDateTime } from "../utils/dateFormatters.js";

const formatPhoneForDisplay = (phone) => {
  if (!phone) return "-";
  return String(phone).replace(/\D/g, "");
};

const getMessageBubbleStyle = (direction) =>
  direction === "outbound"
    ? "ml-auto bg-white text-gray-900 border border-gray-200 shadow-sm"
    : "mr-auto bg-white text-gray-900 border border-gray-200 shadow-sm";

const getMediaTypeLabel = (type) => {
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType.startsWith("image/") || normalizedType === "image") return "Imagen";
  if (normalizedType.startsWith("video/") || normalizedType === "video") return "Video";
  if (normalizedType.startsWith("audio/") || normalizedType === "audio") return "Audio";

  switch (normalizedType) {
    case "image":
      return "Imagen";
    case "document":
      return "Documento";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    default:
      return "Archivo";
  }
};

const getAttachmentKind = (type = "", url = "") => {
  const normalizedType = String(type || "").toLowerCase();
  const normalizedUrl = String(url || "").toLowerCase();

  if (normalizedType.startsWith("image/") || normalizedType === "image") return "image";
  if (normalizedType.startsWith("video/") || normalizedType === "video") return "video";
  if (normalizedType.startsWith("audio/") || normalizedType === "audio") return "audio";
  if (normalizedType === "application/pdf" || normalizedType === "document") return "document";

  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(normalizedUrl)) return "image";
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(normalizedUrl)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(normalizedUrl)) return "audio";
  if (/\.(pdf|docx?|xlsx?|pptx?)(\?|#|$)/i.test(normalizedUrl)) return "document";

  return "file";
};

const CHAT_BACKGROUND_PATTERN = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" fill="none">
    <defs>
      <style>
        .a{stroke:#eadfcd;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round;fill:none;opacity:.72}
        .b{stroke:#eadfcd;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;fill:none;opacity:.52}
      </style>
    </defs>
    <circle class="a" cx="40" cy="40" r="12"/>
    <circle class="b" cx="190" cy="52" r="8"/>
    <rect class="a" x="155" y="150" width="28" height="18" rx="5" transform="rotate(-8 155 150)"/>
    <path class="a" d="M18 186c8-10 20-10 28 0 8-10 20-10 28 0"/>
    <path class="b" d="M122 28l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1 4-8z"/>
    <path class="b" d="M78 172c4-8 10-12 18-12 6 0 11 2 15 6 4 4 6 9 6 15 0 8-4 14-12 18-8-4-12-10-12-18 0-4 1-7 3-10"/>
    <path class="a" d="M196 182h16m-8-8v16"/>
    <path class="b" d="M42 112h30m-15-15v30"/>
    <path class="a" d="M126 126c6-8 14-12 24-12 8 0 15 2 20 7 5 5 8 11 8 19 0 10-4 18-13 24-9-6-13-14-13-24 0-5 1-9 4-13"/>
    <path class="b" d="M176 84c6-6 12-8 20-8 7 0 12 2 17 6 5 4 8 10 9 17-8 5-16 7-24 6-8-1-15-5-22-11z"/>
    <path class="a" d="M64 206c0-5 4-9 9-9s9 4 9 9-4 9-9 9-9-4-9-9z"/>
    <path class="b" d="M12 84c6 2 10 6 12 12m6-18c-2 6-6 10-12 12"/>
    <path class="b" d="M216 116c-6 2-10 6-12 12m-6-18c2 6 6 10 12 12"/>
  </svg>
`).replace(/%0A\s*/g, "");

const CONVERSATION_PAGE_SIZE = 100;
const CONVERSATION_CACHE_LIMIT = 8;
const conversationHistoryCache = new Map();
const conversationDayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const conversationDayLabelFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const getConversationDayKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = conversationDayKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : "";
};

const getConversationDayLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  const currentKey = getConversationDayKey(date);
  const todayKey = getConversationDayKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getConversationDayKey(yesterday);

  if (currentKey === todayKey) return "Hoy";
  if (currentKey === yesterdayKey) return "Ayer";

  return conversationDayLabelFormatter.format(date);
};

const getConversationMessageKey = (message) =>
  [
    message?.id || message?.message_id || "",
    message?.timestamp || "",
    message?.direction || "",
    message?.content || message?.text || "",
    message?.attachmentUrl || "",
  ].join("|");

const getConversationMessageTime = (message) => new Date(message?.timestamp || message?.createdAt || 0).getTime();

const mergeConversationMessages = (current = [], incoming = []) => {
  const merged = [];
  const seen = new Set();

  for (const message of [...current, ...incoming]) {
    const key = getConversationMessageKey(message);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(message);
  }

  return merged.sort((a, b) => getConversationMessageTime(a) - getConversationMessageTime(b));
};

const updateConversationCache = (cacheKey, messages, extra = {}) => {
  if (!cacheKey) return;

  conversationHistoryCache.set(cacheKey, {
    messages,
    updatedAt: new Date().toISOString(),
    ...extra,
  });

  while (conversationHistoryCache.size > CONVERSATION_CACHE_LIMIT) {
    const oldestKey = conversationHistoryCache.keys().next().value;
    if (!oldestKey) break;
    conversationHistoryCache.delete(oldestKey);
  }
};

const renderAttachmentInline = (message) => {
  const url = message.attachmentUrl;
  if (!url) return null;

  const type = getAttachmentKind(message.attachmentType, url);

  if (type === "image") {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white/10 p-2">
        <div className="flex justify-center">
          <img
            src={url}
            alt={message.attachmentName || "Adjunto"}
            className="block h-auto max-h-[360px] w-auto max-w-full rounded-lg object-contain"
            loading="lazy"
          />
        </div>
        {message.caption || message.attachmentName ? (
          <div className="mt-2 space-y-1 px-1">
            {message.caption ? (
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {message.caption}
              </p>
            ) : null}
            {message.attachmentName && message.attachmentName !== message.caption ? (
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {message.attachmentName}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/20">
        <video className="max-h-96 w-full" controls playsInline preload="metadata" src={url} />
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="mt-3 rounded-xl border border-black/10 bg-white/10 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
          <ImageIcon className="h-4 w-4" />
          <span>{message.attachmentName || "Audio"}</span>
        </div>
        <audio className="w-full" controls preload="metadata" src={url} />
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white/10 px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
        <ImageIcon className="h-4 w-4" />
        <span>{message.attachmentName || getMediaTypeLabel(type)}</span>
      </div>
      <div className="rounded-lg bg-white/80 dark:bg-gray-950">
        <iframe
          src={url}
          title={message.attachmentName || "Adjunto"}
          className="h-[320px] w-full rounded-lg border-0"
          scrolling="no"
        />
      </div>
    </div>
  );
};

const normalizeConversationMessage = (message) => {
  const rawContent = message?.content ?? message?.text ?? message?.body ?? "";
  const contentObject = rawContent && typeof rawContent === "object" ? rawContent : null;
  const content =
    typeof rawContent === "string"
      ? rawContent
      : contentObject
        ? contentObject.text ||
          contentObject.body ||
          contentObject.value ||
          ""
        : "";
  const attachmentUrl =
    message?.attachmentUrl ||
    message?.mediaUrl ||
    message?.media_url ||
    message?.image?.link ||
    message?.image?.url ||
    message?.document?.link ||
    message?.document?.url ||
    message?.video?.link ||
    message?.video?.url ||
    message?.audio?.link ||
    message?.audio?.url ||
    "";

  const attachmentName =
    message?.attachmentName ||
    message?.mediaName ||
    message?.document?.filename ||
    message?.document?.name ||
    message?.image?.caption ||
    message?.document?.caption ||
    message?.video?.caption ||
    message?.audio?.caption ||
    "";

  const attachmentType = message?.attachmentType || message?.type || "";
  const replyContext =
    message?.replyToMessageId ||
    message?.reply_to_message_id ||
    contentObject?.context?.message_id ||
    contentObject?.context?.id ||
    contentObject?.replyToMessageId ||
    contentObject?.reply_to_message_id ||
    message?.metadata?.reply_to_message_id ||
    message?.metadata?.replyToMessageId ||
    message?.metadata?.context?.message_id ||
    message?.metadata?.context?.id ||
    null;
  const caption =
    message?.caption ||
    contentObject?.image?.caption ||
    contentObject?.document?.caption ||
    contentObject?.video?.caption ||
    contentObject?.audio?.caption ||
    message?.image?.caption ||
    message?.document?.caption ||
    message?.video?.caption ||
    message?.audio?.caption ||
    "";

  return {
    ...message,
    content,
    caption,
    attachmentUrl,
    attachmentName,
    attachmentType,
    timestamp: message?.timestamp || message?.createdAt || message?.enviado_en || message?.received_at || null,
    replyToMessageId: replyContext ? String(replyContext) : null,
    replyToText:
      String(
        message?.replyToText ||
          message?.reply_to_text ||
          message?.metadata?.reply_to_text ||
          message?.metadata?.context?.body ||
          message?.metadata?.context?.text ||
          contentObject?.context?.body ||
          contentObject?.context?.text ||
          "",
      ).trim(),
  };
};

const ConversationModal = ({
  isOpen,
  onClose,
  deposit,
  phoneNumber,
  title = "Conversación WhatsApp",
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [expandedImageKey, setExpandedImageKey] = useState(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [oldestCursor, setOldestCursor] = useState(null);
  const [latestCursor, setLatestCursor] = useState(null);
  const [highlightedMessageKey, setHighlightedMessageKey] = useState("");
  const messagesContainerRef = useRef(null);
  const messagesRef = useRef([]);
  const messageNodeRefs = useRef(new Map());
  const highlightTimerRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const normalizedPhone = useMemo(
    () => formatPhoneForDisplay(phoneNumber),
    [phoneNumber],
  );

  const cacheKey = normalizedPhone || String(phoneNumber || "");

  const replyIndex = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      const key = String(message.id || message.message_id || "");
      if (key) {
        map.set(key, message);
      }
    });
    return map;
  }, [messages]);

  const handleReplyReferenceClick = useCallback(
    (replyToMessageId) => {
      if (!replyToMessageId) return;

      const target = replyIndex.get(String(replyToMessageId));
      if (!target) return;

      const targetKey = `message-${getConversationMessageKey(target)}`;
      const targetNode = messageNodeRefs.current.get(targetKey);

      if (targetNode) {
        targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setHighlightedMessageKey(targetKey);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        setHighlightedMessageKey("");
      }, 2200);
    },
    [replyIndex],
  );

  const timelineItems = useMemo(() => {
    const items = [];
    let lastDayKey = "";

    messages.forEach((message) => {
      const dayKey = getConversationDayKey(message.timestamp);
      if (dayKey && dayKey !== lastDayKey) {
        items.push({
          type: "separator",
          key: `separator-${dayKey}-${getConversationMessageKey(message)}`,
          label: getConversationDayLabel(message.timestamp),
        });
        lastDayKey = dayKey;
      }

      items.push({
        type: "message",
        key: `message-${getConversationMessageKey(message)}`,
        message,
      });
    });

    return items;
  }, [messages]);

  const conversationRangeLabel = useMemo(() => {
    if (!oldestCursor && !latestCursor) return "";
    if (oldestCursor && latestCursor) {
      return `${formatDateTime(oldestCursor)} - ${formatDateTime(latestCursor)}`;
    }

    return formatDateTime(oldestCursor || latestCursor);
  }, [latestCursor, oldestCursor]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const loadConversationPage = useCallback(
    async ({
      before = null,
      hydrateCache = false,
      keepScrollPosition = false,
      forceLoading = false,
    } = {}) => {
      if (!normalizedPhone) {
        setMessages([]);
        setError("No hay número de teléfono disponible para esta conversación.");
        setHasMoreHistory(false);
        setOldestCursor(null);
        setLatestCursor(null);
        return;
      }

      const cached = conversationHistoryCache.get(cacheKey);
      const shouldShowInitialCache = hydrateCache && !before && cached?.messages?.length > 0;

      if (shouldShowInitialCache) {
        setMessages(cached.messages);
        setHasMoreHistory(Boolean(cached.hasMoreHistory ?? true));
        setOldestCursor(cached.oldestCursor || cached.messages?.[0]?.timestamp || null);
        setLatestCursor(cached.latestCursor || cached.messages?.[cached.messages.length - 1]?.timestamp || null);
        setError("");
      }

      if (before) {
        setLoadingMore(true);
      } else if (forceLoading || !shouldShowInitialCache) {
        setLoading(true);
      }

      setError("");
      shouldStickToBottomRef.current = !before;

      const container = messagesContainerRef.current;
      const previousScrollHeight = keepScrollPosition && container ? container.scrollHeight : 0;
      const previousScrollTop = keepScrollPosition && container ? container.scrollTop : 0;

      try {
        const response = await yCloudService.getConversationHistory({
          phoneNumber: normalizedPhone,
          depositId: deposit?.id,
          limit: CONVERSATION_PAGE_SIZE,
          ...(before ? { before } : {}),
        });

        const normalizedMessages = Array.isArray(response?.messages)
          ? response.messages.map(normalizeConversationMessage)
          : [];

        const nextMessages = before
          ? mergeConversationMessages(messagesRef.current, normalizedMessages)
          : normalizedMessages;

        const nextHasMore = normalizedMessages.length >= CONVERSATION_PAGE_SIZE;
        const nextOldestCursor = nextMessages[0]?.timestamp || null;
        const nextLatestCursor = nextMessages[nextMessages.length - 1]?.timestamp || null;

        setMessages(nextMessages);
        setHasMoreHistory(nextHasMore);
        setOldestCursor(nextOldestCursor);
        setLatestCursor(nextLatestCursor);
        updateConversationCache(cacheKey, nextMessages, {
          hasMoreHistory: nextHasMore,
          oldestCursor: nextOldestCursor,
          latestCursor: nextLatestCursor,
        });

        if (before && keepScrollPosition) {
          window.requestAnimationFrame(() => {
            const currentContainer = messagesContainerRef.current;
            if (!currentContainer) return;
            const delta = currentContainer.scrollHeight - previousScrollHeight;
            currentContainer.scrollTop = previousScrollTop + delta;
          });
        }
      } catch (err) {
        if (!shouldShowInitialCache) {
          setMessages([]);
        }
        setError(err?.message || "No se pudo cargar la conversación.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [cacheKey, deposit?.id, normalizedPhone],
  );

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMoreHistory || !oldestCursor) return;
    shouldStickToBottomRef.current = false;
    loadConversationPage({
      before: oldestCursor,
      keepScrollPosition: true,
      forceLoading: true,
    });
  }, [hasMoreHistory, loadConversationPage, loading, loadingMore, oldestCursor]);

  const handleRefresh = useCallback(() => {
    shouldStickToBottomRef.current = true;
    loadConversationPage({
      hydrateCache: true,
      forceLoading: true,
    });
    setRefreshNonce((value) => value + 1);
  }, [loadConversationPage]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadConversationPage({
      hydrateCache: true,
      forceLoading: !conversationHistoryCache.get(cacheKey)?.messages?.length,
    });
  }, [cacheKey, isOpen, loadConversationPage, refreshNonce]);

  useEffect(() => {
    if (!isOpen) return;
    if (!shouldStickToBottomRef.current) return;
    const rafId = window.requestAnimationFrame(() => scrollToBottom("auto"));
    const timeoutId = window.setTimeout(() => scrollToBottom("auto"), 0);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, messages.length, loading, loadingMore, refreshNonce, scrollToBottom]);

  useEffect(() => {
    if (!expandedImageKey) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setExpandedImageKey(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedImageKey]);

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-green-100 p-2 dark:bg-green-900/40">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-gray-900 dark:text-gray-100">
                  {title}
                </h2>
                <p className="truncate text-xs text-gray-600 dark:text-gray-300">
                  {deposit?.empresa?.nombre || deposit?.empresa?.abreviatura || "Depósito"} ·{" "}
                  {deposit?.sucursal?.nombre || "Sin sucursal"} · Tel: {formatPhoneForDisplay(normalizedPhone)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Actualizar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              aria-label="Cerrar conversación"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-2.5 py-1 font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <Phone className="h-3.5 w-3.5" />
              {normalizedPhone || "Sin teléfono"}
            </span>
            <span>
              Mensajes cargados: <strong>{messages.length}</strong>
            </span>
            {conversationRangeLabel ? (
              <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-gray-500 shadow-sm dark:bg-gray-950 dark:text-gray-300">
                {conversationRangeLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto px-4 py-4 dark:bg-gray-900"
          style={{
            backgroundColor: "#fbf7ef",
            backgroundImage: `linear-gradient(rgba(251, 247, 239, 0.94), rgba(251, 247, 239, 0.94)), url("data:image/svg+xml,${CHAT_BACKGROUND_PATTERN}")`,
            backgroundRepeat: "repeat",
            backgroundSize: "240px 240px",
            backgroundAttachment: "local",
          }}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-950">
                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Cargando conversación...
                </span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700 shadow-sm dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                <p className="font-semibold">No se pudo cargar la conversación</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  No hay mensajes para este depósito
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  El historial se carga desde la tabla whatsapp_mensajes_log alimentada por n8n.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/85 px-4 py-3 text-xs text-gray-600 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/85 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  <span className="font-semibold">Historial cargado</span>
                  <span className="text-gray-500 dark:text-gray-400">({messages.length} mensajes)</span>
                </div>
                <div className="flex items-center gap-2">
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Cargando más...
                    </span>
                  ) : hasMoreHistory ? (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1 font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-gray-950 dark:text-emerald-300"
                    >
                      Cargar más
                    </button>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                      Historial completo
                    </span>
                  )}
                </div>
              </div>

              {timelineItems.map((item) => {
                if (item.type === "separator") {
                  return (
                    <div key={item.key} className="flex justify-center py-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-300">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                    </div>
                  );
                }

                const message = item.message;
                const isOutbound = String(message.direction || "").toLowerCase() === "outbound";
                const bubbleStyle = getMessageBubbleStyle(isOutbound ? "outbound" : "inbound");
                const imageKey = `${message.id || message.message_id || message.timestamp}-${message.direction || "message"}-image`;
                const isExpanded = expandedImageKey === imageKey;
                const attachmentKind = getAttachmentKind(message.attachmentType, message.attachmentUrl);
                const isImageAttachment = !!message.attachmentUrl && attachmentKind === "image";
                const replyTarget = message.replyToMessageId ? replyIndex.get(String(message.replyToMessageId)) : null;
                const replyPreviewRaw = (replyTarget?.content || replyTarget?.text || message.replyToText || "").trim();
                const replyPreview = replyPreviewRaw.length > 180 ? `${replyPreviewRaw.slice(0, 180)}...` : replyPreviewRaw;
                const hasReplyContext = Boolean(message.replyToMessageId || message.replyToText);
                const replyAuthorLabel = replyTarget
                  ? replyTarget.direction === "outbound"
                    ? "Tú"
                    : "Cliente"
                  : hasReplyContext
                    ? "Cliente"
                    : "Mensaje original";
                const messageText =
                  typeof message.content === "string" && message.content.trim() !== "[object Object]"
                    ? message.content
                    : "";
                const imageCaption = isImageAttachment
                  ? (message.caption || messageText || message.attachmentName || "").trim()
                  : "";
                const topText = isImageAttachment ? "" : messageText;

                return (
                  <div
                    key={item.key}
                    ref={(node) => {
                      if (node) {
                        messageNodeRefs.current.set(item.key, node);
                      } else {
                        messageNodeRefs.current.delete(item.key);
                      }
                    }}
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    style={{
                      contentVisibility: "auto",
                      containIntrinsicSize: "180px",
                    }}
                  >
                    <div
                      className={`relative max-w-[90%] rounded-2xl px-4 py-3 text-sm transition-all duration-200 ${
                        isExpanded ? "scale-[1.3] z-20" : ""
                      } ${bubbleStyle} ${
                        hasReplyContext ? "ring-1 ring-emerald-200/70 border-l-4 border-l-emerald-500" : ""
                      } ${
                        highlightedMessageKey === item.key ? "ring-2 ring-amber-400 border-amber-400 shadow-lg" : ""
                      }`}
                      style={
                        isOutbound
                          ? {
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,252,255,0.96) 100%)",
                              border: "1px solid rgba(148, 163, 184, 0.22)",
                              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
                            }
                          : {
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,248,251,0.98) 100%)",
                              border: "1px solid rgba(148, 163, 184, 0.18)",
                              boxShadow: "0 8px 22px rgba(15, 23, 42, 0.06)",
                            }
                      }
                    >
                      {isExpanded ? (
                        <button
                          type="button"
                          onClick={() => setExpandedImageKey(null)}
                          className="absolute right-2 top-2 z-10 rounded-full bg-black/70 p-1 text-white shadow-lg transition-colors hover:bg-black"
                          aria-label="Cerrar imagen"
                          title="Cerrar imagen"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}

                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            message.replyToMessageId
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {message.replyToMessageId ? <Reply className="h-3 w-3" /> : null}
                          {hasReplyContext ? "Respuesta" : isOutbound ? "Salida" : "Entrada"}
                        </span>
                        <span className="text-[10px] opacity-80">{formatDateTime(message.timestamp)}</span>
                      </div>

                      {hasReplyContext ? (
                        <button
                          type="button"
                          onClick={() => handleReplyReferenceClick(message.replyToMessageId)}
                          className="mt-2 w-full overflow-hidden rounded-xl border border-emerald-200 bg-white/95 text-left text-[11px] leading-4 text-emerald-950 shadow-sm transition-colors hover:bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-gray-950/80 dark:text-emerald-50 dark:hover:bg-gray-900/90"
                          title="Ir al mensaje al que responde"
                        >
                          <div className="flex items-center gap-1 border-b border-emerald-100 px-3 py-1.5 font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:border-emerald-900/40 dark:text-emerald-300">
                            <Reply className="h-3 w-3" />
                            <span>Respuesta a {replyAuthorLabel}</span>
                          </div>
                          <div className="px-3 py-2">
                            <p className="border-l-2 border-emerald-500 pl-2 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">
                              {replyPreview || "Mensaje original no cargado en este tramo del historial"}
                            </p>
                          </div>
                        </button>
                      ) : null}

                      {topText ? (
                        <p className="mt-2 whitespace-pre-wrap leading-6">{topText}</p>
                      ) : null}

                      {message.attachmentUrl && attachmentKind === "image" ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white/10 p-2">
                          <button
                            type="button"
                            onClick={() => setExpandedImageKey(isExpanded ? null : imageKey)}
                            className="block w-full text-left"
                            title={isExpanded ? "Reducir imagen" : "Ampliar imagen"}
                          >
                            <div className="flex justify-center">
                              <img
                                src={message.attachmentUrl}
                                alt={message.attachmentName || "Adjunto"}
                                className={`block h-auto max-w-full rounded-lg object-contain transition-all duration-200 ${
                                  isExpanded ? "max-h-[480px]" : "max-h-[360px]"
                                }`}
                                loading="lazy"
                              />
                            </div>
                          </button>
                          {imageCaption ? (
                            <div className="mt-2 space-y-1 px-1">
                              <p
                                className={`whitespace-pre-wrap text-sm font-medium leading-5 ${
                                  isOutbound ? "text-white/90" : "text-gray-800 dark:text-gray-100"
                                }`}
                              >
                                {imageCaption}
                              </p>
                              {message.attachmentName && message.attachmentName !== imageCaption ? (
                                <p
                                  className={`text-xs ${
                                    isOutbound ? "text-white/70" : "text-gray-600 dark:text-gray-300"
                                  }`}
                                >
                                  {message.attachmentName}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        renderAttachmentInline(message)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200/60 transition-transform hover:scale-105 hover:bg-emerald-700"
          aria-label="Ir al último mensaje"
          title="Ir al último mensaje"
        >
          <ChevronDown className="h-4 w-4" />
          Último mensaje
        </button>
      </motion.div>
    </div>
  );

  if (!isOpen) return null;

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export default ConversationModal;
