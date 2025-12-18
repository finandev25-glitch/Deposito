import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Building2, Phone } from 'lucide-react';

const AddPersonModal = ({ onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    onSave({ nombre, telefono, empresa });
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
          <h2 className="text-base font-bold text-gray-900">Añadir Personal</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <label htmlFor="nombre-persona" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del Contacto</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="nombre-persona"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Juan Pérez"
                autoFocus
              />
            </div>

            <div className="mt-4">
              <label htmlFor="telefono-persona" className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  id="telefono-persona"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 987654321"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label htmlFor="empresa-persona" className="block text-sm font-medium text-gray-700 mb-1.5">Empresa (Opcional)</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="empresa-persona"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Mi Empresa S.A.C."
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
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
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
            >
              Añadir
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddPersonModal;
