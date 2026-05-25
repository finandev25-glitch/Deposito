import React, { useState, useRef, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { AuthContext } from '../contexts/AuthContext.jsx';
import { 
  Plus, Search, Edit, Trash2, TrendingUp, AlertTriangle, Upload
} from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import CreateCuentaModal from './CreateCuentaModal';
import EmpresaModal from './EmpresaModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const BancosView = ({ bancos, empresas, onAddEmpresa, cuentas, onAddCuenta, onUpdateCuenta, onDeleteCuenta, onBatchAddCuentas }) => {
  const { currentUser } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateEmpresaModalOpen, setIsCreateEmpresaModalOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState(null);
  const [deletingCuenta, setDeletingCuenta] = useState(null);
  const fileInputRef = useRef(null);

  const handleToggleStatus = (cuenta) => {
    const newStatus = cuenta.estado === 'activo' ? 'inactivo' : 'activo';
    onUpdateCuenta(cuenta.id, { estado: newStatus });
  };

  const handleSaveCuenta = (cuentaData) => {
    if (editingCuenta) {
      onUpdateCuenta(editingCuenta.id, cuentaData);
    } else {
      onAddCuenta(cuentaData);
    }
    handleCloseModal();
  };

  const handleOpenModal = (cuenta = null) => {
    setEditingCuenta(cuenta);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCuenta(null);
  };

  const handleDeleteClick = (cuenta) => {
    setDeletingCuenta(cuenta);
  };

  const handleConfirmDelete = () => {
    if (deletingCuenta) {
      onDeleteCuenta(deletingCuenta.id);
      setDeletingCuenta(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: ["empresa", "banco", "anexo", "nro_cuenta", "subdiario"],
          range: 1
        });

        let skippedCount = 0;
        const newCuentasToInsert = [];

        for (const row of json) {
          const empresaNombre = String(row.empresa || '').trim();
          const bancoAbreviatura = String(row.banco || '').trim().toUpperCase();
          const nroCuenta = String(row.nro_cuenta || '').trim();

          if (!empresaNombre || !bancoAbreviatura || !nroCuenta) {
            skippedCount++;
            continue;
          }

          const empresa = empresas.find(e => e.nombre === empresaNombre);
          const banco = bancos.find(b => b.abreviatura === bancoAbreviatura);

          if (empresa && banco) {
            newCuentasToInsert.push({
              empresa_id: empresa.id,
              banco_id: banco.id,
              anexo: String(row.anexo || '').trim(),
              nro_cuenta: nroCuenta,
              subdiario: String(row.subdiario || '').trim(),
              estado: 'activo',
            });
          } else {
            skippedCount++;
          }
        }

        if (newCuentasToInsert.length > 0) {
          const response = await fetch('/api/cuentas-bancarias/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: newCuentasToInsert }),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || 'No se pudo importar las cuentas');
          }

          const { data: insertedData } = await response.json();
          onBatchAddCuentas(insertedData || []);
          
          let alertMessage = `${newCuentasToInsert.length} cuentas han sido importadas correctamente.`;
          if (skippedCount > 0) {
            alertMessage += `\nSe omitieron ${skippedCount} filas por datos incompletos o porque la empresa/banco no existe.`;
          }
          alert(alertMessage);
        } else {
          alert('No se encontraron cuentas válidas para importar. Verifique el formato, que los datos estén completos y que las empresas y abreviaturas de bancos existan.');
        }
      } catch (error) {
        console.error("Error al importar el archivo Excel:", error);
        alert(`Ocurrió un error al procesar el archivo: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  const filteredCuentas = cuentas.filter(cuenta => {
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch = (cuenta.banco?.abreviatura.toLowerCase().includes(searchTermLower)) ||
      (cuenta.nro_cuenta && cuenta.nro_cuenta.toLowerCase().includes(searchTermLower)) ||
      (cuenta.anexo && cuenta.anexo.toLowerCase().includes(searchTermLower));
    
    const matchesEmpresa = filterEmpresa === 'all' || cuenta.empresa?.id === filterEmpresa;

    return matchesSearch && matchesEmpresa;
  });

  const activeEmpresas = empresas.filter(e => e.estado === 'activo');

  return (
    <>
      <div className="h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cuentas Bancarias</h2>
            <p className="text-gray-600 dark:text-gray-400">Gestiona las cuentas bancarias del grupo empresarial.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleImportClick} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
              <Upload size={14} />
              <span>Importar Excel</span>
            </button>
            <button onClick={() => handleOpenModal()} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={14} />
              <span>Nueva Cuenta</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-grow w-full md:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por banco, cuenta, anexo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            />
          </div>
          <div className="w-full md:w-auto flex items-center gap-2">
            <select
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 flex-grow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
            >
              <option value="all">Todas las Empresas</option>
              {activeEmpresas.map(empresa => (
                <option key={empresa.id} value={empresa.id}>{empresa.nombre}</option>
              ))}
            </select>
            <button onClick={() => setIsCreateEmpresaModalOpen(true)} className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" title="Crear Nueva Empresa">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Banco</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Anexo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nro de Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subdiario</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Depósitos Hoy</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Validaciones</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Errores</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCuentas.map((cuenta) => (
                  <motion.tr key={cuenta.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-semibold">{cuenta.empresa?.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-mono">{cuenta.banco?.abreviatura}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{cuenta.anexo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 font-mono">{cuenta.nro_cuenta}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{cuenta.subdiario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900 dark:text-gray-100">{cuenta.depositos_hoy || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center justify-center space-x-1"><TrendingUp size={10} /><span>{cuenta.validaciones || 0}</span></div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-center text-sm font-semibold ${cuenta.errores > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className="flex items-center justify-center space-x-1">{cuenta.errores > 0 && <AlertTriangle size={10} />}<span>{cuenta.errores || 0}</span></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><ToggleSwitch checked={cuenta.estado === 'activo'} onChange={() => handleToggleStatus(cuenta)} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleOpenModal(cuenta)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><Edit size={12} className="text-gray-600 dark:text-gray-300" /></button>
                        <button onClick={() => handleDeleteClick(cuenta)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"><Trash2 size={12} className="text-rose-600 dark:text-rose-400" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
      <AnimatePresence>
        {isCreateModalOpen && <CreateCuentaModal onClose={handleCloseModal} onSave={handleSaveCuenta} empresas={empresas} bancos={bancos} cuentaToEdit={editingCuenta} />}
        {isCreateEmpresaModalOpen && <EmpresaModal onClose={() => setIsCreateEmpresaModalOpen(false)} onSave={onAddEmpresa} />}
        {deletingCuenta && <DeleteConfirmationModal onClose={() => setDeletingCuenta(null)} onConfirm={handleConfirmDelete} title="Eliminar Cuenta" message={`¿Seguro que quieres eliminar la cuenta ${deletingCuenta.nro_cuenta}?`} />}
      </AnimatePresence>
    </>
  );
};

export default BancosView;

