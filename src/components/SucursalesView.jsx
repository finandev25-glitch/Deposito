import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Building2,
  Search,
  Users,
  BarChart3,
  ChevronRight,
  Edit,
  Trash2,
  FileSpreadsheet,
  LayoutGrid,
  Table
} from 'lucide-react';
import { supabase } from '../supabaseClient.js';
import { AuthContext } from '../contexts/AuthContext.jsx';
import SucursalDetailModal from './SucursalDetailModal';
import CreateSucursalModal from './CreateSucursalModal';
import ToggleSwitch from './ToggleSwitch';
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx';
import ExcelImportModal from './ExcelImportModal.jsx';
import SucursalesTableView from './SucursalesTableView.jsx';

const SucursalesView = ({ sucursales, deposits, onAddSucursal, onUpdateSucursal, onDeleteSucursal, onAddPersonal, onRemovePersonal, onUpdatePersonal }) => {
  const { currentUser } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [sucursalToEdit, setSucursalToEdit] = useState(null);
  const [sucursalToDelete, setSucursalToDelete] = useState(null);
  const [personalCounts, setPersonalCounts] = useState({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const isSupabaseConnected = !!supabase;

  useEffect(() => {
    if (isSupabaseConnected) {
      const fetchPersonalData = async () => {
        const { data: personalData, error } = await supabase
          .from('sucursal_personal')
          .select('sucursal_id, estado');

        if (error) {
          console.error("Error fetching all personal data:", error);
          return;
        }

        const counts = personalData.reduce((acc, person) => {
          const id = person.sucursal_id;
          if (!acc[id]) {
            acc[id] = { total: 0, active: 0 };
          }
          acc[id].total++;
          if (person.estado === 'activo') {
            acc[id].active++;
          }
          return acc;
        }, {});

        setPersonalCounts(counts);
      };
      fetchPersonalData();
    }
  }, [sucursales, isSupabaseConnected, selectedSucursal]);

  const handleToggleSucursalStatus = (sucursal) => {
    const newStatus = sucursal.estado === 'activa' ? 'inactiva' : 'activa';
    onUpdateSucursal(sucursal.id, { estado: newStatus });
  };
  
  const handleOpenFormModal = (sucursal = null) => {
    setSucursalToEdit(sucursal);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setSucursalToEdit(null);
    setIsFormModalOpen(false);
  };

  const handleSaveSucursal = (data) => {
    if (sucursalToEdit) {
      onUpdateSucursal(sucursalToEdit.id, data);
    } else {
      onAddSucursal(data);
    }
    handleCloseFormModal();
  };

  const handleConfirmDelete = () => {
    if (sucursalToDelete) {
      // En lugar de eliminar, cambiamos el estado a 'inactiva'
      onUpdateSucursal(sucursalToDelete.id, { estado: 'inactiva' });
      setSucursalToDelete(null);
    }
  };

  const filteredSucursales = sucursales.filter(sucursal =>
    sucursal.estado === 'activa' &&
    (sucursal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sucursal.telefono && sucursal.telefono.includes(searchTerm)))
  );

  // Si la vista es tabla, renderizar el componente de tabla
  if (viewMode === 'table') {
    return (
      <>
        <div className="h-full flex flex-col">
          {/* Header con pestañas */}
          <div className="flex-shrink-0 p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Sucursales</h2>
                <p className="text-gray-600 dark:text-gray-400">Administra las sucursales activas y su personal.</p>
              </div>
            </div>

            {/* Pestañas de vista */}
            <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                  viewMode === 'cards'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <LayoutGrid size={16} />
                <span>Vista Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
                  viewMode === 'table'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Table size={16} />
                <span>Vista Tabla</span>
              </button>
            </div>
          </div>

          {/* Contenido de la tabla */}
          <div className="flex-1 min-h-0">
            <SucursalesTableView
              sucursales={sucursales}
            />
          </div>
        </div>
      </>
    );
  }

  // Vista de tarjetas (original)
  return (
    <>
      <div className="h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Sucursales</h2>
            <p className="text-gray-600 dark:text-gray-400">Administra las sucursales activas y su personal.</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet size={14} />
              <span>Importar desde Excel</span>
            </button>
            <button
              onClick={() => handleOpenFormModal()}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} />
              <span>Nueva Sucursal</span>
            </button>
          </div>
        </div>

        {/* Pestañas de vista */}
        <div className="flex items-center space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
              viewMode === 'cards'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Vista Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors ${
              viewMode === 'table'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Table size={16} />
            <span>Vista Tabla</span>
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por sucursal o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSucursales.map((sucursal) => {
            const counts = personalCounts[sucursal.id] || { total: 0, active: 0 };
            return (
              <motion.div
                key={sucursal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-blue-500/10 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Building2 size={17} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{sucursal.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                       <button onClick={() => handleOpenFormModal(sucursal)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <Edit size={12} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      {currentUser?.user_rol === 'admin' && (
                        <button onClick={() => setSucursalToDelete(sucursal)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" title="Desactivar Sucursal">
                          <Trash2 size={12} className="text-red-500 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <Users size={10} />
                          <span>Personal</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {counts.active} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ {counts.total}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <BarChart3 size={10} />
                          <span>Depósitos</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{sucursal.depositos_mes || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center" onClick={() => setSelectedSucursal(sucursal)}>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline flex items-center justify-center cursor-pointer">
                    Ver Detalles del Personal
                    <ChevronRight size={12} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
      <AnimatePresence>
        {selectedSucursal && (
          <SucursalDetailModal
            sucursal={selectedSucursal}
            onClose={() => setSelectedSucursal(null)}
            onAddPersonal={onAddPersonal}
            onRemovePersonal={onRemovePersonal}
            onUpdatePersonal={onUpdatePersonal}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isFormModalOpen && (
          <CreateSucursalModal
            onClose={handleCloseFormModal}
            onSave={handleSaveSucursal}
            sucursalToEdit={sucursalToEdit}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sucursalToDelete && (
          <DeleteConfirmationModal
            onClose={() => setSucursalToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Desactivar Sucursal"
            message={`¿Seguro que quieres desactivar la sucursal "${sucursalToDelete.nombre}"? No estará disponible para nuevas operaciones, pero los registros históricos se mantendrán.`}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isImportModalOpen && (
          <ExcelImportModal
            supabase={supabase}
            onClose={() => setIsImportModalOpen(false)}
            onImport={async (data) => {
              try {
                console.log('Iniciando importación masiva:', data);
                
                // Agrupar por sucursal
                const sucursalesMap = new Map();
                data.forEach(row => {
                  if (!sucursalesMap.has(row.sucursal)) {
                    sucursalesMap.set(row.sucursal, []);
                  }
                  sucursalesMap.get(row.sucursal).push(row);
                });

                let successCount = 0;
                let errorCount = 0;

                // Procesar cada sucursal
                for (const [sucursalNombre, workers] of sucursalesMap.entries()) {
                  console.log(`Procesando sucursal: ${sucursalNombre} con ${workers.length} trabajadores`);
                  try {
                    // Buscar si la sucursal ya existe
                    const { data: existingSucursales, error: searchError } = await supabase
                      .from('sucursales')
                      .select('id')
                      .eq('nombre', sucursalNombre)
                      .maybeSingle();

                    if (searchError) {
                      console.error(`Error buscando sucursal ${sucursalNombre}:`, searchError);
                      errorCount += workers.length;
                      continue;
                    }

                    let sucursalId;

                    if (existingSucursales) {
                      sucursalId = existingSucursales.id;
                      console.log(`Sucursal "${sucursalNombre}" ya existe, ID: ${sucursalId}`);
                    } else {
                      // Crear nueva sucursal
                      console.log(`Creando sucursal "${sucursalNombre}"...`);
                      const { data: newSucursal, error: sucursalError } = await supabase
                        .from('sucursales')
                        .insert({
                          nombre: sucursalNombre,
                          estado: 'activa'
                        })
                        .select()
                        .single();

                      if (sucursalError) {
                         console.error(`Error creando sucursal ${sucursalNombre}:`, sucursalError);
                         errorCount += workers.length;
                         continue;
                      }
                      sucursalId = newSucursal.id;
                      console.log(`Sucursal "${sucursalNombre}" creada, ID: ${sucursalId}`);
                    }

                    // Procesar trabajadores para esta sucursal
                    for (const worker of workers) {
                      try {
                        const tipo = worker.tipo?.toUpperCase();
                        console.log(`Procesando trabajador: ${worker.nombreTrabajador}, Acción: ${tipo}`);

                        if (tipo === 'ELIMINAR') {
                          // Buscar y cambiar a inactivo
                          const { data: existingWorker, error: searchError } = await supabase
                            .from('sucursal_personal')
                            .select('id')
                            .eq('nombre', worker.nombreTrabajador)
                            .eq('telefono_origen', worker.telefono)
                            .maybeSingle();

                          if (searchError) {
                            console.error(`Error buscando trabajador "${worker.nombreTrabajador}":`, searchError);
                            errorCount++;
                            continue;
                          }

                          if (!existingWorker) {
                            console.warn(`Trabajador "${worker.nombreTrabajador}" no encontrado para eliminar`);
                            errorCount++;
                            continue;
                          }

                          // Cambiar estado a inactivo
                          const { error: updateError } = await supabase
                            .from('sucursal_personal')
                            .update({ estado: 'inactivo' })
                            .eq('id', existingWorker.id);

                          if (updateError) {
                            console.error(`Error desactivando trabajador "${worker.nombreTrabajador}":`, updateError);
                            errorCount++;
                          } else {
                            console.log(`Trabajador "${worker.nombreTrabajador}" desactivado`);
                            successCount++;
                          }
                        } else {
                          // AGREGAR: Verificar si el teléfono ya está registrado en otra sucursal
                          const { data: existingByPhone, error: phoneSearchError } = await supabase
                            .from('sucursal_personal')
                            .select('id, estado, sucursal_id, nombre')
                            .eq('telefono_origen', worker.telefono)
                            .maybeSingle();

                          if (phoneSearchError) {
                            console.error(`Error buscando teléfono "${worker.telefono}":`, phoneSearchError);
                            errorCount++;
                            continue;
                          }

                          // Si el teléfono ya existe en una sucursal diferente, rechazar
                          if (existingByPhone && existingByPhone.sucursal_id !== sucursalId) {
                            console.error(`Error: El teléfono ${worker.telefono} ya está registrado en otra sucursal (Trabajador: ${existingByPhone.nombre})`);
                            errorCount++;
                            continue;
                          }

                          // Verificar si existe con el mismo nombre y teléfono
                          const { data: existingWorker, error: searchError } = await supabase
                            .from('sucursal_personal')
                            .select('id, estado')
                            .eq('nombre', worker.nombreTrabajador)
                            .eq('telefono_origen', worker.telefono)
                            .maybeSingle();

                          if (searchError) {
                            console.error(`Error buscando duplicado "${worker.nombreTrabajador}":`, searchError);
                            errorCount++;
                            continue;
                          }

                          if (existingWorker) {
                            // Si existe y está inactivo, reactivarlo
                            if (existingWorker.estado === 'inactivo') {
                              const { error: updateError } = await supabase
                                .from('sucursal_personal')
                                .update({
                                  estado: 'activo'
                                })
                                .eq('id', existingWorker.id);

                              if (updateError) {
                                console.error(`Error reactivando trabajador "${worker.nombreTrabajador}":`, updateError);
                                errorCount++;
                              } else {
                                console.log(`Trabajador "${worker.nombreTrabajador}" reactivado`);
                                successCount++;
                              }
                            } else {
                              // Ya existe y está activo, omitir
                              console.warn(`Trabajador "${worker.nombreTrabajador}" ya existe y está activo, omitiendo`);
                              errorCount++;
                            }
                            continue;
                          }

                          // Insertar nuevo trabajador
                          const { error: personalError } = await supabase
                            .from('sucursal_personal')
                            .insert({
                              sucursal_id: sucursalId,
                              nombre: worker.nombreTrabajador,
                              telefono_origen: worker.telefono,
                              empresa: worker.empresa?.trim() || null,
                              estado: 'activo',
                              tipo_registro: 'importado'
                            });

                          if (personalError) {
                            console.error(`Error creando trabajador "${worker.nombreTrabajador}":`, personalError);
                            errorCount++;
                          } else {
                            console.log(`Trabajador "${worker.nombreTrabajador}" creado`);
                            successCount++;
                          }
                        }
                      } catch (err) {
                        console.error(`Error procesando trabajador:`, err);
                        errorCount++;
                      }
                    }
                  } catch (err) {
                    console.error(`Error procesando sucursal "${sucursalNombre}":`, err);
                    errorCount += workers.length;
                  }
                }

                console.log('Importación finalizada. Resumen:', { successCount, errorCount });
                
                alert(`Importación completada:\n✓ ${successCount} trabajadores importados\n✗ ${errorCount} errores\n\nLa página se recargará para mostrar los cambios.`);
                window.location.reload();
              } catch (error) {
                console.error('Error en importación masiva:', error);
                alert('Hubo un error durante la importación. Por favor, revisa la consola.');
              } finally {
                setIsImportModalOpen(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SucursalesView;
