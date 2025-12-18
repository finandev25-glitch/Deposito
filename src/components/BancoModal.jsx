import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Landmark, Type } from 'lucide-react';

const BancoModal = ({ onClose, onSave, bancoToEdit, existingBancos }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    abreviatura: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (bancoToEdit) {
      setFormData({
        nombre: bancoToEdit.nombre,
        abreviatura: bancoToEdit.abreviatura
      });
    }
  }, [bancoToEdit]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'abreviatura') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.abreviatura.trim()) {
      setError('Ambos campos son obligatorios.');
      return;
    }

    const isDuplicate = existingBancos.some(b => 
        b.abreviatura === formData.abreviatura && b.id !== bancoToEdit?.id
    );

    if (isDuplicate) {
        setError('La abreviatura ya existe. Debe ser única.');
        return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white rounded-xl w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">
            {bancoToEdit ? 'Editar Banco' : 'Crear Nuevo Banco'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del Banco</label>
              <div className="relative">
                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Banco de Crédito del Perú"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label htmlFor="abreviatura" className="block text-sm font-medium text-gray-700 mb-1.5">Abreviatura (Única)</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="abreviatura"
                  name="abreviatura"
                  value={formData.abreviatura}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="Ej: BCP"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
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
              Guardar Banco
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default BancoModal;
