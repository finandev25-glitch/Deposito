import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Building, CreditCard, Hash, BookOpen } from 'lucide-react';

const CreateCuentaModal = ({ onClose, onSave, empresas, bancos, cuentaToEdit }) => {
  const [formData, setFormData] = useState({
    empresa_id: '',
    banco_id: '',
    anexo: '',
    nro_cuenta: '',
    subdiario: ''
  });
  const [error, setError] = useState('');

  const activeEmpresas = empresas.filter(e => e.estado === 'activo');
  const activeBancos = bancos.filter(b => b.estado === 'activo');

  useEffect(() => {
    if (cuentaToEdit) {
      setFormData({
        empresa_id: cuentaToEdit.empresa?.id || '',
        banco_id: cuentaToEdit.banco?.id || '',
        anexo: cuentaToEdit.anexo || '',
        nro_cuenta: cuentaToEdit.nro_cuenta || '',
        subdiario: cuentaToEdit.subdiario || ''
      });
    } else {
      // Set defaults for new account
      setFormData(prev => ({
        ...prev,
        empresa_id: activeEmpresas[0]?.id || '',
        banco_id: activeBancos[0]?.id || ''
      }));
    }
  }, [cuentaToEdit, empresas, bancos]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.empresa_id || !formData.banco_id || !formData.nro_cuenta.trim()) {
      setError('Los campos Empresa, Banco y Nro. de Cuenta son obligatorios.');
      return;
    }
    setError('');
    
    const dataToSave = {
      empresa_id: formData.empresa_id,
      banco_id: formData.banco_id,
      anexo: formData.anexo,
      nro_cuenta: formData.nro_cuenta,
      subdiario: formData.subdiario,
    };

    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{cuentaToEdit ? 'Editar Cuenta Bancaria' : 'Crear Nueva Cuenta'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Empresa</label>
              <select
                id="empresa_id"
                name="empresa_id"
                value={formData.empresa_id}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                {activeEmpresas.map(empresa => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="banco_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Banco</label>
               <select
                id="banco_id"
                name="banco_id"
                value={formData.banco_id}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono"
              >
                {activeBancos.map(banco => (
                  <option key={banco.id} value={banco.id}>{banco.abreviatura}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="anexo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Anexo</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="anexo"
                  name="anexo"
                  value={formData.anexo}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Ej: ANX01"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="nro_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Número de Cuenta</label>
              <div className="relative">
                <input
                  type="text"
                  id="nro_cuenta"
                  name="nro_cuenta"
                  value={formData.nro_cuenta}
                  onChange={handleChange}
                  className="w-full px-4 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 font-mono"
                  placeholder="000-0000000-0-00"
                />
              </div>
            </div>
            <div>
              <label htmlFor="subdiario" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subdiario</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="subdiario"
                  name="subdiario"
                  value={formData.subdiario}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder="Ej: 104101"
                />
              </div>
            </div>
            {error && <p className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
            >
              Guardar Cuenta
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateCuentaModal;
