import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Building } from 'lucide-react';

const CreateEmpresaModal = ({ onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la empresa es obligatorio.');
      return;
    }
    onSave(nombre.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Crear Nueva Empresa</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="nombre-empresa" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="nombre-empresa"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Transportes Delta S.A."
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
          <div className="p-5 border-t border-gray-200 flex items-center justify-end space-x-3 bg-gray-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Guardar Empresa
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateEmpresaModal;
