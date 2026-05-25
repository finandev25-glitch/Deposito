import React, { useEffect, useMemo, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
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
  Table,
  AlertTriangle,
  Calendar,
  Download
} from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { apiGet, apiPost } from '../services/backendApi.js';
import SucursalDetailModal from './SucursalDetailModal';
import CreateSucursalModal from './CreateSucursalModal';
import DeleteConfirmationModal from './DeleteConfirmationModal.jsx';
import ExcelImportModal from './ExcelImportModal.jsx';
import SucursalesTableView from './SucursalesTableView.jsx';

const SucursalesView = ({
  sucursales = [],
  onAddSucursal,
  onUpdateSucursal,
  onAddPersonal,
  onRemovePersonal,
  onUpdatePersonal
}) => {
  const { currentUser } = useContext(AuthContext);
  const [viewMode, setViewMode] = useState('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSucursal, setSelectedSucursal] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [sucursalToEdit, setSucursalToEdit] = useState(null);
  const [sucursalToDelete, setSucursalToDelete] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [personalCounts, setPersonalCounts] = useState({});
  const [activityPeriod, setActivityPeriod] = useState('month');
  const [activityYear, setActivityYear] = useState(String(new Date().getFullYear()));
  const [activityMonth, setActivityMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [activityData, setActivityData] = useState([]);
  const [lowActivityData, setLowActivityData] = useState([]);
  const [activityPanel, setActivityPanel] = useState('sin');
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');

  const monthOptions = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];
  const yearOptions = Array.from({ length: 7 }, (_, index) => {
    const year = new Date().getFullYear() - 3 + index;
    return String(year);
  });

  useEffect(() => {
    let active = true;

    const loadBootstrap = async () => {
      try {
        const response = await apiGet('/dashboard/bootstrap');
        if (!active) return;

        const counts = (response.personal || []).reduce((acc, person) => {
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
      } catch (error) {
        console.error('Error cargando bootstrap de sucursales:', error);
        if (active) setPersonalCounts({});
      }
    };

    loadBootstrap();
    return () => {
      active = false;
    };
  }, []);

  const resolvedActivityPeriod = useMemo(() => {
    if (activityPeriod === 'specific-month') {
      return `month:${activityYear}-${activityMonth}`;
    }

    if (activityPeriod === 'month') {
      const now = new Date();
      return `month:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    return activityPeriod;
  }, [activityPeriod, activityYear, activityMonth]);

  useEffect(() => {
    let active = true;

    const loadActivity = async () => {
      setActivityLoading(true);
      setActivityError('');

      try {
        const response = await apiGet(`/sucursales/activity?period=${encodeURIComponent(resolvedActivityPeriod)}`);
        if (!active) return;

        setActivityData(response.data || []);
        setLowActivityData(response.menosDe10Depositos || []);
      } catch (error) {
        console.error('Error cargando actividad de sucursales:', error);
        if (active) {
          setActivityError(error.message || 'No se pudo cargar la actividad de sucursales');
          setActivityData([]);
          setLowActivityData([]);
        }
      } finally {
        if (active) setActivityLoading(false);
      }
    };

    loadActivity();
    return () => {
      active = false;
    };
  }, [resolvedActivityPeriod]);

  const filteredSucursales = useMemo(() => {
    return sucursales.filter(
      (sucursal) =>
        sucursal.estado === 'activa' &&
        (sucursal.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sucursal.telefono && sucursal.telefono.includes(searchTerm)))
    );
  }, [sucursales, searchTerm]);

  const sinDepositos = useMemo(
    () => activityData.filter((sucursal) => Number(sucursal.total_depositos || 0) === 0),
    [activityData]
  );

  const menosDe10Depositos = useMemo(
    () => lowActivityData.filter((sucursal) => Number(sucursal.total_depositos || 0) < 10),
    [lowActivityData]
  );

  const lowActivityByCount = useMemo(() => {
    return [...menosDe10Depositos].sort((a, b) => {
      const diff = Number(a.total_depositos || 0) - Number(b.total_depositos || 0);
      if (diff !== 0) return diff;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''));
    });
  }, [menosDe10Depositos]);

  const depositsBySucursal = useMemo(() => {
    return activityData.reduce((acc, sucursal) => {
      acc[String(sucursal.id)] = Number(sucursal.total_depositos || 0);
      return acc;
    }, {});
  }, [activityData]);

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
      onUpdateSucursal(sucursalToDelete.id, { estado: 'inactiva' });
      setSucursalToDelete(null);
    }
  };

  const handleImportWorkers = async (rows) => {
    const response = await apiPost('/sucursales/import-workers', { rows });
    const successCount = response?.data?.successCount || 0;
    const errorCount = response?.data?.errorCount || 0;
    alert(`Importación completada:\n✓ ${successCount} trabajadores importados\n✗ ${errorCount} errores\n\nLa página se recargará para mostrar los cambios.`);
    window.location.reload();
  };

  const handleExportLowActivityExcel = () => {
    if (lowActivityByCount.length === 0) {
      alert('No hay sucursales para exportar en la vista de baja actividad.');
      return;
    }

    const dataToExport = lowActivityByCount.map((sucursal) => {
      const counts = personalCounts[sucursal.id] || { total: 0, active: 0 };

      return {
        Sucursal: sucursal.nombre || '-',
        Teléfono: sucursal.telefono || '-',
        Estado: sucursal.estado === 'activa' ? 'Activa' : 'Inactiva',
        'Depósitos del mes': Number(sucursal.total_depositos || 0),
        'Personal activo': counts.active || 0,
        'Personal total': counts.total || 0,
        'Último depósito': sucursal.ultimo_deposito
          ? new Date(sucursal.ultimo_deposito).toLocaleString('es-ES')
          : '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Baja Actividad');
    XLSX.writeFile(workbook, 'sucursales_baja_actividad.xlsx');
  };

  if (viewMode === 'table') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 p-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Sucursales</h2>
              <p className="text-gray-600 dark:text-gray-400">Administra las sucursales activas y su personal.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setViewMode('cards')} className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <LayoutGrid size={16} />
              <span>Vista Tarjetas</span>
            </button>
            <button onClick={() => setViewMode('low-activity')} className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <AlertTriangle size={16} />
              <span>Baja Actividad</span>
            </button>
            <button onClick={() => setViewMode('table')} className="flex items-center space-x-2 px-4 py-2 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400">
              <Table size={16} />
              <span>Vista Tabla</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <SucursalesTableView sucursales={sucursales} />
        </div>
      </div>
    );
  }

  if (viewMode === 'low-activity') {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestión de Sucursales</h2>
            <p className="text-gray-600 dark:text-gray-400">Ranking de sucursales con menos depósitos en el período seleccionado.</p>
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
            <button
              onClick={handleExportLowActivityExcel}
              className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Download size={14} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('cards')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <LayoutGrid size={16} />
            <span>Vista Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('low-activity')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            <AlertTriangle size={16} />
            <span>Baja Actividad</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Table size={16} />
            <span>Vista Tabla</span>
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
                <AlertTriangle size={16} />
                <span>Sucursales con menos de 10 depósitos</span>
              </div>
              <p className="text-sm text-amber-700/80 dark:text-amber-200/80 mt-1">
                Ordenadas desde la menor cantidad de depósitos hacia arriba.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={activityPeriod}
                onChange={(e) => setActivityPeriod(e.target.value)}
                className="border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="today">Hoy</option>
                <option value="week">Semana actual</option>
                <option value="month">Mes actual</option>
                <option value="specific-month">Mes específico</option>
                <option value="all">Todos los períodos</option>
              </select>

              {activityPeriod === 'specific-month' && (
                <>
                  <select
                    value={activityYear}
                    onChange={(e) => setActivityYear(e.target.value)}
                    className="border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={activityMonth}
                    onChange={(e) => setActivityMonth(e.target.value)}
                    className="border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Activas evaluadas</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none mt-0.5">
                {activityLoading ? '...' : activityData.length}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sin depósitos</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 leading-none mt-0.5">
                {activityLoading ? '...' : sinDepositos.length}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Con depósitos</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                {activityLoading ? '...' : Math.max(activityData.length - sinDepositos.length, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Menos de 10</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                {activityLoading ? '...' : lowActivityByCount.length}
              </p>
            </div>
          </div>

          {activityError && (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300">{activityError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {lowActivityByCount.map((sucursal) => {
            const counts = personalCounts[sucursal.id] || { total: 0, active: 0 };
            const depositsCount = depositsBySucursal[String(sucursal.id)] ?? 0;

            return (
              <motion.div
                key={sucursal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-900/50 p-3.5 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-amber-500/10 hover:border-amber-400 dark:hover:border-amber-600 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2.5 gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                        <Building2 size={15} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[13px] leading-tight">
                          {sucursal.nombre}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleOpenFormModal(sucursal)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <Edit size={11} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      {currentUser?.user_rol === 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleSucursalStatus(sucursal)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                              sucursal.estado === 'activa'
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                            }`}
                            title={sucursal.estado === 'activa' ? 'Desactivar sucursal' : 'Activar sucursal'}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                                sucursal.estado === 'activa' ? 'translate-x-3' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => setSucursalToDelete(sucursal)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                            title="Eliminar sucursal"
                          >
                            <Trash2 size={11} className="text-red-500 dark:text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                          <Users size={9} />
                          <span>Personal</span>
                        </div>
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-none">
                          {counts.active} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/ {counts.total}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                          <BarChart3 size={9} />
                          <span>Depósitos del mes</span>
                        </div>
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-none">
                          {activityLoading ? '...' : depositsCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSucursal(sucursal)}
                  className="mt-2.5 w-full text-center"
                >
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 group-hover:underline flex items-center justify-center cursor-pointer">
                    Ver Detalles del Personal
                    <ChevronRight size={11} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>

                <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
                  Estado: {sucursal.estado === 'activa' ? 'Activa' : 'Inactiva'}
                </div>
              </motion.div>
            );
          })}
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
              onClose={() => setIsImportModalOpen(false)}
              onImport={handleImportWorkers}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

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

        <div className="flex items-center space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('cards')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
          >
            <LayoutGrid size={16} />
            <span>Vista Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('low-activity')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <AlertTriangle size={16} />
            <span>Baja Actividad</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="flex items-center space-x-2 px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Table size={16} />
            <span>Vista Tabla</span>
          </button>
        </div>

        {false && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-semibold">
                <AlertTriangle size={16} />
                <span>Sucursales sin depósitos</span>
              </div>
              <p className="text-sm text-red-700/80 dark:text-red-200/80 mt-1">
                Identifica qué tienda o agencia no está enviando depósitos en el período seleccionado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={activityPeriod}
                onChange={(e) => setActivityPeriod(e.target.value)}
                className="border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="today">Hoy</option>
                <option value="week">Semana actual</option>
                <option value="month">Mes actual</option>
                <option value="specific-month">Mes específico</option>
                <option value="all">Todos los períodos</option>
              </select>

              {activityPeriod === 'specific-month' && (
                <>
                  <select
                    value={activityYear}
                    onChange={(e) => setActivityYear(e.target.value)}
                    className="border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>

                  <select
                    value={activityMonth}
                    onChange={(e) => setActivityMonth(e.target.value)}
                    className="border border-red-200 dark:border-red-900 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Activas evaluadas</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none mt-0.5">
                {activityLoading ? '...' : activityData.length}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sin depósitos</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400 leading-none mt-0.5">
                {activityLoading ? '...' : sinDepositos.length}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Con depósitos</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                {activityLoading ? '...' : Math.max(activityData.length - sinDepositos.length, 0)}
              </p>
            </div>
            <div className="rounded-lg bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/40 px-3 py-2.5">
              <p className="text-xs text-gray-500 dark:text-gray-400">Menos de 10</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                {activityLoading ? '...' : menosDe10Depositos.length}
              </p>
            </div>
          </div>

          {activityError && (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300">{activityError}</p>
          )}

          {!activityLoading && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
              <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 px-2 pt-2">
                <button
                  onClick={() => setActivityPanel('sin')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                    activityPanel === 'sin'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-b-0 border-red-200 dark:border-red-900/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Sin confirmaciones
                </button>
                <button
                  onClick={() => setActivityPanel('menos')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                    activityPanel === 'menos'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-b-0 border-amber-200 dark:border-amber-900/50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Menos de 10
                </button>
              </div>

              <div className="p-3">
                {activityPanel === 'sin' ? (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
                    <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
                      Sucursales sin confirmaciones en el mes
                    </p>
                    {sinDepositos.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {sinDepositos.map((sucursal) => (
                          <span
                            key={sucursal.id}
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/50 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:text-red-200"
                            title={`Sin depósitos en ${resolvedActivityPeriod}`}
                          >
                            <Calendar size={10} />
                            {sucursal.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-700/80 dark:text-red-200/80">
                        No hay sucursales sin confirmaciones en este período.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-3">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
                      Sucursales con menos de 10 depósitos
                    </p>
                    {menosDe10Depositos.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {menosDe10Depositos.map((sucursal) => (
                          <div
                            key={sucursal.id}
                            className="flex items-center justify-between gap-3 rounded-md bg-white/80 dark:bg-gray-900/50 px-2.5 py-1.5 text-xs"
                            title={`Total de depósitos en ${resolvedActivityPeriod}`}
                          >
                            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {sucursal.nombre}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                              {sucursal.total_depositos} deps
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
                        Todas las sucursales superan los 10 depósitos en este período.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}

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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSucursales.map((sucursal) => {
            const counts = personalCounts[sucursal.id] || { total: 0, active: 0 };

            return (
              <motion.div
                key={sucursal.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3.5 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-blue-500/10 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between mb-2.5 gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Building2 size={15} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-[13px] leading-tight">
                          {sucursal.nombre}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleOpenFormModal(sucursal)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <Edit size={11} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      {currentUser?.user_rol === 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleSucursalStatus(sucursal)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                              sucursal.estado === 'activa'
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                            }`}
                            title={sucursal.estado === 'activa' ? 'Desactivar sucursal' : 'Activar sucursal'}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                                sucursal.estado === 'activa' ? 'translate-x-3' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => setSucursalToDelete(sucursal)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                            title="Eliminar sucursal"
                          >
                            <Trash2 size={11} className="text-red-500 dark:text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                          <Users size={9} />
                          <span>Personal</span>
                        </div>
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-none">
                          {counts.active} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/ {counts.total}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                          <BarChart3 size={9} />
                          <span>Depósitos del mes</span>
                        </div>
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-none">
                          {activityLoading ? '...' : (depositsBySucursal[String(sucursal.id)] ?? 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSucursal(sucursal)}
                  className="mt-2.5 w-full text-center"
                >
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:underline flex items-center justify-center cursor-pointer">
                    Ver Detalles del Personal
                    <ChevronRight size={11} className="ml-1 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>

                <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
                  Estado: {sucursal.estado === 'activa' ? 'Activa' : 'Inactiva'}
                </div>
              </motion.div>
            );
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
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportWorkers}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default SucursalesView;
