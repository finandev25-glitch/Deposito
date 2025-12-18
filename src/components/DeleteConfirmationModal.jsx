import React from 'react';
import { motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const DeleteConfirmationModal = ({ onClose, onConfirm, title, message }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="mx-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-1">
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2 bg-gray-50/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm"
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeleteConfirmationModal;
