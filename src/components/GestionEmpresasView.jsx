import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Building } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import EmpresaModal from './EmpresaModal';

const GestionEmpresasView = ({ empresas, onAdd, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null);

  const handleOpenModal = (empresa = null) => {
    setEditingEmpresa(empresa);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmpresa(null);
  };

  const handleSave = async (empresaData) => {
    if (editingEmpresa) {
      return onUpdate(editingEmpresa.id, empresaData);
    } else {
      return onAdd(empresaData);
    }
  };

  const handleToggleStatus = (empresa) => {
    onUpdate(empresa.id, { estado: empresa.estado === 'activo' ? 'inactivo' : 'activo' });
  };

  const filteredEmpresas = empresas.filter(empresa =>
    (empresa.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (empresa.abreviatura || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Empresas</h2>
            <p className="text-gray-600 dark:text-gray-400">Administra las empresas del grupo.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Nueva Empresa</span>
          </button>
        </div>

        <div className="mb-6 max-w-lg">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o abreviatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre de la Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Abreviatura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredEmpresas.map((empresa) => (
                    <motion.tr
                      key={empresa.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md mr-3">
                            <Building size={14} className="text-gray-600 dark:text-gray-300" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{empresa.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">{empresa.abreviatura}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ToggleSwitch checked={empresa.estado === 'activo'} onChange={() => handleToggleStatus(empresa)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleOpenModal(empresa)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Edit size={12} className="text-gray-600 dark:text-gray-300" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredEmpresas.length === 0 && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    No se encontraron empresas.
                </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isModalOpen && (
          <EmpresaModal
            onClose={handleCloseModal}
            onSave={handleSave}
            empresaToEdit={editingEmpresa}
            existingEmpresas={empresas}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default GestionEmpresasView;
