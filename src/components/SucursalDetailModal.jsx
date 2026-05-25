import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Plus, Loader2, Phone } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { apiGet } from '../services/backendApi.js';
import ToggleSwitch from './ToggleSwitch';
import AddPersonModal from './AddPersonModal.jsx';


const SucursalDetailModal = ({ sucursal, onClose, onAddPersonal, onRemovePersonal, onUpdatePersonal }) => {
  const { currentUser } = useContext(AuthContext);
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [personal, setPersonal] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(true);

  const isBackendConnected = !!currentUser;

  const fetchPersonal = async () => {
    if (!isBackendConnected || !sucursal) {
        setPersonal(sucursal?.personal || []);
        setLoadingPersonal(false);
        return;
    };
    
    setLoadingPersonal(true);
    try {
      const response = await apiGet('/dashboard/bootstrap');
      const personalData = (response.personal || []).filter((p) => p.sucursal_id === sucursal.id);
      setPersonal(personalData);
    } catch (error) {
      console.error("Error fetching personal:", error);
    }
    setLoadingPersonal(false);
  };

  useEffect(() => {
    fetchPersonal();
  }, [sucursal, isBackendConnected]);

  const handleTogglePersonaStatus = (personaId, currentStatus) => {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    onUpdatePersonal(personaId, { estado: newStatus });
    setPersonal(prev => prev.map(p => p.id === personaId ? { ...p, estado: newStatus } : p));
  };

  const handleAddPerson = async (newPersonData) => {
    // Pass the complete object to onAddPersonal
    const newPerson = await onAddPersonal(sucursal.id, newPersonData);
    
    // Always refresh the list from the database to ensure consistency
    await fetchPersonal();
    
    setIsAddPersonModalOpen(false);
  };



  const getUserInitials = (name) => {
    if (!name || typeof name !== 'string') return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{sucursal.nombre}</h2>
                <p className="text-sm text-gray-500">Detalles del Personal</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Personal Asociado</h3>
              <button 
                onClick={() => setIsAddPersonModalOpen(true)}
                disabled={!isBackendConnected}
                className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <Plus size={10} />
                <span>Añadir Personal</span>
              </button>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personal</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loadingPersonal ? (
                    <tr>
                      <td colSpan="4" className="text-center p-8">
                        <Loader2 className="animate-spin inline-block" />
                      </td>
                    </tr>
                  ) : personal.map(persona => (
                    <tr key={persona.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                              {getUserInitials(persona.nombre)}
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{persona.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {persona.empresa || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone size={14} className="mr-2 text-gray-400" />
                          <span>{persona.telefono_origen || 'No especificado'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ToggleSwitch
                          key={`${persona.id}-${persona.estado}`}
                          checked={persona.estado === 'activo'}
                          onChange={() => handleTogglePersonaStatus(persona.id, persona.estado)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
             {!isBackendConnected && <p className="text-center text-sm text-gray-500 mt-4">La gestión de personal está desactivada en modo simulado.</p>}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50/50 rounded-b-xl flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium text-sm"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {isAddPersonModalOpen && (
          <AddPersonModal 
            onClose={() => setIsAddPersonModalOpen(false)}
            onSave={handleAddPerson}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SucursalDetailModal;
