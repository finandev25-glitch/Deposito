import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, Landmark } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import BancoModal from './BancoModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const GestionBancosView = ({ bancos, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanco, setEditingBanco] = useState(null);
  const [deletingBanco, setDeletingBanco] = useState(null);

  const handleOpenModal = (banco = null) => {
    setEditingBanco(banco);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBanco(null);
  };

  const handleSave = (bancoData) => {
    if (editingBanco) {
      onUpdate({ ...editingBanco, ...bancoData });
    } else {
      onAdd(bancoData);
    }
    handleCloseModal();
  };

  const handleToggleStatus = (banco) => {
    onUpdate({ ...banco, estado: banco.estado === 'activo' ? 'inactivo' : 'activo' });
  };

  const openDeleteConfirm = (banco) => {
    setDeletingBanco(banco);
  };

  const closeDeleteConfirm = () => {
    setDeletingBanco(null);
  };

  const handleDelete = () => {
    if (deletingBanco) {
      onDelete(deletingBanco.id);
      closeDeleteConfirm();
    }
  };

  const filteredBancos = bancos.filter(banco =>
    banco.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    banco.abreviatura.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Bancos</h2>
            <p className="text-gray-600 dark:text-gray-400">Administra los bancos del sistema.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            <span>Nuevo Banco</span>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Banco</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Abreviatura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredBancos.map((banco) => (
                    <motion.tr
                      key={banco.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md mr-3">
                            <Landmark size={14} className="text-gray-600 dark:text-gray-300" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{banco.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">{banco.abreviatura}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ToggleSwitch checked={banco.estado === 'activo'} onChange={() => handleToggleStatus(banco)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button onClick={() => handleOpenModal(banco)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Edit size={12} className="text-gray-600 dark:text-gray-300" /></button>
                          <button onClick={() => openDeleteConfirm(banco)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><Trash2 size={12} className="text-rose-600 dark:text-rose-400" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {filteredBancos.length === 0 && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    No se encontraron bancos.
                </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isModalOpen && (
          <BancoModal
            onClose={handleCloseModal}
            onSave={handleSave}
            bancoToEdit={editingBanco}
            existingBancos={bancos}
          />
        )}
      </AnimatePresence>
       <AnimatePresence>
        {deletingBanco && (
          <DeleteConfirmationModal
            onClose={closeDeleteConfirm}
            onConfirm={handleDelete}
            title="Confirmar Eliminación"
            message={`¿Estás seguro de que quieres eliminar el banco "${deletingBanco.nombre}"? Esta acción no se puede deshacer.`}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default GestionBancosView;
