import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink, Calendar, Hash, CreditCard, User } from "lucide-react";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function normalizeVoucherUrl(url) {
  if (!url) return "";
  if (url.includes("drive.google.com/file/d/")) {
    const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  return url;
}

function isPdfUrl(url) {
  return String(url || "").toLowerCase().includes(".pdf");
}

function isImageUrl(url) {
  const value = String(url || "").toLowerCase();
  return (
    value.includes(".png") ||
    value.includes(".jpg") ||
    value.includes(".jpeg") ||
    value.includes(".webp") ||
    value.includes(".gif")
  );
}

function FieldCard({ icon: Icon, label, value, forceLight = false }) {
  return (
    <div
      className={`rounded-xl border p-3 shadow-sm ${
        forceLight
          ? "border-gray-200 bg-gray-50 shadow-slate-200/40"
          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80 dark:shadow-black/20"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
          forceLight ? "text-gray-500" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div
        className={`mt-2 text-sm font-medium ${
          forceLight ? "text-gray-900" : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

export default function VoucherExtensionPanel({
  isOpen,
  voucherUrl,
  depositData,
  onClose,
  forceLight = false,
}) {
  const normalizedVoucherUrl = normalizeVoucherUrl(voucherUrl);
  const canPreview = !!normalizedVoucherUrl;
  const useIframe = canPreview && (isPdfUrl(normalizedVoucherUrl) || !isImageUrl(normalizedVoucherUrl));
  const operationValue = depositData?.numero_operacion_solicitante || depositData?.numero_operacion || "-";
  const rejectedObservationText = [
    String(depositData?.observaciones || "").trim(),
    String(depositData?.motivo_rechazo || "").trim(),
  ].filter(Boolean);

  const panelTheme = forceLight
    ? "border-gray-200 bg-white text-gray-900"
    : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white";

  const headerBorder = forceLight ? "border-gray-200" : "border-gray-200 dark:border-gray-800";
  const bodyTextMuted = forceLight ? "text-gray-500" : "text-gray-500 dark:text-gray-400";
  const closeButtonClass = forceLight
    ? "rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
    : "rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-0 z-[90] ${forceLight ? "bg-black/20" : "bg-black/45"}`}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: 1400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 1400, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`fixed right-0 top-0 z-[100] flex h-full w-full max-w-none flex-col border-l shadow-2xl ${panelTheme}`}
            style={{ width: "min(100vw, 1400px)" }}
          >
            <div className={`flex items-start justify-between border-b px-5 py-4 ${headerBorder}`}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Panel lateral
                </p>
                <h2 className="mt-1 text-xl font-bold">Voucher del deposito</h2>
                <p className={`mt-1 text-sm ${bodyTextMuted}`}>
                  Vista rapida del comprobante y los datos clave del solicitante.
                </p>
              </div>

              <button
                onClick={onClose}
                className={closeButtonClass}
                title="Cerrar panel"
                aria-label="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Comprobante
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {depositData?.cliente || "Sin cliente"}
                      </p>
                    </div>

                    {normalizedVoucherUrl && (
                      <a
                        href={normalizedVoucherUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </a>
                    )}
                  </div>

                  <div className="flex min-h-[520px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
                    {!normalizedVoucherUrl ? (
                      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No hay voucher disponible.
                      </div>
                    ) : useIframe ? (
                      <iframe
                        src={`${normalizedVoucherUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                        title="Voucher lateral"
                        className="h-[520px] w-full border-0"
                      />
                    ) : (
                      <img
                        src={normalizedVoucherUrl}
                        alt="Voucher del deposito"
                        className="max-h-[520px] w-full object-contain"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Datos principales
                    </p>
                    <div className="mt-4 grid gap-3">
                      <FieldCard
                        icon={Calendar}
                        label="Fecha deposito"
                        value={formatDate(depositData?.fecha_deposito)}
                        forceLight={forceLight}
                      />
                      <FieldCard
                        icon={Hash}
                        label="Nro. operacion solicitante"
                        value={operationValue}
                        forceLight={forceLight}
                      />
                      <FieldCard
                        icon={CreditCard}
                        label="Moneda"
                        value={depositData?.moneda || "-"}
                        forceLight={forceLight}
                      />
                      <FieldCard
                        icon={User}
                        label="Cliente"
                        value={depositData?.cliente || "-"}
                        forceLight={forceLight}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Resumen
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Nro. operacion</span>
                        <span className="font-medium">{operationValue}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Estado</span>
                        <span className="font-medium">{depositData?.estado || "-"}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Sucursal</span>
                        <span className="font-medium text-right">{depositData?.sucursal || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {depositData?.estado === "rechazado" && rejectedObservationText.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/25 dark:text-red-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300">
                        Observacion del rechazo
                      </p>
                      <div className="mt-2 space-y-1 whitespace-pre-line break-words">
                        {rejectedObservationText.map((text, index) => (
                          <div key={`${text}-${index}`}>{text}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
