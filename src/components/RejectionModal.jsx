import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, MessageSquareWarning, Loader2 } from "lucide-react";

const RejectionModal = ({ onClose, onConfirm, initialReason = "" }) => {
  const [reason, setReason] = useState(initialReason);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return; // Evitar múltiples clics

    if (!reason.trim()) {
      setError("El motivo del rechazo es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
    } catch (error) {
      console.error("Error al rechazar:", error);
      setError("Error al procesar el rechazo. Inténtelo de nuevo.");
      setIsSubmitting(false);
    }
    // El setIsSubmitting(false) se maneja en el componente padre
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white rounded-xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            Rechazar Depósito
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <label
            htmlFor="rejection-reason"
            className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"
          >
            <MessageSquareWarning className="mr-2 h-5 w-5 text-yellow-500" />
            Motivo del Rechazo
          </label>
          <textarea
            id="rejection-reason"
            rows="3"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError("");
            }}
            disabled={isSubmitting}
            className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Ej: El monto no coincide, voucher ilegible..."
            autoFocus
          ></textarea>
          {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2 bg-gray-50/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin h-4 w-4" />
                <span>Procesando...</span>
              </>
            ) : (
              <span>Confirmar Rechazo</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RejectionModal;
